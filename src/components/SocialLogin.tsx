import React from 'react'

export function SocialLogin({ label }: { label: 'sign up' | 'sign in' }) {
  return (
    <div className="text-center">
      or
      <div>
        <a href="/auth/github">{label} with github</a>
      </div>
    </div>
  )
}
