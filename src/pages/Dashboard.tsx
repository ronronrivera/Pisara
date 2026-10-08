import { LogOut, PenLine } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import GuestSignOutDialog from '../components/auth/GuestSignOutDialog'
import OAuthButtons from '../components/auth/OAuthButtons'
import Logo from '../components/landing/Logo'
import { signOut } from '../lib/auth'
import { displayNameOf, useAuthStore } from '../store/authStore'

function Avatar({ name, url }: { name: string; url: string | null | undefined }) {
  return url ? (
    <img src={url} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="flex size-8 items-center justify-center rounded-full bg-violet font-bold text-board" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export default function Dashboard() {
  const status = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const name = useAuthStore(displayNameOf)
  const profileLoaded = useAuthStore((s) => s.profileLoaded)
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const guest = status === 'guest'
  const avatar = profile?.avatar_url ?? user?.user_metadata.avatar_url

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-board-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            {profileLoaded ? (
              <>
                <Avatar name={name} url={avatar} />
                <span className="hidden text-sm font-medium sm:inline">{name}</span>
              </>
            ) : (
              // Placeholder until the saved profile arrives, so the header doesn't flicker.
              <span className="flex items-center gap-3" aria-label="Loading profile">
                <span className="size-8 animate-pulse rounded-full bg-board-line" />
                <span className="hidden h-3.5 w-24 animate-pulse rounded bg-board-line sm:inline-block" />
              </span>
            )}
            {guest && (
              <span className="rounded-full border border-lime/40 px-2 py-0.5 text-xs text-lime">Guest</span>
            )}
            <button
              type="button"
              onClick={guest ? () => setConfirmOpen(true) : handleSignOut}
              disabled={signingOut}
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-chalk-dim hover:text-chalk disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {guest && (
          <section
            aria-labelledby="guest-banner-title"
            className="mb-10 rounded-2xl border border-amber/30 bg-amber/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6"
          >
            <div>
              <h2 id="guest-banner-title" className="font-display text-lg font-semibold">
                You’re drawing as a guest
              </h2>
              <p className="mt-1 text-sm text-chalk-dim">
                Your boards live in this browser only. Sign in to keep them on any device.
              </p>
            </div>
            <div className="mt-4 shrink-0 sm:mt-0">
              <OAuthButtons mode="link" />
            </div>
          </section>
        )}

        <h1 className="font-display text-3xl font-bold sm:text-4xl">Your boards</h1>
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-board-line px-6 py-16 text-center">
          <PenLine className="size-8 text-chalk-dim" aria-hidden="true" />
          <p className="mt-3 font-semibold">No boards yet</p>
          <p className="mt-1 max-w-sm text-sm text-chalk-dim">Creating and sharing boards is coming next.</p>
        </div>
      </main>
      <GuestSignOutDialog
        open={confirmOpen}
        pending={signingOut}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSignOut}
      />
    </div>
  )
}
