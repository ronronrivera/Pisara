import { Navigate, useSearchParams } from 'react-router'
import NameDialog from '../components/auth/NameDialog'
import OAuthButtons from '../components/auth/OAuthButtons'
import { FullPageSpinner } from '../components/auth/RequireAuth'
import Logo from '../components/landing/Logo'
import { safeNextPath } from '../lib/safety'
import { displayNameOf, useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

export default function Login() {
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const status = useAuthStore((s) => s.status)
  const name = useAuthStore(displayNameOf)
  const openNameDialog = useUiStore((s) => s.openNameDialog)

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'member') return <Navigate to={next} replace />

  const guest = status === 'guest'

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-board-line bg-board-raised/70 p-6 sm:p-8">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">{guest ? 'Keep your boards' : 'Sign in to Pisara'}</h1>
        <p className="mt-2 text-chalk-dim">
          {guest
            ? `You’re drawing as ${name} (guest). Connect an account and every board you made stays yours, on any device.`
            : 'Your boards follow you to any device.'}
        </p>

        <div className="mt-6">
          <OAuthButtons mode={guest ? 'link' : 'signIn'} next={next} />
        </div>

        {!guest && (
          <p className="mt-6 text-center text-sm text-chalk-dim">
            Just want to draw?{' '}
            <button type="button" onClick={() => openNameDialog(next)} className="font-semibold text-chalk underline underline-offset-4">
              Continue as a guest
            </button>
          </p>
        )}
      </div>
      <NameDialog />
    </main>
  )
}
