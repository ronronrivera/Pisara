import { Loader2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import OAuthButtons from './OAuthButtons'

interface GuestSignOutDialogProps {
  open: boolean
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Warns a guest that signing out loses their boards, and offers to keep them first. */
export default function GuestSignOutDialog({ open, pending, onCancel, onConfirm }: GuestSignOutDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onClose={onCancel}
      onClick={(e) => e.target === dialog.current && !pending && onCancel()} // click on backdrop
      aria-labelledby="guest-signout-title"
      aria-describedby="guest-signout-body"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-board-line bg-board p-0 text-chalk shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-amber">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </span>
          <button type="button" onClick={onCancel} aria-label="Close" className="-m-1 rounded-lg p-1 text-chalk-dim hover:text-chalk">
            <X className="size-5" />
          </button>
        </div>

        <h2 id="guest-signout-title" className="mt-4 font-display text-2xl font-bold">
          Sign out of your guest account?
        </h2>
        <p id="guest-signout-body" className="mt-2 text-chalk-dim">
          Guests can’t sign back in to the same account, so you’ll lose access to every board you made as a guest.
        </p>

        <p className="mt-5 text-sm font-semibold">Keep your boards instead:</p>
        <div className="mt-2">
          <OAuthButtons mode="link" />
        </div>

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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-4 py-2.5 font-semibold text-board hover:brightness-110 disabled:opacity-70"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Sign out anyway
          </button>
        </div>
      </div>
    </dialog>
  )
}
