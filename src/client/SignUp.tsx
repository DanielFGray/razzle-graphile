import React, { useState } from 'react'
import { Form, Layout } from 'components'
import {
  extractError,
  getCodeFromError,
  getExceptionFromError,
  resetWebsocketConnection,
  useSearchParams,
} from 'lib'
import { useHistory } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import { useRegisterMutation } from 'generated'

export default function SignUp(): JSX.Element {
  const [error, _setError] = useState<null | string[]>(null)
  const setError = (str: string | null) =>
    _setError((s: null | string[]) => {
      if (str == null) _setError(null)
      return (s || []).concat(str)
    })
  const client = useApolloClient()
  const history = useHistory()
  const { next } = useSearchParams()
  const [register] = useRegisterMutation()
  return (
    <Layout>
      <Form
        onSubmit={async values => {
          try {
            setError(null)
            await register({
              variables: {
                username: values.username,
                email: values.email,
                password: values.password,
                name: values.name,
              },
            })
            // Success: refetch
            resetWebsocketConnection()
            void client.resetStore()
            history.push(next)
          } catch (err) {
            switch (getCodeFromError(err)) {
            case 'WEAKP':
              setError('Password is too weak or too common, please make it stronger')
              break
            case 'EMTKN':
              setError(
                "An account with this email address has already been registered, consider using the 'Forgot passphrase' function.",
              )
              break
            case 'NUNIQ':
              setError(
                'An account with this username has already been registered, please try a different username.',
              )
              break
            case '23514':
              setError(
                'This username is not allowed; usernames must be between 2 and 24 characters long (inclusive), must start with a letter, and must contain only alphanumeric characters and underscores.',
              )
              break
            default:
              setError(err.message || err)
            }
          }
        }}
      >
        <fieldset>
          <legend>sign up</legend>
          <div>
            <label>
              email: <input type="email" name="email" required />
            </label>
          </div>
          <div>
            <label>
              username: <input type="username" name="username" required />
            </label>
          </div>
          <div>
            <label>
              password: <input type="password" name="password" required />
            </label>
          </div>
          <div>
            <label>
              your name: <input type="username" name="name" />
            </label>
          </div>{error && <div>{error}</div>}
          <div>
            <label>
              <input type="submit" value="register" />
            </label>
          </div>
        </fieldset>
        or
        <div>
          <a href="/auth/github">sign up with github</a>
        </div>
      </Form>
    </Layout>
  )
}
