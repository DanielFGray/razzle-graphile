import path from 'path'
import type { Middleware, PostGraphileOptions } from 'postgraphile'
import { makePluginHook, postgraphile } from 'postgraphile'
import PgPubsub from '@graphile/pg-pubsub'
import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector'
import { makePgSmartTagsFromFilePlugin } from 'postgraphile/plugins'
import { NodePlugin, Plugin } from 'graphile-build'
import { Express } from 'express'
import { PassportLoginPlugin } from './passport'
import SubscriptionsPlugin from './graphile-subscriptions'
import { rootPgPool, authPgPool } from './dbPools'
import { handleErrors } from '@/lib'
import { RemoveForeignKeyFieldsPlugin } from 'postgraphile-remove-foreign-key-fields-plugin'
import ConnectionFilterPlugin from 'postgraphile-plugin-connection-filter'
import FulltextFilterPlugin from '@pyramation/postgraphile-plugin-fulltext-filter'
import { OurGraphQLContext } from '@/types'

const isDev = process.env.NODE_ENV !== 'production'
console.log({ isDev })
type postgraphile = ReturnType<typeof postgraphile>
type PgConstraint = any
type UUID = string

const PrimaryKeyMutationsOnlyPlugin: Plugin = builder => {
  builder.hook(
    'build',
    build => {
      build.pgIntrospectionResultsByKind.constraint.forEach((constraint: PgConstraint) => {
        if (! constraint.tags.omit && constraint.type !== 'p') {
          constraint.tags.omit = ['update', 'delete']
        }
      })
      return build
    },
    [],
    [],
    ['PgIntrospection'],
  )
}

function uuidOrNull(input: string | number | null | undefined): UUID | null {
  if (! input) return null
  const str = String(input)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
    ? str
    : null
}

const RemoveQueryQueryPlugin: Plugin = builder => {
  builder.hook('GraphQLObjectType:fields', (fields, _build, context) => {
    if (context.scope.isRootQuery) {
      const { query: _query, ...rest } = fields
      /* Drop the `query` field */
      return rest
    }
    return fields
  })
}

// We're using JSONC for VSCode compatibility; also using an explicit file
/* path keeps the tests happy. */
const TagsFilePlugin = makePgSmartTagsFromFilePlugin(path.resolve('./src/postgraphile.tags.jsonc'))

let middleware: postgraphile
export function getPostgraphileMiddleware(): postgraphile {
  if (middleware) return middleware
  throw new Error('middleware not defined yet!')
}

export function installPostgraphileMiddleware(app: Express): void {
  if (app.get('subscriptions')) console.log('enabling pg pubsub')
  middleware = postgraphile(
    authPgPool,
    ['app_public'],
    getOptions({ subscriptions: app.locals.websocketMiddlewares }),
  )
  app.use(middleware)
  app.locals.shutdownHooks.push(async () => {
    console.log('stopping postgraphile')
    await middleware.release()
  })
}

