import { gql, makeExtendSchemaPlugin } from 'graphile-utils'
import type { Express, Request, RequestHandler } from 'express'
import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
// import { Strategy as TwitterStrategy } from 'passport-twitter'
// import { Strategy as RedditStrategy } from 'passport-reddit'
import { ERROR_MESSAGE_OVERRIDES } from '../handleErrors'

import { rootPgPool } from './dbPools'

interface DbSession {
  uuid: string
  user_id: string
  created_at: Date
  last_active: Date
}

export interface UserSpec {
  id: string
  displayName: string
  username: string
  avatarUrl?: string
  email: string
  profile?: any
  auth?: any
}

export type GetUserInformationFunction = (info: {
  profile: any
  accessToken: string
  refreshToken: string
  extra: any
  req: Request
}) => UserSpec

/*
 * Add returnTo property using [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html).
 */

/*
 * Stores where to redirect the user to on authentication success.
 * Tries to avoid redirect loops or malicious redirects.
 */
const setReturnTo: RequestHandler = (req, _res, next) => {
  const BLOCKED_REDIRECT_PATHS = /^\/+(|auth.*|logout)(\?.*)?$/
  if (! req.session) {
    next()
    return
  }
  const returnTo = (req.query?.next && String(req.query.next)) || req.session.returnTo
  if (returnTo && returnTo[0] === '/' && ! BLOCKED_REDIRECT_PATHS.exec(returnTo)) {
    req.session.returnTo = returnTo
  } else {
    delete req.session.returnTo
  }
  next()
}

const noop = (_: any): void => {}

export function installPassportStrategy({
  app,
  service,
  strategy: Strategy,
  strategyConfig,
  authenticateConfig = {},
  getUserInformation,
  tokenNames = ['accessToken', 'refreshToken'],
  hooks: { preRequest, postRequest } = { preRequest: noop, postRequest: noop },
}: {
  app: Express
  service: string
  strategy: new (...args: any) => passport.Strategy
  strategyConfig: any
  authenticateConfig?: any
  getUserInformation: (info: {
    profile: any
    accessToken: string
    refreshToken: string
    extra: any
    req: Request
  }) => UserSpec
  tokenNames: string[]
  hooks?: {
    preRequest?: undefined | ((req: Express.Request) => void)
    postRequest?: undefined | ((req: Express.Request) => void)
  }
}): void {
  passport.use(
    new Strategy(
      {
        ...strategyConfig,
        callbackURL: `${process.env.RAZZLE_ROOT_URL}/auth/${service}/callback`,
        passReqToCallback: true,
      },
      async (
        req: Request,
        accessToken: string,
        refreshToken: string,
        extra: any,
        profile: any,
        done: (error: any, user?: any) => void,
      ) => {
        try {
          const userInformation = getUserInformation({
            profile,
            accessToken,
            refreshToken,
            extra,
            req,
          })
          if (! userInformation?.id) {
            throw new Error(`getUserInformation must return a unique id for each user`)
          }
          let session: DbSession | null = null
          if (req?.user?.session_id) {
            ({
              rows: [session],
            } = await rootPgPool.query<DbSession>(
              'select * from app_private.sessions where uuid = $1',
              [req.user.session_id],
            ))
          }
          const {
            rows: [user],
          } = await rootPgPool.query(
            `select * from app_private.link_or_register_user($1, $2, $3, $4, $5)`,
            [
              session ? session.user_id : null,
              service,
              userInformation.id,
              JSON.stringify({
                username: userInformation.username,
                avatar_url: userInformation.avatarUrl,
                email: userInformation.email,
                name: userInformation.displayName,
                ...userInformation.profile,
              }),
              JSON.stringify({
                [tokenNames[0]]: accessToken,
                [tokenNames[1]]: refreshToken,
                ...userInformation.auth,
              }),
            ],
          )
          if (! user?.id) {
            const e = new Error('Registration failed')
            e['code'] = 'FFFFF'
            throw e
          }
          if (! session) {
            ({
              rows: [session],
            } = await rootPgPool.query<DbSession>(
              `insert into app_private.sessions (user_id) values ($1) returning *`,
              [user.id],
            ))
          }
          if (! session) {
            const e = new Error('Failed to create session')
            e['code'] = 'FFFFF'
            throw e
          }
          done(null, { session_id: session.uuid })
        } catch (e) {
          done(e)
        }
      },
    ),
  )

  app.get(`/auth/${service}`, setReturnTo, (req, res, next) => {
    try {
      preRequest(req)
    } catch (e) {
      next(e)
      return
    }
    passport.authenticate(
      service,
      typeof authenticateConfig === 'function' ? authenticateConfig(req) : authenticateConfig,
    )(req, res, next)
  })

  const step2Middleware = passport.authenticate(service, {
    failureRedirect: '/login',
    successReturnToOrRedirect: '/',
  })

  app.get(`/auth/${service}/callback`, (req, res, next) => {
    try {
      postRequest(req)
    } catch (e) {
      next(e)
      return
    }
    step2Middleware(req, res, next)
  })
}

