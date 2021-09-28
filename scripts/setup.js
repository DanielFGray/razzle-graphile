const pg = require('pg')
const inquirer = require('inquirer')

const {
  DATABASE_OWNER,
  DATABASE_OWNER_PASSWORD,
  DATABASE_NAME,
  DATABASE_VISITOR,
  DATABASE_AUTHENTICATOR,
  DATABASE_AUTHENTICATOR_PASSWORD,
  ROOT_DATABASE_URL,
} = process.env

const RECONNECT_BASE_DELAY = 100
const RECONNECT_MAX_DELAY = 30000

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const pgPool = new pg.Pool({ connectionString: ROOT_DATABASE_URL })

async function main() {
  let attempts = 0
  while (true) {
    try {
      await pgPool.query('select true as "Connection test"')
      break
    } catch (e) {
      if (e.code === "28P01") throw e
      attempts++
      if (attempts >= 30) {
        console.log(`Database never came up, aborting :(`)
        process.exit(1)
      }
      const delay = Math.floor(Math.min(
        RECONNECT_MAX_DELAY,
        RECONNECT_BASE_DELAY * Math.random() * 2 ** attempts
      ))
      await sleep(delay)
    }
  }

  const client = await pgPool.connect()
  try {
    await client.query(`drop database if exists ${DATABASE_NAME}`)
    console.log(`DROP DATABASE ${DATABASE_NAME}`)
    await client.query(`drop database if exists ${DATABASE_NAME}_shadow`)
    await client.query(`drop database if exists ${DATABASE_NAME}_test`)
    await client.query(`drop role if exists ${DATABASE_VISITOR}`)
    console.log(`DROP ROLE ${DATABASE_VISITOR}`)
    await client.query(`drop role if exists ${DATABASE_AUTHENTICATOR}`)
    console.log(`DROP ROLE ${DATABASE_AUTHENTICATOR}`)
    await client.query(`drop role if exists ${DATABASE_OWNER}`)
    console.log(`DROP ROLE ${DATABASE_OWNER}`)

    await client.query(`create database ${DATABASE_NAME}`)
    console.log(`CREATE DATABASE ${DATABASE_NAME}`)
    await client.query(`create database ${DATABASE_NAME}_shadow`)
    await client.query(`create database ${DATABASE_NAME}_test`)

    /* Now to set up the database cleanly:
     * Ref: https://devcenter.heroku.com/articles/heroku-postgresql#connection-permissions
     *
     * This is the root role for the database
     * IMPORTANT: don't grant SUPERUSER in production, we only need this so we can load the watch fixtures!
     */
    if (process.env.NODE_ENV === 'production') {
      await client.query(`create role ${DATABASE_OWNER} with login password '${DATABASE_OWNER_PASSWORD}' noinherit`)
      console.log(`CREATE ROLE ${DATABASE_OWNER}`)
    } else {
      await client.query(`create role ${DATABASE_OWNER} with login password '${DATABASE_OWNER_PASSWORD}' superuser`)
      console.log(`CREATE ROLE ${DATABASE_OWNER} SUPERUSER`)
    }

    await client.query(`grant all privileges on database ${DATABASE_NAME} to ${DATABASE_OWNER}`)
    console.log(`GRANT ${DATABASE_OWNER}`)

    // This is the no-access role that PostGraphile will run as by default
    await client.query(`create role ${DATABASE_AUTHENTICATOR} with login password '${DATABASE_AUTHENTICATOR_PASSWORD}' noinherit`)
    console.log(`CREATE ROLE ${DATABASE_AUTHENTICATOR}`)

    // This is the role that PostGraphile will switch to (from DATABASE_AUTHENTICATOR) during a GraphQL request
    await client.query(`create role ${DATABASE_VISITOR}`)
    console.log(`CREATE ROLE ${DATABASE_VISITOR}`)

    // This enables PostGraphile to switch from DATABASE_AUTHENTICATOR to DATABASE_VISITOR
    await client.query(`grant ${DATABASE_VISITOR} to ${DATABASE_AUTHENTICATOR}`)
    console.log(`GRANT ${DATABASE_VISITOR} TO ${DATABASE_AUTHENTICATOR}`)
  } catch (e) {
    console.error(e)
  } finally {
    client.release()
  }
}
main().then(() => pgPool.end())
