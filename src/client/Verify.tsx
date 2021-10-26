import React, { useEffect, useState } from 'react'
import { Layout, RenderErrors } from '@/components'
import { useSharedQuery, useVerifyEmailMutation } from '@/generated'
import { useErrors, useSearchParams } from '@/lib'

export default function Verify(): React.ReactElement {
  const query = useSharedQuery()
  const props = useSearchParams()
  const [[id, token], setIdAndToken] = useState<[string, string]>([
    props.id || '',
    props.token || '',
  ])
  const [state, setState] = useState<'PENDING' | 'SUBMITTING' | 'SUCCESS'>(
    props.id && props.token ? 'SUBMITTING' : 'PENDING',
  )
  const [errors, setErrors] = useErrors()
  const [verifyEmail] = useVerifyEmailMutation()

  useEffect(() => {
    if (state === 'SUBMITTING') {
      setErrors(null)
      verifyEmail({
        variables: {
          id,
          token,
        },
      })
        .then(result => {
          if (result?.data?.verifyEmail?.success) {
            setState('SUCCESS')
          } else {
            setState('PENDING')
            setErrors('Incorrect token, please check and try again')
          }
        })
        .catch((e: Error) => {
          setErrors(e)
          setState('PENDING')
        })
    }
  }, [id, token, state, props, verifyEmail])

  function form() {
    return (
      <form onSubmit={() => setState('SUBMITTING')}>
        <p>Please enter your email verification code</p>
        <input type="text" value={token} onChange={e => setIdAndToken([id, e.target.value])} />
        <RenderErrors errors={errors} />
        <button>Submit</button>
      </form>
    )
  }

  return (
    <Layout query={query}>
      <div className="flex">
        <div className="flex-grow">
          {state === 'PENDING' ? (
            form()
          ) : state === 'SUBMITTING' ? (
            'Submitting...'
          ) : state === 'SUCCESS' ? (
            <div>
              Thank you for verifying your email address. You may now close this window.
            </div>
          ) : (
            'Unknown state'
          )}
        </div>
      </div>
    </Layout>
  )
}
