import express, { static as staticFiles } from 'express'
import { ssr } from './render'
import { errorRequestHandler } from '../handleErrors'
import { csrf, helmet } from './security'
import morgan from 'morgan'
import postgraphile from './postgraphile'
import { installPassport } from './passport'
import { installSessionMiddleware } from './sessions'
// import { makeWorkerUtils } from "graphile-worker";

const isDev = process.env.NODE_ENV === 'development'

const server = express()
server.locals = {
  websocketMiddlewares: [],
}
server
  .disable('x-powered-by')
  .use(morgan(isDev ? 'dev' : 'combined'))
  .use(helmet)
  .use(csrf)
  .use(staticFiles(process.env.RAZZLE_PUBLIC_DIR))
  .use(errorRequestHandler)
installPassport(server)
installSessionMiddleware(server)
server.use(postgraphile(server)).get('/*', ssr)

// makeWorkerUtils({ pgPool: getRootPgPool(server) });

console.log('index loaded')

export { render } from './render'

export default server
