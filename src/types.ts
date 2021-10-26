/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PoolClient } from 'pg'
import type { RequestHandler } from 'express'

export interface OurGraphQLContext {
  pgClient: PoolClient
  sessionId: string | null
  login(user: any): Promise<void>
  logout(): Promise<void>
}

export interface Locals {
  websocketMiddlewares: Array<RequestHandler>
  shutdownHooks: Array<() => void | Promise<void>>
}

export interface DbSession {
  uuid: string
  user_id: string
  created_at: Date
  last_active: Date
  session_id: string
}

export interface UserSpec {
  id: string
  displayName: string
  username: string
  avatarUrl?: string
  email: string
  profile?: any
  auth?: any
}

export type GetUserInformationFunction = (info: {
  profile: any
  accessToken: string
  refreshToken: string
  extra: any
  req: Request
}) => UserSpec