export function getOptions({
  subscriptions,
}: {
  subscriptions?: Array<Middleware>
}): PostGraphileOptions {
  return {
    /* This is for PostGraphile server plugins: https://www.graphile.org/postgraphile/plugins/ */
    /* Add the pub/sub realtime provider */
    pluginHook: subscriptions ? makePluginHook([PgPubsub]) : undefined,
    /* This is so that PostGraphile installs the watch fixtures, it's also needed to enable live queries */
    ownerConnectionString: process.env.ROOT_DATABASE_URL,

    /* On production we still want to start even if the database isn't available.
     * On development, we want to deal nicely with issues in the database.
     * For these reasons, we're going to keep retryOnInitFail enabled for both environments.
     */
    retryOnInitFail: true,

    /* Add websocket support to the PostGraphile server; you still need to use a subscriptions plugin such as @graphile/pg-pubsub */
    subscriptions: Boolean(subscriptions),
    websocketMiddlewares: subscriptions,
    /* enableQueryBatching: On the client side, use something like apollo-link-batch-http to make use of this */
    enableQueryBatching: true,

    /* dynamicJson: instead of inputting/outputting JSON as strings, input/output raw JSON objects */
    dynamicJson: true,

    /* ignoreRBAC=false: honour the permissions in your DB - don't expose what you don't GRANT */
    ignoreRBAC: false,

    /* ignoreIndexes=false: honour your DB indexes - only expose things that are fast */
    ignoreIndexes: false,

    /* setofFunctionsContainNulls=false: reduces the number of nulls in your schema */
    setofFunctionsContainNulls: false,

    /* Enable GraphiQL in development */
    graphiql: isDev || Boolean(process.env.ENABLE_GRAPHIQL),
    /* Use a fancier GraphiQL with `prettier` for formatting, and header editing. */
    enhanceGraphiql: true,
    /* Allow EXPLAIN in development (you can replace this with a callback function
     * if you want more control)
     */
    allowExplain: isDev,

    /* Disable query logging - we're using morgan */
    disableQueryLog: true,

    /* Custom error handling */
    handleErrors,
    /*
     * To use the built in PostGraphile error handling, you can use the
     * following code instead of `handleErrors` above. Using `handleErrors`
     * gives you much more control (and stability) over how errors are
     * output to the user.
     * See https://www.graphile.org/postgraphile/debugging/

     extendedErrors:
     isDev || isTest
       ? [
       'errcode',
       'severity',
       'detail',
       'hint',
       'positon',
       'internalPosition',
       'internalQuery',
       'where',
       'schema',
       'table',
       'column',
       'dataType',
       'constraint',
       ]
         : ['errcode'],
    showErrorStack: isDev,
     */

    /* Automatically update GraphQL schema when database changes */
    watchPg: isDev,

    /* Keep data/schema.graphql up to date */
    sortExport: true,
    exportGqlSchemaPath: isDev ? './src/generated/schema.gql' : undefined,

    /*
     * Plugins to enhance the GraphQL schema, see:
     *   https://www.graphile.org/postgraphile/extending/
     */
    appendPlugins: [
      /* PostGraphile adds a `query: Query` field to `Query` for Relay 1
       * compatibility. We don't need that.
       */
      RemoveQueryQueryPlugin,
      /* Omits non-primary-key constraint mutations */
      PrimaryKeyMutationsOnlyPlugin,
      /* Omits foreign key ids */
      RemoveForeignKeyFieldsPlugin,

      /* Adds support for our `postgraphile.tags.json5` file */
      TagsFilePlugin,
      /* Simplifies the field names generated by PostGraphile. */
      PgSimplifyInflectorPlugin,

      /* Adds the `login` mutation to enable users to log in */
      PassportLoginPlugin,
      /* Adds realtime features to our GraphQL schema */
      SubscriptionsPlugin,
      ConnectionFilterPlugin,
      FulltextFilterPlugin,
    ],

    /*
     * Plugins we don't want in our schema
     */
    skipPlugins: [
      /* Disable the 'Node' interface */
      NodePlugin,
    ],

    graphileBuildOptions: {
      /*
       * Any properties here are merged into the settings passed to each Graphile
       * Engine plugin - useful for configuring how the plugins operate.
       */
      /* Makes all SQL function arguments except those with defaults non-nullable */
      pgStrictFunctions: true,
      /* pick which filters are used for ConnectionFilterPlugin */
      /* rename some filter names */
      connectionFilterOperatorNames: {
        equalTo: 'is',
        notEqualTo: 'not',
      },
    },

    /*
     * Postgres transaction settings for each GraphQL query/mutation to
     * indicate to Postgres who is attempting to access the resources. These
     * will be referenced by RLS policies/triggers/etc.
     *
     * Settings set here will be set using the equivalent of `SET LOCAL`, so
     * certain things are not allowed. You can override Postgres settings such
     * as 'role' and 'search_path' here; but for settings indicating the
     * current user, session id, or other privileges to be used by RLS policies
     * the setting names must contain at least one and at most two period
     * symbols (`.`), and the first segment must not clash with any Postgres or
     * extension settings. We find `jwt.claims.*` to be a safe namespace,
     * whether or not you're using JWTs.
     */
    async pgSettings(req) {
      const sessionId = uuidOrNull(req.user?.session_id)
      if (sessionId) {
        /* Update the last_active timestamp (but only do it at most once every 15 seconds to avoid too much churn). */
        await rootPgPool.query(
          "UPDATE app_private.sessions SET last_active = NOW() WHERE uuid = $1 AND last_active < NOW() - INTERVAL '15 seconds'",
          [sessionId],
        )
      }
      return {
        /* Everyone uses the "visitor" role currently */
        role: process.env.DATABASE_VISITOR,

        /*
         * Note, though this says "jwt" it's not actually anything to do with
         * JWTs, we just know it's a safe namespace to use, and it means you
         * can use JWTs too, if you like, and they'll use the same settings
         * names reducing the amount of code you need to write.
         */
        'jwt.claims.session_id': sessionId,
      }
    },

    /*
     * These properties are merged into context (the third argument to GraphQL
     * resolvers). This is useful if you write your own plugins that need
     * access to, e.g., the logged in user.
     */
    additionalGraphQLContextFromRequest: async (req): Promise<Partial<OurGraphQLContext>> => ({
      /* The current session id */
      sessionId: uuidOrNull(req.user?.session_id),

      /* Use this to tell Passport.js we're logged in */
      async login(user: any) {
        return new Promise((resolve, reject) => {
          req.login(user, err => (err ? reject(err) : resolve()))
        })
      },

      async logout() {
        req.logout()
      },
    }),
  }
}
