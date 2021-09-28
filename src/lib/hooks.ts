import { useState } from 'react'
import { useLocation } from 'react-router-dom'

export function useSearchParams(): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(useLocation().search))
}
export function useErrors(
  err?: string | Array<string> | Error,
): readonly [null | Array<string>, (str: null | string | Error | Array<string>) => void] {
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
