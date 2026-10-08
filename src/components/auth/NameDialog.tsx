import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useUiStore } from '../../store/uiStore'
import Modal from '../ui/Modal'
import OAuthButtons from './OAuthButtons'

/** "What should we call you?": starts a guest session, or offers Google/GitHub instead. */
export default function NameDialog() {
  const next = useUiStore((s) => s.nameDialogNext)
  const close = useUiStore((s) => s.closeNameDialog)
  const [pending, setPending] = useState(false)

  return (
    <Modal open={next !== null} onClose={close} labelledBy="name-dialog-title" dismissible={!pending}>
      {/* Remounts on every open, so the form starts fresh. */}
      <NameForm next={next ?? '/boards'} onDone={close} onPendingChange={setPending} />
    </Modal>
  )
}

function NameForm({
  next,
  onDone,
  onPendingChange,
}: {
  next: string
  onDone: () => void
  onPendingChange: (pending: boolean) => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function busy(value: boolean) {
    setPending(value)
    onPendingChange(value)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    busy(true)
    setError(null)
    // Validation and auth load on first submit, keeping them out of the landing bundle.
    const [{ displayNameSchema }, auth] = await Promise.all([import('../../lib/schemas'), import('../../lib/auth')])
    const parsed = displayNameSchema.safeParse(name)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      busy(false)
      return
    }
    try {
      await auth.signInAsGuest(parsed.data)
      busy(false)
      onDone()
      navigate(next)
    } catch (err) {
      setError(auth.authErrorMessage(err))
      busy(false)
    }
  }

  return (
    <>
      <h2 id="name-dialog-title" className="pr-8 font-display text-2xl font-bold">
        What should we call you?
      </h2>
      <p className="mt-1.5 text-sm text-chalk-dim">Your name shows next to your cursor. No account needed.</p>

      <form onSubmit={submit} noValidate className="mt-5">
        <label htmlFor="guest-name" className="sr-only">
          Your name
        </label>
        <input
          id="guest-name"
          autoFocus
          autoComplete="nickname"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ana"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'guest-name-error' : undefined}
          className="w-full rounded-xl border border-board-line bg-board-raised px-4 py-3 text-chalk placeholder:text-chalk-dim/60 focus:border-chalk/40 focus:outline-none"
        />
        {error && (
          <p id="guest-name-error" role="alert" className="mt-2 text-sm text-coral">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-chalk px-5 py-3 font-semibold text-board transition hover:bg-white disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Start drawing
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-chalk-dim">
        <span className="h-px flex-1 bg-board-line" />
        or sign in to keep boards on any device
        <span className="h-px flex-1 bg-board-line" />
      </div>
      <OAuthButtons mode="signIn" next={next} />
    </>
  )
}
