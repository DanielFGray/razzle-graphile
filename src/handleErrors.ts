import { GraphQLError } from 'graphql'
import { camelCase } from 'lodash'
import type { ErrorRequestHandler } from 'express'

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

interface ParsedError {
  message: string
  status: number
  code?: string
}

function parseError(error: Error): ParsedError {
  /*
   * Because an error may contain confidential information or information that
   * might help attackers, by default we don't output the error message at all.
   * You should override this for specific classes of errors below.
   */

  if (error['code'] === 'EBADCSRFTOKEN') {
    return {
      message: 'Invalid CSRF token: please reload the page.',
      status: 403,
      code: error['code'],
    }
  }

  // TODO: process certain errors
  const code = error['statusCode'] || error['status'] || error['code']
  const codeAsFloat = parseInt(code, 10)
  const httpCode =
    isFinite(codeAsFloat) && codeAsFloat >= 400 && codeAsFloat < 600 ? codeAsFloat : 500

  return {
    message: 'An unknown error occurred',
    status: httpCode,
  }
}

function getErrorPage({ message }: ParsedError) {
  return message
    ? String(message)
    : 'Something went wrong on the webpage you visited, please try again later'
}

const ERROR_PROPERTIES_TO_EXPOSE =
  isDev || isTest
    ? [
      'code',
      'severity',
      'detail',
      'hint',
      'positon',
      'internalPosition',
      'internalQuery',
      'where',
      'schema',
      'table',
      'column',
      'dataType',
      'constraint',
    ]
    : ['code']

const pluck = (err: any): { [key: string]: any } => {
  return ERROR_PROPERTIES_TO_EXPOSE.reduce((memo, key) => {
    const value =
      key === 'code'
        ? // err.errcode is equivalent to err.code; replace it
        err.code || err.errcode
        : err[key]
    if (value != null) {
      memo[key] = value
    }
    return memo
  }, {})
}

/**
 * This map allows you to override the error object output to users from
 * database errors.
 *
 * See `docs/error_codes.md` for a list of error codes we use internally.
 *
 * See https://www.postgresql.org/docs/current/errcodes-appendix.html for a
 * list of error codes that PostgreSQL produces.
 */
export const ERROR_MESSAGE_OVERRIDES: { [code: string]: typeof pluck } = {
  '42501': err => ({
    ...pluck(err),
    message: 'Permission denied (by RLS)',
  }),
  '23505': err => ({
    ...pluck(err),
    message: 'Conflict occurred',
    fields: conflictFieldsFromError(err),
    code: 'NUNIQ',
  }),
  '23503': err => ({
    ...pluck(err),
    message: 'Invalid reference',
    fields: conflictFieldsFromError(err),
    code: 'BADFK',
  }),
}

function conflictFieldsFromError(err: any) {
  const { table, constraint } = err
  // TODO: extract a list of constraints from the DB
  if (constraint && table) {
    const PREFIX = `${table}_`
    const SUFFIX_LIST = [`_key`, `_fkey`]
    if (constraint.startsWith(PREFIX)) {
      const matchingSuffix = SUFFIX_LIST.find(SUFFIX => constraint.endsWith(SUFFIX))
      if (matchingSuffix) {
        const maybeColumnNames = constraint.substr(
          PREFIX.length,
          constraint.length - PREFIX.length - matchingSuffix.length,
        )
        return [camelCase(maybeColumnNames)]
      }
    }
  }
  return undefined
}

export function handleErrors(errors: Array<GraphQLError>) {
  return errors.map(error => {
    const { message: rawMessage, locations, path, originalError } = error
    const code = originalError ? originalError['code'] : null
    const localPluck = ERROR_MESSAGE_OVERRIDES[code] || pluck
    const exception = localPluck(originalError || error)
    return {
      message: exception.message || rawMessage,
      locations,
      path,
      extensions: {
        exception,
      },
    }
  })
}

export const errorRequestHandler: ErrorRequestHandler = (error, _req, res, next) => {
  console.error(error)
  try {
    const parsedError = parseError(error)
    const errorMessageString = `ERROR: ${parsedError.message}`
    if (res.headersSent) {
      console.error(errorMessageString)
      res.end()
      return
    }
    res.status(parsedError.status)
    res.format({
      json() {
        res.send({
          errors: [{ message: errorMessageString, code: parsedError.code }],
        })
      },

      html() {
        res.send(getErrorPage(parsedError))
      },

      text() {
        res.send(errorMessageString)
      },

      default() {
        // log the request and respond with 406
        res.status(406).send('Not Acceptable')
      },
    })
  } catch (e) {
    next(e)
  }
}
