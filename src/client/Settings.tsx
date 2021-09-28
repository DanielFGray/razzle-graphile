import React from 'react'
import { Loading, Form, Layout, Success, RenderErrors } from '@/components'
import {
  EmailsForm_UserEmailFragment,
  SettingsEmailsQuery,
  SharedQuery,
  useChangePasswordMutation,
  useDeleteEmailMutation,
  useMakeEmailPrimaryMutation,
  useResendEmailVerificationMutation,
  useSettingsEmailsQuery,
  useSharedQuery,
  useUpdateUserMutation,
} from '@/generated'
import { useErrors, extractError, getCodeFromError } from '@/lib'

export default function Settings(): JSX.Element {
  const query = useSharedQuery()
  console.log({ settingsQuery: query })
  return (
    <Layout query={query} forbidWhen={auth => auth.LOGGED_OUT}>
      <UserProfile data={query.data} />
      <PasswordSettings data={query.data} />
      <EmailSettings />
    </Layout>
  )
}

function UserProfile({ data }: { data: SharedQuery }) {
  const [updateUser, updateMutation] = useUpdateUserMutation()
  const [errors, setErrors] = useErrors()
  return (
    <Form<'username' | 'name'>
      action="/graphql"
      method="post"
      onSubmit={async values => {
        try {
          setErrors(null)
          await updateUser({
            variables: {
              id: data.currentUser.id,
              patch: {
                username: values.username,
                name: values.name,
              },
            },
          })
        } catch (err) {
          switch (getCodeFromError(err)) {
          case 'NUNIQ':
            setErrors('This username is already in use, please pick a different name')
            break
          default:
            setErrors(extractError(err))
          }
        }
      }}
    >
      <fieldset>
        <legend>account settings</legend>
        <label>
          <span>{'username: '}</span>
          <input
            type="text"
            name="username"
            defaultValue={data?.currentUser.username}
            placeholder="username [required]"
            required
          />
        </label>
        <label>
          <span>{'name: '}</span>
          <input type="text" name="name" defaultValue={data?.currentUser.name} placeholder="name" />
        </label>
        <div>
          <input type="submit" value="update" />
          {updateMutation.loading && <Loading />}
          {updateMutation.data && <Success />}
        </div>
        <RenderErrors errors={errors} />
      </fieldset>
    </Form>
  )
}

function PasswordSettings({ data }: { data: SharedQuery }) {
  const [changePassword, changePasswordMutation] = useChangePasswordMutation()
  const [errors, setErrors] = useErrors()
  return (
    <Form<'old-password' | 'new-password' | 'confirm-password'>
      action="/graphql"
      method="post"
      onSubmit={async values => {
        try {
          setErrors(null)
          if (values['new-password'] !== values['confirm-password'])
            throw new Error("passwords don't match")
          await changePassword({
            variables: {
              oldPassword: values['old-password'],
              newPassword: values['new-password'],
            },
          })
        } catch (err) {
          switch (getCodeFromError(err)) {
          case 'WEAKP':
            setErrors('Password is too weak or too common, please make it stronger')
            break
          case 'CREDS':
            setErrors('Incorrect old passphrase')
            break
          default:
            setErrors(extractError(err))
          }
        }
      }}
    >
      <fieldset>
        <legend>account settings</legend>
        {data.currentUser.hasPassword ? (
          <label>
            <span>{'old password: '}</span>
            <input type="password" name="old-password" required />
          </label>
        ) : null}
        <label>
          <span>{'new password: '}</span>
          <input type="password" name="new-password" required />
        </label>
        <label>
          <span>{'confirm password: '}</span>
          <input type="password" name="confirm-password" required />
        </label>
        <div>
          <input type="submit" value="change password" />
          {changePasswordMutation.loading && <Loading />}
          {changePasswordMutation.data && <Success />}
        </div>
        <RenderErrors errors={errors} />
      </fieldset>
    </Form>
  )
}
