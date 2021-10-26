import React, { useReducer, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import { SocialLogin, Loading, Form, Layout, Success, RenderErrors } from '@/components'
import { useRegisterMutation, useSharedQuery } from '@/generated'
import zxcvbn from 'zxcvbn'
import {
  extractError,
  getCodeFromError,
  resetWebsocketConnection,
  useErrors,
  useSearchParams,
} from '@/lib'

const initState = { password: '', passwordStrength: 0, passwordSuggestions: [''] }
type ActionTypes = { type: 'PASSWORD_CHANGED'; payload: string }

function passwordReducer(state: typeof initState, action: ActionTypes): typeof initState {
  switch (action.type) {
  case 'PASSWORD_CHANGED': {
    const { score, feedback } = zxcvbn(action.payload)
    return {
      ...state,
      password: action.payload,
      passwordStrength: score,
      passwordSuggestions: (feedback.warning ? [feedback.warning] : []).concat(feedback.suggestions),
    }
  }
  }
}

const strength = {
  0: 'Worst ☹',
  1: 'Bad ☹',
  2: 'Weak ☹',
  3: 'Good ☺',
  4: 'Strong ☻',
}

export default function SignUp(): JSX.Element {
  const query = useSharedQuery()
  const [errors, setErrors] = useErrors()
  const client = useApolloClient()
  const history = useHistory()
  const { next = '/' } = useSearchParams()
  const [register, registerMutation] = useRegisterMutation()

  const [{ password, passwordStrength, passwordSuggestions }, dispatch] = useReducer(
    passwordReducer,
    initState,
  )

  return (
    <Layout query={query} forbidWhen={auth => auth.LOGGED_IN}>
      <Form<'username' | 'email' | 'password' | 'confirm-password' | 'name'>
        onSubmit={async values => {
          try {
            setErrors(null)

            if (values['confirm-password'] !== values.password) {
              setErrors('passwords do not match')
              return
            }

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
            case 'MODAT':
              setErrors('Email is required')
              break
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
              setErrors(extractError(err))
            }
          }
        }}
      >
        <fieldset>
          <legend>sign up</legend>
          <div>
            <label>
              <span>
                email<span style={{ color: 'red' }}>*</span>:
              </span>
              <input type="email" name="email" autoCapitalize="false" required />
            </label>
          </div>
          <label>
            <span>
              username<span style={{ color: 'red' }}>*</span>:
            </span>
            <input
              type="username"
              name="username"
              autoCapitalize="false"
              autoComplete="false"
              required
            />
          </label>
          <label>
            <span>
              password<span style={{ color: 'red' }}>*</span>:
            </span>
            <div className="flex flex-col flex-grow" style={{ maxWidth: '67%' }}>
              <input
                type="password"
                name="password"
                onChange={ev => dispatch({ type: 'PASSWORD_CHANGED', payload: ev.target.value })}
                value={password}
                required
                minLength={8}
                className="flex-grow"
              />
              {password && (
                <>
                  <meter max="4" value={passwordStrength} className="flex-grow" style={{ height: '6px' }} />
                  <div>
                    {[strength[passwordStrength]]
                      .concat(passwordSuggestions)
                      .filter(Boolean)
                      .map(str => (
                        <div key={str}>{str}</div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </label>
          <label>
            <span>
              confirm password<span style={{ color: 'red' }}>*</span>:
            </span>
            <input
              type="password"
              name="confirm-password"
              required
              minLength={8}
            />
          </label>
          <label>
            <span>your name:</span>
            <input type="username" name="name" />
          </label>
          <div>
            <input type="submit" value="register" disabled={passwordStrength < 3} />
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
