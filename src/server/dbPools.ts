import { Pool } from 'pg'

const { DATABASE_OWNER, DATABASE_OWNER_PASSWORD, DATABASE_HOST, DATABASE_NAME } = process.env

export const rootPgPool = new Pool({
  connectionString: `postgres://${DATABASE_OWNER}:${DATABASE_OWNER_PASSWORD}@${DATABASE_HOST}/${DATABASE_NAME}`,
})

export const authPgPool = new Pool({
  connectionString: process.env.AUTH_DATABASE_URL,
})
