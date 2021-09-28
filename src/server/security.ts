import csurf from 'csurf'
import _helmet from 'helmet'
import type { RequestHandler } from 'express'

const ROOT_URL = process.env.RAZZLE_ROOT_URL

if (! ROOT_URL || typeof ROOT_URL !== 'string') {
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

const csrfProtection = csurf({
  // Store to the session rather than a Cookie
  cookie: false,

  // Extract the CSRF Token from the `CSRF-Token` header.
  value(req) {
    const csrfToken = req.get('csrf-token')
    return typeof csrfToken === 'string' ? csrfToken : ''
  },
})

export const csrf: RequestHandler = (req, res, next) => {
  if (
    req.method === 'POST' &&
    req.path === '/graphql' &&
    req.headers.referer === `${ROOT_URL}/graphiql`
  ) {
    // Bypass CSRF for GraphiQL
    return next()
  }
  csrfProtection(req, res, next)
}

export const addSameOrigin: RequestHandler = (req, _res, next) => {
  req.isSameOrigin = ! req.get('origin') || req.get('origin') === ROOT_URL
  next()
}

declare module 'express-serve-static-core' {
  interface Request {
    /**
     * True if either the request 'Origin' header matches our CLIENT_PUBLIC_PATH, or if
     * there was no 'Origin' header (in which case we must give the benefit of
     * the doubt; for example for normal resource GETs).
     */
    isSameOrigin?: boolean
  }
}
