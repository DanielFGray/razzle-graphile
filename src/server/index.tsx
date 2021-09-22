import express, { static as staticFiles } from 'express'
import morgan from 'morgan'
import { helmet, addOrigin, csrf } from './security'
import { errorRequestHandler } from '../handleErrors'
import { installSessionMiddleware } from './sessions'
import { installPassport } from './passport'
import { createPostgraphileMiddleware } from './postgraphile'
import { SSR } from './render'

const isDev = process.env.NODE_ENV === 'development'
const publicDir = process.env.RAZZLE_PUBLIC_DIR

const app = express()
app.locals = { websocketMiddlewares: [] }
app.set('subscriptions', true)
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(morgan(isDev ? 'dev' : 'combined'))
// app.use(helmet) // FIXME disabled because CSP issues
app.use(staticFiles(publicDir))
app.use(addOrigin)
app.use(errorRequestHandler)
installSessionMiddleware(app)
// app.use(csrf)
installPassport(app)
createPostgraphileMiddleware(app)
app.get('/*', SSR)

export default app
