import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { FullPageSpinner } from '../components/auth/RequireAuth'
import { authErrorMessage, takeNext } from '../lib/auth'
import { useAuthStore } from '../store/authStore'

/** Read an OAuth error from either the query string or the hash (Supabase uses both). */
function readRedirectError() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const get = (k: string) => query.get(k) ?? hash.get(k)
  const description = get('error_description') ?? get('error')
  return description ? { code: get('error_code'), description } : null
}

/**
 * Landing spot after Google/GitHub. supabase-js swaps the ?code= for a session on
 * its own (detectSessionInUrl); this page waits for that, then moves on.
 */
export default function AuthCallback() {
  const status = useAuthStore((s) => s.status)
  const navigate = useNavigate()
  const [redirectError] = useState(readRedirectError)

  useEffect(() => {
    if (redirectError) return
    if (status === 'guest' || status === 'member') navigate(takeNext(), { replace: true })
  }, [status, redirectError, navigate])

  if (!redirectError && (status === 'loading' || status === 'guest' || status === 'member')) {
    return <FullPageSpinner label="Signing you in…" />
  }

  const message = redirectError
    ? authErrorMessage(redirectError.description, redirectError.code)
    : 'Sign-in didn’t finish. Please try again.'

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Couldn’t sign you in</h1>
      <p role="alert" className="max-w-md text-chalk-dim">
        {message}
      </p>
      <div className="flex gap-3">
        <Link to="/login" className="rounded-xl bg-chalk px-5 py-2.5 font-semibold text-board hover:bg-white">
          Try again
        </Link>
        <Link to="/" className="rounded-xl border border-board-line px-5 py-2.5 font-semibold text-chalk hover:border-chalk/40">
          Home
        </Link>
      </div>
    </main>
  )
}
