import React, { useState } from 'react'
import { Layout, Form } from 'components'
import { getCodeFromError } from 'lib'
import { useLoginMutation } from 'generated'

export default function SignIn(): JSX.Element {
  const [error, _setError] = useState<null | string[]>(null)
  const setError = (str: string) => _setError((s: null | string[]) => s)
  const [login] = useLoginMutation()
  return (
    <Layout>
      {({ data }) => (
        <Form
          action="/graphql"
          method="post"
          onSubmit={async values => {
            console.log(values)
            try {
              await login({
                variables: {
                  username: values.username,
                  password: values.password,
                },
              })
              setError(null)
            } catch (e) {
              const errcode = getCodeFromError(e)
              console.log(errcode, e.message)
              setError(e.message || e)
            }
          }}
        >
          <fieldset>
            <legend>sign in</legend>
            <div>
              <label>
                {'username: '}
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
                <input
                  type="text"
                  name="password"
                  placeholder="password [required]"
                  required
                />
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