interface DbSession {
  session_id: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      session_id: string
    }
  }
}

export function installPassport(app: Express): void {
  passport.serializeUser((sessionObject: DbSession, done) => {
    done(null, sessionObject.session_id)
  })
  passport.deserializeUser((session_id: string, done) => {
    done(null, { session_id })
  })
  ;[passport.initialize(), passport.session()].forEach(m => {
    app.use(m)
    app.locals.websocketMiddlewares.push(m)
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  if (process.env.GITHUB_KEY && process.env.GITHUB_SECRET) {
    installPassportStrategy({
      app,
      service: 'github',
      strategy: GitHubStrategy,
      strategyConfig: {
        clientID: process.env.GITHUB_KEY,
        clientSecret: process.env.GITHUB_SECRET,
        scope: ['user:email'],
      },
      authenticateConfig: {},
      getUserInformation: ({ profile }) => ({
        id: profile.id,
        displayName: profile?.displayName ?? profile.username,
        username: profile.username,
        avatarUrl: profile?.photos?.[0]?.value,
        email: profile.email || profile?.emails?.[0]?.value,
      }),
      tokenNames: ['token', 'tokenSecret'],
    })
  }

  // if (process.env.TWITTER_KEY && process.env.TWITTER_SECRET) {
  //   installPassportStrategy({
  //     app,
  //     service: 'twitter',
  //     strategy: TwitterStrategy,
  //     strategyConfig: {
  //       clientID: process.env.TWITTER_KEY,
  //       clientSecret: process.env.TWITTER_SECRET,
  //       scope: ['user:email'],
  //     },
  //     authenticateConfig: {},
  //     getUserInformation: ({ profile }) => ({
  //       id: profile.id,
  //       displayName: profile?.displayName ?? profile.username,
  //       username: profile.username,
  //       avatarUrl: profile?.photos?.[0]?.value,
  //       email: profile.email || profile?.emails?.[0]?.value,
  //     }),
  //     tokenNames: ['token', 'tokenSecret'],
  //   })
  // }

  // if (process.env.REDDIT_KEY && process.env.REDDIT_SECRET) {
  //   installPassportStrategy({
  //     app,
  //     service: 'reddit',
  //     strategy: RedditStrategy,
  //     strategyConfig: {
  //       clientID: process.env.REDDIT_KEY,
  //       clientSecret: process.env.REDDIT_SECRET,
  //       scope: ['user:email'],
  //     },
  //     authenticateConfig: {},
  //     getUserInformation: ({ profile }) => ({
  //       id: profile.id,
  //       displayName: profile?.displayName ?? profile.username,
  //       username: profile.username,
  //       avatarUrl: profile?.photos?.[0]?.value,
  //       email: profile.email || profile?.emails?.[0]?.value,
  //     }),
  //     tokenNames: ['token', 'tokenSecret'],
  //   })
  // }
}

export const PassportLoginPlugin = makeExtendSchemaPlugin(build => ({
  typeDefs: gql`
    input RegisterInput {
      username: String!
      email: String!
      password: String!
      name: String
      avatarUrl: String
    }

    type RegisterPayload {
      user: User! @pgField
    }

    input LoginInput {
      username: String!
      password: String!
    }

    type LoginPayload {
      user: User! @pgField
    }

    type LogoutPayload {
      success: Boolean
    }

    """
    All input for the \`resetPassword\` mutation.
    """
    input ResetPasswordInput {
      """
      An arbitrary string value with no semantic meaning. Will be included in the
      payload verbatim. May be used to track mutations by the client.
      """
      clientMutationId: String

      userId: UUID!
      resetToken: String!
      newPassword: String!
    }

    """
    The output of our \`resetPassword\` mutation.
    """
    type ResetPasswordPayload {
      """
      The exact same \`clientMutationId\` that was provided in the mutation input,
      unchanged and unused. May be used by a client to track mutations.
      """
      clientMutationId: String

      """
      Our root query field type. Allows us to run any query from our mutation payload.
      """
      query: Query

      success: Boolean
    }

    extend type Mutation {
      """
      Use this mutation to create an account on our system. This may only be used if you are logged out.
      """
      register(input: RegisterInput!): RegisterPayload

      """
      Use this mutation to log in to your account; this login uses sessions so you do not need to take further action.
      """
      login(input: LoginInput!): LoginPayload

      """
      Use this mutation to logout from your account. Don't forget to clear the client state!
      """
      logout: LogoutPayload

      """
      After triggering forgotPassword, you'll be sent a reset token. Combine this with your user ID and a new password to reset your password.
      """
      resetPassword(input: ResetPasswordInput!): ResetPasswordPayload
    }
  `,
  resolvers: {
    Mutation: {
      async register(_mutation, args, context: OurGraphQLContext, resolveInfo) {
        const { selectGraphQLResultFromTable } = resolveInfo.graphile
        const { username, password, email, name, avatarUrl } = args.input
        const { login, pgClient } = context
        try {
          // Call our login function to find out if the username/password combination exists
          const {
            rows: [details],
          } = await rootPgPool.query(
            `with new_user as (
              select users.* from app_private.really_create_user(
                username => $1,
                email => $2,
                email_is_verified => false,
                name => $3,
                avatar_url => $4,
                password => $5
              ) users where not (users is null)
            ), new_session as (
              insert into app_private.sessions (user_id)
              select id from new_user
              returning *
            )
            select new_user.id as user_id, new_session.uuid as session_id
            from new_user, new_session`,
            [username, email, name, avatarUrl, password],
          )

          if (! details || ! details.user_id) {
            const e = new Error('Registration failed')
            e['code'] = 'FFFFF'
            throw e
          }

          if (details.session_id) {
            // Store into transaction
            await pgClient.query(`select set_config('jwt.claims.session_id', $1, true)`, [
              details.session_id,
            ])

            // Tell Passport.js we're logged in
            await login({ session_id: details.session_id })
          }

          // Fetch the data that was requested from GraphQL, and return it
          const sql = build.pgSql
          const [row] = await selectGraphQLResultFromTable(
            sql.fragment`app_public.users`,
            (tableAlias, sqlBuilder) => {
              sqlBuilder.where(sql.fragment`${tableAlias}.id = ${sql.value(details.user_id)}`)
            },
          )
          return {
            data: row,
          }
        } catch (e) {
          const { code } = e
          const safeErrorCodes = [
            'WEAKP',
            'LOCKD',
            'EMTKN',
            ...Object.keys(ERROR_MESSAGE_OVERRIDES),
          ]
          if (safeErrorCodes.includes(code)) {
            throw e
          } else {
            console.error(
              'Unrecognised error in PassportLoginPlugin; replacing with sanitized version',
            )
            console.error(e)
            const error = new Error('Registration failed')
            error['code'] = code
            throw error
          }
        }
      },
      async login(_mutation, args, context: OurGraphQLContext, resolveInfo) {
        const { selectGraphQLResultFromTable } = resolveInfo.graphile
        const { username, password } = args.input
        const { login, pgClient } = context
        try {
          // Call our login function to find out if the username/password combination exists
          const {
            rows: [session],
          } = await rootPgPool.query(
            `select sessions.* from app_private.login($1, $2) sessions where not (sessions is null)`,
            [username, password],
          )

          if (! session) {
            const error = new Error('Incorrect username/password')
            error['code'] = 'CREDS'
            throw error
          }

          if (session.uuid) {
            // Tell Passport.js we're logged in
            await login({ session_id: session.uuid })
          }

          // Get session_id from PG
          await pgClient.query(`select set_config('jwt.claims.session_id', $1, true)`, [
            session.uuid,
          ])

          // Fetch the data that was requested from GraphQL, and return it
          const sql = build.pgSql
          const [row] = await selectGraphQLResultFromTable(
            sql.fragment`app_public.users`,
            (tableAlias, sqlBuilder) => {
              sqlBuilder.where(sql.fragment`${tableAlias}.id = app_public.current_user_id()`)
            },
          )
          return {
            data: row,
          }
        } catch (e) {
          const { code } = e
          const safeErrorCodes = ['LOCKD', 'CREDS']
          if (safeErrorCodes.includes(code)) {
            throw e
          } else {
            console.error(e)
            const error = new Error('Login failed')
            error['code'] = e.code
            throw error
          }
        }
      },

      async logout(_mutation, _args, context: OurGraphQLContext, _resolveInfo) {
        const { pgClient, logout } = context
        await pgClient.query('select app_public.logout();')
        await logout()
        return {
          success: true,
        }
      },

      async resetPassword(_mutation, args, context: OurGraphQLContext, _resolveInfo) {
        const { userId, resetToken, newPassword, clientMutationId } = args.input

        // Since the `reset_password` function needs to keep track of attempts
        // for security, we cannot risk the transaction being rolled back by a
        // later error. As such, we don't allow users to call this function
        // through normal means, instead calling it through our root pool
        // without a transaction.
        const {
          rows: [row],
        } = await rootPgPool.query(`select app_private.reset_password($1, $2, $3) as success`, [
          userId,
          resetToken,
          newPassword,
        ])

        return {
          clientMutationId,
          success: row?.success,
        }
      },
    },
  },
}))
