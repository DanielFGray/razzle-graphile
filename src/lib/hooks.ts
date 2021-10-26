import { useState } from 'react'
import { useApolloClient } from '@apollo/client'
import { useHistory, useLocation } from 'react-router-dom'
import { useLogoutMutation } from '@/generated'

export const sleep = (n: number): Promise<void> => new Promise(resolve => setTimeout(resolve, n))

export function useSearchParams(): Record<string, string> {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  return Object.fromEntries(params)
}

export function useErrors(
  err?: null | Error | string | Array<string>,
): readonly [null | ReadonlyArray<string>, (str: null | string | Error | Array<string>) => void] {
  const [errors, _setErrors] = useState<null | Array<string>>(
    ! err ? null
    : err instanceof Error ? [err.message]
    : err instanceof Array ? err
    : [err],
  )
  const setErrors = (str: Error | null | string | Array<string>) =>
    _setErrors((s: null | Array<string>) => {
      if (str == null) return null
      return (s || []).concat(str instanceof Error ? str.message : str)
    })
  return [errors, setErrors] as const
}

export function useLogout(): () => Promise<void> {
  const history = useHistory()
  const apolloClient = useApolloClient()
  const [logout] = useLogoutMutation()

  return async function Logout() {
    await logout()
    await apolloClient.resetStore()
    history.push('/')
  }
}
