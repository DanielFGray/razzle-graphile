import React from 'react'

export function Form<Keys extends string>({
  children,
  onSubmit,
  ...props
}: {
  children: React.ReactNode
  onSubmit: (values: Record<Keys, string>, event: React.FormEvent<HTMLFormElement>) => void
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>): React.ReactElement {
  return (
    <form
      {...props}
      onSubmit={ev => {
        ev.preventDefault()
        const formData = new FormData(ev.currentTarget)
        const values = Object.fromEntries(formData.entries()) as Record<Keys, string>
        onSubmit(values, ev)
      }}
    >
      {children}
    </form>
  )
}

export function Success() {
  return <span className="success_indicator">✅</span>
}

export function Loading() {
  return <span className="loading_indicator">...</span>
}

export function RenderErrors({ errors }: { errors: ReadonlyArray<string> }) {
  return errors ? <div className="error">{errors.join(<br/>)}</div> : null
}
