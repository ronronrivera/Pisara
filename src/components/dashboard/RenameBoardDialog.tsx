import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { boardTitleSchema } from '../../lib/schemas'
import Modal from '../ui/Modal'

interface RenameBoardDialogProps {
  /** Current title; null when closed */
  title: string | null
  onClose: () => void
  onRename: (title: string) => Promise<void>
}

export default function RenameBoardDialog({ title, onClose, onRename }: RenameBoardDialogProps) {
  const [pending, setPending] = useState(false)
  return (
    <Modal open={title !== null} onClose={onClose} labelledBy="rename-board-title" dismissible={!pending}>
      <RenameForm initial={title ?? ''} onClose={onClose} onRename={onRename} onPendingChange={setPending} />
    </Modal>
  )
}

function RenameForm({
  initial,
  onClose,
  onRename,
  onPendingChange,
}: {
  initial: string
  onClose: () => void
  onRename: (title: string) => Promise<void>
  onPendingChange: (pending: boolean) => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = boardTitleSchema.safeParse(value)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    if (parsed.data === initial) {
      onClose()
      return
    }
    setPending(true)
    onPendingChange(true)
    setError(null)
    try {
      await onRename(parsed.data)
      onPendingChange(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t rename the board.')
      setPending(false)
      onPendingChange(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="rename-board-title" className="pr-8 font-display text-2xl font-bold">
        Rename board
      </h2>
      <label htmlFor="board-title" className="mt-5 block text-sm font-medium text-chalk-dim">
        Board name
      </label>
      <input
        id="board-title"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        maxLength={80}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'board-title-error' : undefined}
        className="mt-1.5 w-full rounded-xl border border-board-line bg-board-raised px-4 py-3 text-chalk focus:border-chalk/40 focus:outline-none"
      />
      {error && (
        <p id="board-title-error" role="alert" className="mt-2 text-sm text-coral">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-xl border border-board-line px-4 py-2.5 font-semibold text-chalk hover:border-chalk/40 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-chalk px-4 py-2.5 font-semibold text-board hover:bg-white disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save
        </button>
      </div>
    </form>
  )
}
