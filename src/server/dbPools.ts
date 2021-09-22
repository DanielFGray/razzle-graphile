import { Pool } from 'pg'

const { AUTH_DATABASE_URL, DATABASE_URL } = process.env

export const rootPgPool = new Pool({
  connectionString: DATABASE_URL,
})

export const authPgPool = new Pool({
  connectionString: AUTH_DATABASE_URL,
})
