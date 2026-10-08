import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { OAuthProvider } from '../../lib/auth'
import GitHubIcon from '../ui/GitHubIcon'
import GoogleIcon from '../ui/GoogleIcon'

const PROVIDERS: { id: OAuthProvider; label: string; Icon: typeof GitHubIcon }[] = [
  { id: 'github', label: 'GitHub', Icon: GitHubIcon },
  { id: 'google', label: 'Google', Icon: GoogleIcon },
]

interface OAuthButtonsProps {
  /** 'signIn' starts a new session; 'link' upgrades the current guest in place */
  mode: 'signIn' | 'link'
  next?: string
}

export default function OAuthButtons({ mode, next = '/boards' }: OAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function go(provider: OAuthProvider) {
    setPending(provider)
    setError(null)
    // Loaded on click so the landing page doesn't ship the auth code up front.
    const auth = await import('../../lib/auth')
    try {
      await (mode === 'link' ? auth.linkProvider(provider, next) : auth.signInWithProvider(provider, next))
      // On success the browser navigates away to the provider.
    } catch (e) {
      setError(auth.authErrorMessage(e))
      setPending(null)
    }
  }

  return (
    <div>
      <div className="grid gap-2">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            disabled={pending !== null}
            onClick={() => go(id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-board-line bg-board-raised px-4 py-2.5 font-semibold text-chalk transition hover:border-chalk/40 disabled:opacity-60"
          >
            {pending === id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Icon className="size-4" />}
            {mode === 'link' ? `Keep with ${label}` : `Continue with ${label}`}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-coral">
          {error}
        </p>
      )}
    </div>
  )
}
