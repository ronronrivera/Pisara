import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Modal from '../ui/Modal'

interface DeleteBoardDialogProps {
  /** Title of the board to delete; null when closed */
  title: string | null
  onClose: () => void
  onDelete: () => Promise<void>
}

export default function DeleteBoardDialog({ title, onClose, onDelete }: DeleteBoardDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await onDelete()
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t delete the board.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={title !== null}
      onClose={close}
      labelledBy="delete-board-title"
      describedBy="delete-board-body"
      dismissible={!pending}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-coral/15 text-coral">
        <Trash2 className="size-5" aria-hidden="true" />
      </span>
      <h2 id="delete-board-title" className="mt-4 pr-8 font-display text-2xl font-bold break-words">
        Delete “{title}”?
      </h2>
      <p id="delete-board-body" className="mt-2 text-chalk-dim">
        This permanently deletes the board and everything on it, for everyone it’s shared with. You can’t undo this.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-coral">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-board-line pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          autoFocus
          onClick={close}
          disabled={pending}
          className="rounded-xl border border-board-line px-4 py-2.5 font-semibold text-chalk hover:border-chalk/40 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-4 py-2.5 font-semibold text-board hover:brightness-110 disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Delete board
        </button>
      </div>
    </Modal>
  )
}
