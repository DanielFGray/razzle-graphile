import React, { ReactNode } from 'react'
import { NavLink, Redirect, useHistory, useLocation } from 'react-router-dom'
import { SharedLayout_QueryFragment } from '@/generated'
import { ErrorBoundary as DefaultErrorBoundary } from 'react-error-boundary'
import type * as Apollo from '@apollo/client'
import {sleep, useLogout} from '@/lib'

function Nav({
  loggedIn,
  logout,
}: {
  loggedIn: boolean
  logout: (ev: React.MouseEvent) => void
}): JSX.Element {
  return (
    <nav>
      <ul className="flex flex-row justify-around">
        <li>
          <NavLink to="/" exact activeClassName="active">
            home
          </NavLink>
        </li>
        {loggedIn ? (
          <>
            <li>
              <NavLink to="/settings" activeClassName="active">
                settings
              </NavLink>
            </li>
            <li>
              <a href="/logout" onClick={logout}>
                sign out
              </a>
            </li>
          </>
        ) : (
          <>
            <li>
              <NavLink to="/signup" activeClassName="active">
                sign up
              </NavLink>
            </li>
            <li>
              <NavLink to="/signin" activeClassName="active">
                sign in
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  )
}

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
  children: ReactNode
  query: T
  forbidWhen?: (auth: typeof AuthRestrict) => AuthRestrict
}): JSX.Element {
  const location = useLocation()
  const history = useHistory()
  const logout = useLogout()

  const forbidWhen = when(AuthRestrict)
  const forbidsLoggedOut = forbidWhen & AuthRestrict.LOGGED_OUT
  const forbidsLoggedIn = forbidWhen & AuthRestrict.LOGGED_IN
  const forbidsNotAdmin = forbidWhen & AuthRestrict.NOT_ADMIN
  if (
    query.data?.currentUser &&
    (forbidsLoggedIn || (forbidsNotAdmin && query.data?.currentUser.role !== 'ADMIN'))
  ) {
    return <Redirect to="/" />
  } else if (
    query.data?.currentUser === null &&
    ! query.loading &&
    ! query.error &&
    forbidsLoggedOut
  ) {
    return <Redirect to={`/signin?next=${encodeURIComponent(location.pathname)}`} />
  }

  async function handleLogout(ev: React.MouseEvent) {
    try {
      await logout()
      ev.preventDefault()
    } catch (err) {
      console.log(err)
      await sleep(1000)
      history.push('/logout')
    }
  }

  return (
    <div className="m-2">
      <header>
        <Nav loggedIn={Boolean(query.data?.currentUser)} logout={handleLogout} />
      </header>
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}

export function ErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <DefaultErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="error">
          <span>uh oh, there was an error :(</span>
          <pre>{JSON.stringify(error, null, 2)}</pre>
          <button onClick={resetErrorBoundary}>reset</button>
        </div>
      )}
    >
      {children}
    </DefaultErrorBoundary>
  )
}
