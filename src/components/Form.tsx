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

export function Success(): JSX.Element {
  return (
    <span className="success-indicator" role="img" aria-label="success">
      ✅
    </span>
  )
}

export function Loading(): JSX.Element {
  return <span className="loading-indicator">...</span>
}

export function RenderErrors({
  errors,
}: {
  errors: null | ReadonlyArray<string>
}): React.ReactElement {
  return errors ? <div className="error">{errors}</div> : null
}

export function ButtonProgress({
  status = 'idle',
  children,
  ...props
}: {
  status?: 'idle' | 'waiting' | 'success' | 'error'
} & React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement {
  return (
    <div id="progress-button" className="progress-button">
      {/* button with text */}
      <button {...props}>
        <span>{children}</span>
      </button>
      {status === 'waiting' ? (
        <svg className="progress-circle" width={70} height={70}>
          <path d="m35,2.5c17.955803,0 32.5,14.544199 32.5,32.5c0,17.955803 -14.544197,32.5 -32.5,32.5c-17.955803,0 -32.5,-14.544197 -32.5,-32.5c0,-17.955801 14.544197,-32.5 32.5,-32.5z" />
        </svg>
      ) : status === 'success' ? (
        <svg className="checkmark" width={70} height={70}>
          <path d="m31.5,46.5l15.3,-23.2" />
          <path d="m31.5,46.5l-8.5,-7.1" />
        </svg>
      ) : status === 'error' ? (
        <svg className="cross" width={70} height={70}>
          <path d="m35,35l-9.3,-9.3" />
          <path d="m35,35l9.3,9.3" />
          <path d="m35,35l-9.3,9.3" />
          <path d="m35,35l9.3,-9.3" />
        </svg>
      ) : null}
    </div>
  )
}
