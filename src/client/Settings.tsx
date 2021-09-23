import React, { useState } from 'react'
import { Form, Layout } from 'components'
import { useUpdateUserMutation } from 'generated'
import { extractError, getCodeFromError } from 'lib'

export default function Settings(): JSX.Element {
  const [updateUser] = useUpdateUserMutation()
  const [error, _setError] = useState<null | string[]>(null)
  const setError = (str: string | null) =>
    _setError((s: null | string[]) => {
      if (str == null) _setError(null)
      return (s || []).concat(str)
    })

  return (
    <Layout>
      {({ data }) => (
        <Form<'username' | 'name'>
          action="/graphql"
          method="post"
          onSubmit={async values => {
            try {
              await updateUser({
                variables: {
                  id: data.currentUser.id,
                  patch: {
                    username: values.username,
                    name: values.name,
                  },
                },
              })
              setError(null)
            } catch (err) {
              switch (getCodeFromError(err)) {
              case 'NUNIQ':
                setError('This username is already in use, please pick a different name')
                break
              default: setError(extractError(e))
              }
            }
          }}
        >
          <fieldset>
            <legend>account settings</legend>
            <div>
              <label>
                {'username: '}
                <input
                  type="text"
                  name="username"
                  defaultValue={data?.currentUser.username}
                  placeholder="username [required]"
                  required
                />
              </label>
            </div>
            <div>
              <label>
                {'name: '}
                <input
                  type="text"
                  name="name"
                  defaultValue={data?.currentUser.name}
                  placeholder="name"
                />
              </label>
            </div>
          </fieldset>
          <div>{error}</div>
          <input type="submit" value="update" />
        </Form>
      )}
    </Layout>
  )
}
