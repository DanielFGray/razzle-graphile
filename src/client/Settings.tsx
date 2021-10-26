import React, { useState } from 'react'
import { Loading, Form, Layout, Success, RenderErrors } from '@/components'
import {
  EmailsForm_UserEmailFragment,
  SettingsEmailsQuery,
  SharedQuery,
  useChangePasswordMutation,
  useConfirmAccountDeletionMutation,
  useDeleteEmailMutation,
  useMakeEmailPrimaryMutation,
  useRequestAccountDeletionMutation,
  useResendEmailVerificationMutation,
  useSettingsEmailsQuery,
  useUpdateUserMutation,
  useAddEmailMutation,
} from '@/generated'
import { useErrors, extractError, getCodeFromError, useSearchParams, useLogout } from '@/lib'
import { NavLink, Route, Redirect, Switch } from 'react-router-dom'

export function SplitSettingsPage(): JSX.Element {
  const query = useSettingsEmailsQuery()
  return (
    <Layout query={query} forbidWhen={auth => auth.LOGGED_OUT}>
      <div className="flex flex-row justify-around mb-2">
        <NavLink to="/settings/profile">profile settings</NavLink>
        <NavLink to="/settings/passwords">password settings</NavLink>
        <NavLink to="/settings/email">email settings</NavLink>
        <NavLink to="/settings/delete">delete account</NavLink>
      </div>
      <div className="flex">
        <Switch>
          <Route path="/settings/profile" render={() => <UserProfile data={query.data} />} />
          <Route path="/settings/passwords" render={() => <PasswordSettings data={query.data} />} />
          <Route path="/settings/email" render={() => <EmailSettings data={query.data} />} />
          <Route path="/settings/delete" render={() => <DeleteAccount />} />
          <Route render={() => <Redirect to="/settings/profile" />} />
        </Switch>
      </div>
    </Layout>
  )
}

export function SingleSettingsPage(): JSX.Element {
  const query = useSettingsEmailsQuery()
  return (
    <Layout query={query} forbidWhen={auth => auth.LOGGED_OUT}>
      <div className="flex flex-col gap-4">
        <UserProfile data={query.data} />
        <PasswordSettings data={query.data} />
        <EmailSettings data={query.data} />
        <DeleteAccount />
      </div>
    </Layout>
  )
}

