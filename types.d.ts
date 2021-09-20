import type { PoolClient } from 'pg'

export type Maybe<T> = null | T

declare module '*.svg' {
  const src: string
  export default src
}

export interface OurGraphQLContext {
  pgClient: PoolClient
  sessionId: string | null
  login(user: any): Promise<void>
  logout(): Promise<void>
}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string
  }
}
