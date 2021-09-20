import express, { static as staticFiles } from 'express'
import { SSR } from './render'
import { errorRequestHandler } from '../handleErrors'
import morgan from 'morgan'
import { helmet, addOrigin, csrf } from './security'
import { installPostgraphileMiddleware } from './postgraphile'
import { installPassport } from './passport'
import { installSessionMiddleware } from './sessions'

const isDev = process.env.NODE_ENV === 'development'
const publicDir = process.env.RAZZLE_PUBLIC_DIR

const server = express()
server.locals = { websocketMiddlewares: [] }
server.set('subscriptions', true)
server.enable('trust proxy')
server.disable('x-powered-by')
server.use(morgan(isDev ? 'dev' : 'combined'))
// server.use(helmet)
server.use(staticFiles(publicDir))
server.use(addOrigin)
server.use(errorRequestHandler)
installSessionMiddleware(server)
server.use(csrf)
installPassport(server)
installPostgraphileMiddleware(server)
server.get('/*', SSR)

export default server
