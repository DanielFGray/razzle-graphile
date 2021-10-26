import express, { static as staticFiles } from 'express'
import morgan from 'morgan'
import { helmet, addSameOrigin, csrf } from './security'
import { errorRequestHandler } from '@/lib'
import { installSessionMiddleware } from './sessions'
import { installPassport } from './passport'
import { installPostgraphileMiddleware } from './postgraphile'
import { SSR } from './render'
import { installWorker } from './worker'
import { Locals } from '@/types'

const isDev = process.env.NODE_ENV === 'development'
const publicDir = process.env.RAZZLE_PUBLIC_DIR

const app = express()
app.locals = { websocketMiddlewares: [], shutdownHooks: [] }
app.set('subscriptions', true)
app.set('trust proxy', 1)
app.use(morgan(isDev ? 'dev' : 'combined'))
if (! isDev) { app.use(helmet) } // FIXME disabled because CSP issues
app.use(staticFiles(publicDir))
app.use(addSameOrigin)
app.use(errorRequestHandler)
installSessionMiddleware(app)
if (! isDev) { app.use(csrf) }
installPassport(app)
installPostgraphileMiddleware(app)
installWorker(app)
app.get('/*', SSR)

app.on('shutdown', () => {
  console.log('attempting graceful shutdown')
  ;(app.locals as Locals).shutdownHooks.forEach(hook => hook())
})

export default app
