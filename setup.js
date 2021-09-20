const fs = require('fs')
const runAll = require("npm-run-all")
const pg = require('pg')

const {
  DATABASE_OWNER,
  DATABASE_OWNER_PASSWORD,
  DATABASE_NAME,
  DATABASE_VISITOR,
  DATABASE_AUTHENTICATOR,
  DATABASE_AUTHENTICATOR_PASSWORD,
  ROOT_DATABASE_URL,
} = process.env

if (! fs.existsSync('.env')) {
  console.error('no .env file and generator not implemented')
  process.exit(1)
}

const pgPool = new pg.Pool({
  connectionString: ROOT_DATABASE_URL,
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  let attempts = 0
  while (true) {
    try {
      await pgPool.query('select true as "Connection test"')
      break
    } catch (e) {
      if (e.code === "28P01") throw e
      attempts++
      if (attempts <= 30) {
        console.log(`Database is not ready yet (attempt ${attempts}): ${e.message}`)
      } else {
        console.log(`Database never came up, aborting :(`)
        process.exit(1)
      }
      await sleep(1000)
    }
  }

  const client = await pgPool.connect()
  try {
    await client.query(`drop database if exists ${DATABASE_NAME }`)
    await client.query(`drop database if exists ${DATABASE_NAME}_shadow`)
    await client.query(`drop database if exists ${DATABASE_NAME}_test`)
    await client.query(`drop role if exists ${DATABASE_VISITOR}`)
    await client.query(`drop role if exists ${DATABASE_AUTHENTICATOR}`)
    await client.query(`drop role if exists ${DATABASE_OWNER}`)

    await client.query(`create database ${DATABASE_NAME}`)
    await client.query(`create database ${DATABASE_NAME}_shadow`)
    await client.query(`create database ${DATABASE_NAME}_test`)

    /* Now to set up the database cleanly:
     * Ref: https://devcenter.heroku.com/articles/heroku-postgresql#connection-permissions
     *
     * This is the root role for the database
     * IMPORTANT: don't grant SUPERUSER in production, we only need this so we can load the watch fixtures!
     */
    // create role ${DATABASE_OWNER} with login password '${DATABASE_OWNER_PASSWORD}' superuser
    await client.query(`create role ${DATABASE_OWNER} with login password '${DATABASE_OWNER_PASSWORD}' noinherit`)
    await client.query(`grant all privileges on database ${DATABASE_NAME} to ${DATABASE_OWNER}`)

    // This is the no-access role that PostGraphile will run as by default
    await client.query(`create role ${DATABASE_AUTHENTICATOR} with login password '${DATABASE_AUTHENTICATOR_PASSWORD}' noinherit`)

    // This is the role that PostGraphile will switch to (from DATABASE_AUTHENTICATOR) during a GraphQL request
    await client.query(`create role ${DATABASE_VISITOR}`)

    // This enables PostGraphile to switch from DATABASE_AUTHENTICATOR to DATABASE_VISITOR
    await client.query(`grant ${DATABASE_VISITOR} to ${DATABASE_AUTHENTICATOR}`)
  } catch (e) {
    console.error(e)
  } finally {
    client.release()
  }
}
main().then(() => pgPool.end())
