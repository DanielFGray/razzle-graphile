import 'dotenv/config'
import _csrf from 'csurf'
import _helmet from 'helmet'

const ROOT_URL = process.env.ROOT_URL

if (!ROOT_URL || typeof ROOT_URL !== 'string') {
  throw new Error('Envvar ROOT_URL is required.')
}

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

const CSP_DIRECTIVES = {
  ..._helmet.contentSecurityPolicy.getDefaultDirectives(),
  'connect-src': [
    "'self'",
    // Safari doesn't allow using wss:// origins as 'self' from
    // an https:// page, so we have to translate explicitly for
    // it.
    ROOT_URL.replace(/^http/, 'ws'),
  ],
}

export const helmet = _helmet(
  isDevOrTest
    ? {
        contentSecurityPolicy: {
          directives: {
            ...CSP_DIRECTIVES,
            // Dev needs 'unsafe-eval' due to
            // https://github.com/vercel/next.js/issues/14221
            'script-src': ["'self'", "'unsafe-eval'"],
          },
        },
      }
    : {
        contentSecurityPolicy: {
          directives: {
            ...CSP_DIRECTIVES,
          },
        },
      },
)

const csrfProtection = _csrf({
  // Store to the session rather than a Cookie
  cookie: false,

  // Extract the CSRF Token from the `CSRF-Token` header.
  value(req) {
    const csrfToken = req.headers['csrf-token']
    return typeof csrfToken === 'string' ? csrfToken : ''
  },
})

export const csrf: typeof csrfProtection = (req, res, next) => {next()}
// export const csrf: typeof csrfProtection = (req, res, next) => {
//   req.isSameOrigin = !req.headers.origin || req.headers.origin === ROOT_URL
//   if (
//     req.method === 'POST' &&
//     req.path === '/graphql' &&
//     (req.headers.referer === `${ROOT_URL}/graphiql` || req.headers.origin === ROOT_URL)
//   ) {
//     // Bypass CSRF for GraphiQL
//     next()
//   } else {
//     csrfProtection(req, res, next)
//   }
// }
