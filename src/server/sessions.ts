import ConnectPgSimple from 'connect-pg-simple'
import { Express, RequestHandler } from 'express'
import session from 'express-session'
// import * as redis from "redis";
// import ConnectRedis from "connect-redis";

import { rootPgPool } from './dbPools'

// const RedisStore = ConnectRedis(session);
const PgStore = ConnectPgSimple(session)

const MILLISECOND = 1
const SECOND = 1000 * MILLISECOND
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const { RAZZLE_ROOT_URL, SECRET } = process.env
if (! SECRET) throw new Error('missing SECRET envrionment variable')

const MAXIMUM_SESSION_DURATION_IN_MILLISECONDS =
  parseInt(process.env.MAXIMUM_SESSION_DURATION_IN_MILLISECONDS || '', 10) || 3 * DAY

export function installSessionMiddleware(app: Express): void {
  /*
   * Using redis for session storage means the session can be shared across
   * multiple Node.js instances (and survives a server restart), see:
   *
   * https://medium.com/mtholla/managing-node-js-express-sessions-with-redis-94cd099d6f2f
   */

  /*
  const store = new RedisStore({
    client: redis.createClient({
      url: process.env.REDIS_URL,
    }),
  })
  */

  /*
   * Using PostgreSQL for session storage is easy to set up, but increases
   * the load on your database. We recommend that you graduate to using
   * redis for session storage when you're ready.
   *
   * Note even though "connect-pg-simple" lists "pg@7.x" as a dependency,
   * it doesn't `require("pg")` if we pass it a pool. It's usage of the pg
   * API is small; so it's compatible with pg@8.x.
   */

  const store = new PgStore({
    pool: rootPgPool,
    schemaName: 'app_private',
    tableName: 'connect_pg_simple_sessions',
  })

  const sessionMiddleware = session({
    name: 'nodeapp.sid',
    rolling: true,
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: MAXIMUM_SESSION_DURATION_IN_MILLISECONDS,
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
    },
    store,
    secret: SECRET,
  })

  /**
   * For security reasons we only enable sessions for requests within our own
   * website; external URLs that need to issue requests to us must use a different
   * authentication method such as bearer tokens.
   */
  const wrappedSessionMiddleware: RequestHandler = (req, res, next) => {
    if (req.isSameOrigin) {
      sessionMiddleware(req, res, next)
    } else {
      next()
    }
  }

  app.use(wrappedSessionMiddleware)
  app.locals.websocketMiddlewares.push(wrappedSessionMiddleware)
}