function UserProfile({ data }: { data: SettingsEmailsQuery }) {
  const [updateUser, updateMutation] = useUpdateUserMutation()
  const [errors, setErrors] = useErrors()
  return (
    <Form<'username' | 'name'>
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
        <legend>profile settings</legend>
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
        <legend>password settings</legend>
        {data?.currentUser.hasPassword ? (
          <label>
            <span>{'old password: '}</span>
            <input type="password" name="old-password" required minLength={8} />
          </label>
        ) : null}
        <label>
          <span>{'new password: '}</span>
          <input type="password" name="new-password" required minLength={8} />
        </label>
        <label>
          <span>{'confirm password: '}</span>
          <input type="password" name="confirm-password" required minLength={8} />
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

function EmailSettings({ data }: { data: SettingsEmailsQuery }) {
  const [errors, setErrors] = useErrors(
    data?.currentUser && data?.currentUser.isVerified
      ? null
      : `You do not have any verified email addresses, this will make account recovery impossible and may limit your available functionality within this application. Please complete email verification.`,
  )
  return (
    <fieldset>
      <legend>email settings</legend>
      {data?.currentUser.userEmails.nodes.map(email => (
        <Email
          key={email.id}
          email={email}
          hasOtherEmails={data.currentUser.userEmails.nodes.length > 1}
        />
      ))}
      <div>
        <input type="submit" value="update emails" />
      </div>
      <AddEmailForm setErrors={setErrors} />
      <RenderErrors errors={errors} />
    </fieldset>
  )
}

function Email({
  email,
  hasOtherEmails,
}: {
  email: EmailsForm_UserEmailFragment
  hasOtherEmails: boolean
}) {
  const canDelete = ! email.isPrimary && hasOtherEmails
  const [deleteEmail] = useDeleteEmailMutation()
  const [resendEmailVerification] = useResendEmailVerificationMutation()
  const [makeEmailPrimary] = useMakeEmailPrimaryMutation()
  return (
    <li
      className="flex flex-row justify-between"
      data-cy={`settingsemails-emailitem-${email.email.replace(/[^a-zA-Z0-9]/g, '-')}`}
    >
      <div>
        {`✉️ ${email.email} `}
        <div>
          <span
            title={
              email.isVerified
                ? 'Verified'
                : 'Pending verification (please check your inbox / spam folder'
            }
          >
            {email.isVerified ? '✅ ' : <small style={{ color: 'red' }}>(unverified)</small>}
          </span>
          Added {new Date(Date.parse(email.createdAt)).toLocaleString()}
        </div>
      </div>
      <div>
        {email.isPrimary && (
          <span key="primary_indicator" data-cy="settingsemails-indicator-primary">
            Primary
          </span>
        )}
        {canDelete && (
          <button
            onClick={() => deleteEmail({ variables: { emailId: email.id } })}
            data-cy="settingsemails-button-delete"
          >
            Delete
          </button>
        )}
        {! email.isVerified && (
          <button onClick={() => resendEmailVerification({ variables: { emailId: email.id } })}>
            Resend verification
          </button>
        )}
        {email.isVerified && ! email.isPrimary && (
          <button
            onClick={() => makeEmailPrimary({ variables: { emailId: email.id } })}
            data-cy="settingsemails-button-makeprimary"
          >
            Make primary
          </button>
        )}
      </div>
    </li>
  )
}

function AddEmailForm({ setErrors }: { setErrors: (error: string | Error | null) => void }) {
  const [addEmail] = useAddEmailMutation()
  return (
    <Form
      onSubmit={async values => {
        try {
          setErrors(null)
          await addEmail({ variables: { email: values.email } })
        } catch (e) {
          setErrors(extractError(e))
        }
      }}
    >
      <label>
        <span>{'new email: '}</span>
        <input type="email" name="new-email" required data-cy="settingsemails-input-email" />
      </label>
      <input type="submit" value="Add email" data-cy="settingsemails-button-submit" />
    </Form>
  )
}

function DeleteAccount() {
  const [requestAccountDeletion] = useRequestAccountDeletionMutation()
  const [confirmAccountDeletion] = useConfirmAccountDeletionMutation()
  const [errors, setErrors] = useErrors()
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [itIsDone, setItIsDone] = useState(false)
  const [doingIt, setDoingIt] = useState(false)
  const { token = null } = useSearchParams()
  const logout = useLogout()

  function doIt() {
    setErrors(null)
    setDoingIt(true)
    void (async () => {
      try {
        const result = await requestAccountDeletion()
        if (! result) {
          throw new Error('Result expected')
        }
        const { data, errors } = result
        if (! data || ! data.requestAccountDeletion || ! data.requestAccountDeletion.success) {
          console.dir(errors)
          throw new Error('Requesting deletion failed')
        }
        setItIsDone(true)
      } catch (e) {
        setErrors(e)
      }
      setDoingIt(false)
    })()
  }
  function confirmDeletion() {
    if (deleting || ! token) {
      return
    }
    setErrors(null)
    setDeleting(true)
    void (async () => {
      try {
        await confirmAccountDeletion({ variables: { token } })
        // Display confirmation
        setDeleted(true)
        await logout()
      } catch (e) {
        setErrors(e)
      }
      setDeleting(false)
    })()
  }
  return (
    <form onSubmit={ev => ev.preventDefault()}>
      <fieldset>
        <legend style={{ color: 'red' }}>danger zone</legend>
        {token ? (
          <div>
            <p>
              This is it. <b>Press this button and your account will be deleted.</b> We&apos;re sorry to see you go, please don&apos;t hesitate to reach out and let us know why you no longer want your account.
            </p>
            <p>
              <button
                onClick={confirmDeletion}
                disabled={deleting}
                style={{ backgroundColor: 'orangered', borderColor: 'red', color: 'white', width: '100%'}}
              >
                PERMANENTLY DELETE MY ACCOUNT
              </button>
            </p>
          </div>
        ) : itIsDone ? (
          <div>
            You&apos;ve been sent an email with a confirmation link in it, you must click it to confirm
            that you are the account holder so that you may continue deleting your account.
          </div>
        ) : deleted ? (
          <Redirect to="/" />
        ) : (
          <button
            onClick={doIt}
            disabled={doingIt}
            style={{ backgroundColor: 'orangered', borderColor: 'red', color: 'white', width: '100%' }}
          >
            I want to delete my account
          </button>
        )}
        <RenderErrors errors={errors} />
      </fieldset>
    </form>
  )
}
