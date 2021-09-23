import React, { useState } from 'react'
import { Layout, Form } from 'components'
import { extractError, getCodeFromError, resetWebsocketConnection, useSearchParams } from 'lib'
import { useLoginMutation } from 'generated'
import { useHistory } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'

export default function SignIn(): JSX.Element {
  const [error, _setError] = useState<null | string[]>(null)
  const setError = (str: string | null) =>
    _setError((s: null | string[]) => {
      if (str == null) _setError(null)
      return (s || []).concat(str)
    })
  const [login] = useLoginMutation()
  const client = useApolloClient()
  const history = useHistory()
  const { next = '/' } = useSearchParams()
  return (
    <Layout forbidWhen={auth => auth.LOGGED_IN}>
      {({ data }) => (
        <Form
          action="/graphql"
          method="post"
          onSubmit={async values => {
            setError(null)
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
            } catch (e) {
              const errcode = getCodeFromError(e)
              console.log({ errcode, e })
              switch (errcode) {
              case 'CREDS':
                setError('Incorrect username or password')
                break
              default:
                setError(e instanceof Error ? extractError(e).message : e)
              }
            }
          }}
        >
          <fieldset>
            <legend>sign in</legend>
            <div>
              <label>
                {'username or email: '}
                <input
                  type="text"
                  name="username"
                  defaultValue={data?.currentUser?.username}
                  placeholder="username [required]"
                  required
                />
              </label>
            </div>
            <div>
              <label>
                {'password: '}
                <input type="password" name="password" placeholder="password [required]" required />
              </label>
            </div>
            {error && <div>{error}</div>}
            <div>
              <input type="submit" value="sign in" />
            </div>
          </fieldset>
          or
          <div>
            <a href="/auth/github">sign in with github</a>
          </div>
        </Form>
      )}
    </Layout>
  )
}
