import { Loader2, LogOut, TriangleAlert } from 'lucide-react'
import Modal from '../ui/Modal'
import OAuthButtons from './OAuthButtons'

interface SignOutDialogProps {
  open: boolean
  /** Guests get a stronger warning, since they can't sign back in */
  guest: boolean
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirms signing out. Guests are warned they'll lose their boards and offered
 * to keep them with GitHub or Google first.
 */
export default function SignOutDialog({ open, guest, pending, onCancel, onConfirm }: SignOutDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="signout-title" describedBy="signout-body" dismissible={!pending}>
      {guest ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-amber">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chalk/10 text-chalk">
          <LogOut className="size-5" aria-hidden="true" />
        </span>
      )}

      <h2 id="signout-title" className="mt-4 font-display text-2xl font-bold">
        {guest ? 'Sign out of your guest account?' : 'Sign out of Pisara?'}
      </h2>
      <p id="signout-body" className="mt-2 text-chalk-dim">
        {guest
          ? 'Guests can’t sign back in to the same account, so you’ll lose access to every board you made as a guest.'
          : 'Your boards are saved to your account. Sign back in with GitHub or Google any time to pick up where you left off.'}
      </p>

      {guest && (
        <>
          <p className="mt-5 text-sm font-semibold">Keep your boards instead:</p>
          <div className="mt-2">
            <OAuthButtons mode="link" />
          </div>
        </>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-board-line pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          autoFocus
          className="rounded-xl border border-board-line px-4 py-2.5 font-semibold text-chalk hover:border-chalk/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-board disabled:opacity-70 ${
            guest ? 'bg-coral hover:brightness-110' : 'bg-chalk hover:bg-white'
          }`}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {guest ? 'Sign out anyway' : 'Sign out'}
        </button>
      </div>
    </Modal>
  )
}
