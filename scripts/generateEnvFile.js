const fs = require('fs/promises')
const crypto = require('crypto')
const inquirer = require('inquirer')

const packageName = require('../package.json').name.replace(/\W/g, '_').replace(/__+/g, '')

const validName = str => {
  if (str.length < 4) return 'must be at least 4 characters'
  if (str !== str.toLowerCase()) return 'must be lowercase'
  return true
}

const generatePassword = (length, type = 'base64') =>
  crypto.randomBytes(length).toString(type).replace(/\W/g, '_').toLowerCase()

async function main() {
  try {
    const stat = await fs.stat('.env')
    process.exit(0)
  } catch(e) {}

  const { ROOT_DATABASE_USER } = await inquirer.prompt([{ name: 'ROOT_DATABASE_USER', message: 'superuser database username:', default: 'postgres', prefix: '' }])
  const { DATABASE_HOST } = await inquirer.prompt([{ name: 'DATABASE_HOST', message: 'database host:', default: 'localhost:5432', prefix: '' }])
  const { DATABASE_NAME } = await inquirer.prompt([{ name: 'DATABASE_NAME', message: 'database name:', default: packageName, validate: validName, prefix: '' }])
  const { DATABASE_OWNER } = await inquirer.prompt([{ name: 'DATABASE_OWNER', message: 'database username:', default: DATABASE_NAME, prefix: '' }])
  const { DATABASE_AUTHENTICATOR } = await inquirer.prompt([{ name: 'DATABASE_AUTHENTICATOR', message: 'authenticator role name:', default: 'authenticator', prefix: '' }])
  const { DATABASE_VISITOR } = await inquirer.prompt([{ name: 'DATABASE_VISITOR', message: 'visitor role name:', default: 'visitor', prefix: '' }])
  const { PORT } = await inquirer.prompt([{ name: 'PORT', message: 'application port:', default: '3000', prefix: '' }])

  const ROOT_DATABASE_PASSWORD = crypto.randomBytes(12).toString('hex')
  const DATABASE_OWNER_PASSWORD = crypto.randomBytes(12).toString('hex')
  const DATABASE_AUTHENTICATOR_PASSWORD = crypto.randomBytes(12).toString('hex')
  const ROOT_DATABASE_URL = `postgres://${ROOT_DATABASE_USER}:${ROOT_DATABASE_PASSWORD}@${DATABASE_HOST}/template1`
  const DATABASE_URL = `postgres://${DATABASE_OWNER}:${DATABASE_OWNER_PASSWORD}@${DATABASE_HOST}/${DATABASE_NAME}`
  const AUTH_DATABASE_URL = `postgres://${DATABASE_AUTHENTICATOR}:${DATABASE_AUTHENTICATOR_PASSWORD}@${DATABASE_HOST}/${DATABASE_NAME}`
  const SECRET = crypto.randomBytes(32).toString('hex')
  const RAZZLE_ROOT_URL = `http://localhost:${PORT}`

  const envFile = `NODE_ENV=development
ROOT_DATABASE_USER=${ROOT_DATABASE_USER}
ROOT_DATABASE_PASSWORD=${ROOT_DATABASE_PASSWORD}
ROOT_DATABASE_URL=${ROOT_DATABASE_URL}
DATABASE_HOST=${DATABASE_HOST}
DATABASE_NAME=${DATABASE_NAME}
DATABASE_OWNER=${DATABASE_OWNER}
DATABASE_OWNER_PASSWORD=${DATABASE_OWNER_PASSWORD}
DATABASE_URL=${DATABASE_URL}
DATABASE_AUTHENTICATOR=${DATABASE_AUTHENTICATOR}
DATABASE_AUTHENTICATOR_PASSWORD=${DATABASE_AUTHENTICATOR_PASSWORD}
AUTH_DATABASE_URL=${AUTH_DATABASE_URL}
DATABASE_VISITOR=${DATABASE_VISITOR}
SECRET=${SECRET}
PORT=${PORT}
RAZZLE_ROOT_URL=${RAZZLE_ROOT_URL}
GITHUB_KEY=
GITHUB_SECRET=`
  await fs.writeFile('./.env', envFile, 'utf8')
}

main()
