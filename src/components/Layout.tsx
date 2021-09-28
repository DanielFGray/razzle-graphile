import React, { ReactNode } from 'react'
import { NavLink, Redirect, useHistory, useLocation } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import { useLogoutMutation, SharedLayout_QueryFragment } from '@/generated'
import { ErrorBoundary } from 'react-error-boundary'
import type * as Apollo from '@apollo/client'

enum AuthRestrict {
  NEVER = 0,
  LOGGED_OUT = 1 << 0,
  LOGGED_IN = 1 << 1,
  NOT_ADMIN = 1 << 2,
}

export function Layout<T extends Apollo.QueryResult<SharedLayout_QueryFragment>>({
  children,
  query,
  forbidWhen: when = auth => auth.NEVER,
}: {
  children: ReactNode | ((query: T) => ReactNode)
  query: T
  forbidWhen?: (auth: typeof AuthRestrict) => AuthRestrict
}): JSX.Element {
  const location = useLocation()
  const history = useHistory()
  const apolloClient = useApolloClient()
  const [logout] = useLogoutMutation()

  const forbidWhen = when(AuthRestrict)
  const forbidsLoggedIn = forbidWhen & AuthRestrict.LOGGED_IN
  const forbidsLoggedOut = forbidWhen & AuthRestrict.LOGGED_OUT
  const forbidsNotAdmin = forbidWhen & AuthRestrict.NOT_ADMIN
  if (
    query.data &&
    query.data.currentUser &&
    (forbidsLoggedIn || (forbidsNotAdmin && query.data.currentUser.role !== 'ADMIN'))
  ) {
    return <Redirect to="/" />
  } else if (
    query.data &&
    query.data.currentUser === null &&
    ! query.loading &&
    ! query.error &&
    forbidsLoggedOut
  ) {
    return <Redirect to={`/login?next=${encodeURIComponent(location.pathname)}`} />
  }
  async function handleLogout<T>(ev: React.MouseEvent<T>) {
    try {
      await logout()
      await apolloClient.resetStore()
      ev.preventDefault()
      history.push('/')
    } catch (err) {
      debugger
      console.error('error logging out:', err)
      history.push('/logout')
    }
  }
  return (
    <div className="m-2">
      <header>
        <nav>
          <ul className="flex flex-row justify-around">
            <li>
              <NavLink to="/">home</NavLink>
            </li>
            {query?.data?.currentUser ? (
              <>
                <li>
                  <NavLink to="/settings">settings</NavLink>
                </li>
                <li>
                  <a href="/logout" onClick={handleLogout}>
                    logout
                  </a>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink to="/signup">sign up</NavLink>
                </li>
                <li>
                  <NavLink to="/signin">sign in</NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </header>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <div className="error">
            <span>uh oh, there was an error :(</span>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}
      >
        {children}
      </ErrorBoundary>
    </div>
  )
}
