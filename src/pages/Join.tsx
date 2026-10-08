import { Loader2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import NameDialog from '../components/auth/NameDialog'
import OAuthButtons from '../components/auth/OAuthButtons'
import { FullPageSpinner } from '../components/auth/RequireAuth'
import Logo from '../components/landing/Logo'
import { joinBoard, peekInvite, sharingErrorMessage, type InvitePreview } from '../lib/sharing'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

type Preview = { status: 'loading' } | { status: 'invalid' } | { status: 'ready'; invite: InvitePreview }

const TOKEN = /^[A-Za-z0-9_-]{16,64}$/

/**
 * /join/:token — shows who invited you to what. Signed-in visitors join right away;
 * everyone else picks a guest name or signs in, comes back here, and then joins.
 */
export default function Join() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const openNameDialog = useUiStore((s) => s.openNameDialog)
  const [preview, setPreview] = useState<Preview>({ status: 'loading' })
  const [joinError, setJoinError] = useState<string | null>(null)
  const joining = useRef(false)
  const valid = TOKEN.test(token)
  const here = `/join/${token}`

  useEffect(() => {
    if (!valid) return
    let current = true
    peekInvite(token)
      .then((invite) => current && setPreview(invite ? { status: 'ready', invite } : { status: 'invalid' }))
      .catch(() => current && setPreview({ status: 'invalid' }))
    return () => {
      current = false
    }
  }, [token, valid])

  const signedIn = status === 'guest' || status === 'member'

  // Once signed in (now or after coming back from sign-in), join and open the board.
  useEffect(() => {
    if (!signedIn || preview.status !== 'ready' || joining.current) return
    joining.current = true
    joinBoard(token)
      .then(({ boardId }) => navigate(`/b/${boardId}`, { replace: true }))
      .catch((e: unknown) => {
        joining.current = false
        setJoinError(sharingErrorMessage(e))
      })
  }, [signedIn, preview.status, token, navigate])

  const view: Preview = valid ? preview : { status: 'invalid' }

  if (view.status === 'loading' || status === 'loading') return <FullPageSpinner label="Opening invite…" />

  if (view.status === 'invalid') {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
        <Logo />
        <h1 className="mt-6 font-display text-3xl font-bold">This invite link doesn’t work</h1>
        <p className="max-w-md text-chalk-dim">It may have been reset or turned off. Ask the person who shared it for a new link.</p>
        <Link to="/" className="mt-4 rounded-xl bg-chalk px-5 py-2.5 font-semibold text-board hover:bg-white">
          Go to Pisara
        </Link>
      </main>
    )
  }

  const { invite } = view
  const role = invite.linkRole === 'viewer' ? 'a viewer' : 'an editor'

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-board-line bg-board-raised/70 p-6 sm:p-8">
        <Logo />
        <span className="mt-8 flex size-11 items-center justify-center rounded-xl bg-lime/15 text-lime">
          <Users className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold break-words">
          {invite.ownerName} invited you to “{invite.title}”
        </h1>
        <p className="mt-2 text-chalk-dim">You’ll join as {role}.</p>

        {joinError && (
          <p role="alert" className="mt-4 text-sm text-coral">
            {joinError}
          </p>
        )}

        {signedIn ? (
          !joinError && (
            <p className="mt-6 flex items-center gap-2 text-chalk-dim" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Joining…
            </p>
          )
        ) : (
          <>
            <button
              type="button"
              onClick={() => openNameDialog(here)}
              className="mt-6 w-full rounded-xl bg-chalk px-5 py-3 font-semibold text-board transition hover:bg-white"
            >
              Join as a guest
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-chalk-dim">
              <span className="h-px flex-1 bg-board-line" />
              or sign in to keep it in your boards
              <span className="h-px flex-1 bg-board-line" />
            </div>
            <OAuthButtons mode="signIn" next={here} />
          </>
        )}
      </div>
      <NameDialog />
    </main>
  )
}
