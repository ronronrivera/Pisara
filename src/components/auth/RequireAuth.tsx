import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuthStore } from '../../store/authStore'

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center gap-3 text-chalk-dim" aria-live="polite">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      {label}
    </main>
  )
}

/** Guests and signed-in users pass; everyone else goes to /login and comes back after. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'error') {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-center text-coral" role="alert">
        {error}
      </main>
    )
  }
  if (status === 'signedOut') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return children
}
