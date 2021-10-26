import React from 'react'
import { Link, useHistory } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import { Layout, Form, SocialLogin, RenderErrors } from '@/components'
import { useLoginMutation, useSharedQuery } from '@/generated'
import {
  extractError,
  getCodeFromError,
  resetWebsocketConnection,
  useErrors,
  useSearchParams,
} from '@/lib'

export default function SignIn(): JSX.Element {
  const query = useSharedQuery()
  const [errors, setErrors] = useErrors()
  const [login] = useLoginMutation()
  const client = useApolloClient()
  const history = useHistory()
  const { next = '/' } = useSearchParams()
  return (
    <Layout query={query} forbidWhen={auth => auth.LOGGED_IN}>
      <Form
        action="/graphql"
        method="post"
        onSubmit={async values => {
          setErrors(null)
          try {
            await login({
              variables: {
                username: values.username,
                password: values.password,
              },
            })
            resetWebsocketConnection()
            void client.resetStore()
            history.push(next)
          } catch (err) {
            switch (getCodeFromError(err)) {
            case 'CREDS':
              setErrors('Incorrect username or password')
              break
            default:
              setErrors(extractError(err))
            }
          }
        }}
      >
        <fieldset>
          <legend>sign in</legend>
          <label>
            <span>{'username: '}</span>
            <input
              type="text"
              name="username"
              defaultValue={query.data?.currentUser?.username}
              placeholder="or email"
              required
            />
          </label>
          <label>
            <span>{'password: '}</span>
            <input type="password" name="password" required placeholder="********" />
          </label>
          <div>
            <input type="submit" value="sign in" />
          </div>
          <RenderErrors errors={errors} />
          {errors?.includes('Incorrect username or password') ? <Link to="/forgot">forgot your password?</Link> : null}
        </fieldset>
        <SocialLogin label="sign in" />
      </Form>
    </Layout>
  )
}
