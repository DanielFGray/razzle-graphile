import React from 'react'
import { useHistory } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import { SocialLogin, Loading, Form, Layout, Success, RenderErrors } from '@/components'
import { useRegisterMutation, useSharedQuery } from '@/generated'
import {
  useErrors,
  extractError,
  getCodeFromError,
  getExceptionFromError,
  resetWebsocketConnection,
  useSearchParams,
} from '@/lib'

export default function SignUp(): JSX.Element {
  const query = useSharedQuery()
  const [errors, setErrors] = useErrors()
  const client = useApolloClient()
  const history = useHistory()
  const { next = '/' } = useSearchParams()
  const [register, registerMutation] = useRegisterMutation()
  return (
    <Layout query={query} forbidWhen={auth => auth.LOGGED_IN}>
      <Form<'username' | 'email' | 'password' | 'name'>
        onSubmit={async values => {
          try {
            setErrors(null)
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
            await client.resetStore()
            history.push(next)
          } catch (err) {
            switch (getCodeFromError(err)) {
            case 'WEAKP':
              setErrors('Password is too weak or too common, please make it stronger')
              break
            case 'EMTKN':
              setErrors(
                "An account with this email address has already been registered, consider using the 'Forgot passphrase' function.",
              )
              break
            case 'NUNIQ':
              setErrors(
                'An account with this username has already been registered, please try a different username.',
              )
              break
            case '23514':
              setErrors(
                'This username is not allowed; usernames must be between 2 and 24 characters long (inclusive), must start with a letter, and must contain only alphanumeric characters and underscores.',
              )
              break
            default:
              setErrors(err)
            }
          }
        }}
      >
        <fieldset>
          <legend>sign up</legend>
          <div>
            <label>
              <span>{'email*: '}</span>
              <input type="email" name="email" />
            </label>
          </div>
          <label>
            <span>username*: </span>
            <input
              type="username"
              name="username"
              autoCapitalize="false"
              autoComplete="false"
              required
            />
          </label>
          <label>
            <span>{'password*: '}</span>
            <input type="password" name="password" required />
          </label>
          <label>
            <span>{'your name: '}</span>
            <input type="username" name="name" />
          </label>
          <div>
            <input type="submit" value="register" />
            {registerMutation.loading && <Loading />}
            {registerMutation.data && <Success />}
          </div>
          <RenderErrors errors={errors} />
        </fieldset>
        <SocialLogin label="sign up" />
      </Form>
    </Layout>
  )
}
