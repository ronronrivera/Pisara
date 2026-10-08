import { Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useUiStore } from '../../store/uiStore'
import OAuthButtons from './OAuthButtons'

/** "What should we call you?": starts a guest session, or offers Google/GitHub instead. */
export default function NameDialog() {
  const next = useUiStore((s) => s.nameDialogNext)
  const close = useUiStore((s) => s.closeNameDialog)
  const dialog = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (next !== null && !d.open) {
      setError(null)
      d.showModal()
    } else if (next === null && d.open) {
      d.close()
    }
  }, [next])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    // Validation and auth load on first submit, keeping them out of the landing bundle.
    const [{ displayNameSchema }, auth] = await Promise.all([import('../../lib/schemas'), import('../../lib/auth')])
    const parsed = displayNameSchema.safeParse(name)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setPending(false)
      return
    }
    try {
      await auth.signInAsGuest(parsed.data)
      const target = next ?? '/boards'
      close()
      navigate(target)
    } catch (err) {
      setError(auth.authErrorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(e) => e.target === dialog.current && close()} // click on backdrop
      aria-labelledby="name-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-board-line bg-board p-0 text-chalk shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 id="name-dialog-title" className="font-display text-2xl font-bold">
            What should we call you?
          </h2>
          <button type="button" onClick={close} aria-label="Close" className="-m-1 rounded-lg p-1 text-chalk-dim hover:text-chalk">
            <X className="size-5" />
          </button>
        </div>
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
        <OAuthButtons mode="signIn" next={next ?? '/boards'} />
      </div>
    </dialog>
  )
}
