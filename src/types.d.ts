module '*.svg' {
  const src: string
  export default src
}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Express {
  interface User {
    session_id: string
  }
}
