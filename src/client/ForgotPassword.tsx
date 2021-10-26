import React, { useState } from 'react'
import { Form, Layout, RenderErrors } from '@/components'
import { useForgotPasswordMutation, useSharedQuery } from '@/generated'
import { useErrors } from '@/lib'

export default function ForgotPassword() {
  const query = useSharedQuery()
  const [forgotPassword] = useForgotPasswordMutation()
  const [errors, setErrors] = useErrors()
  const [successfulEmail, setSuccessfulEmail] = useState<string | null>(null)
  return (
    <Layout query={query} forbidWhen={auth => auth.LOGGED_IN}>
      {successfulEmail ? (
        <p>
          We've sent an email reset link to '{successfulEmail}'; click the link and follow the
          instructions. If you don't receive the link, please ensure you entered the email address
          correctly, and check in your spam folder just in case.
        </p>
      ) : (
        <Form<'email'>
          onSubmit={async ({ email }) => {
            setErrors(null)
            try {
              await forgotPassword({
                variables: {
                  email,
                },
              })
              // Success: refetch
              setSuccessfulEmail(email)
            } catch (e) {
              setErrors(e)
            }
          }}
        >
          <fieldset>
            <legend>forgot password</legend>
            <label>
              <span>
                email<span style={{ color: 'red' }}>*</span>:
              </span>
              <input name="email" type="email" required />
            </label>
            <RenderErrors {...{ errors }} />
            <div>
              <input type="submit" value="reset password" />
            </div>
          </fieldset>
        </Form>
      )}
    </Layout>
  )
}
