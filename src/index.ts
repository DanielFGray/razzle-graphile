/* eslint-disable
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-var-requires,
  @typescript-eslint/no-unsafe-assignment,
*/
import http from 'http'
import type { Express } from 'express'

let app: Express = require('./server').default

if (module.hot) {
  module.hot.accept('./server', () => {
    console.log('🔁  HMR Reloading `./server`...')
    try {
      app.emit('shutdown')
      app = require('./server').default
    } catch (error) {
      console.error(error)
    }
  })
  console.info('✅  Server-side HMR Enabled!')
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000

export default http
  .createServer((req, res) => {
    app(req, res)
  })
  .listen(port, () => {
    console.log(`> App started http://localhost:${port}`)
  })
