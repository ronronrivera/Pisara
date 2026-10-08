import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** id of the element that names the dialog (usually its h2) */
  labelledBy: string
  describedBy?: string
  /** false while an action is running: Esc, the backdrop and ✕ do nothing */
  dismissible?: boolean
  children: ReactNode
}

/**
 * Native <dialog> shown with showModal(): the browser handles the focus trap,
 * Esc, inert background and the backdrop. Parents control it with `open`.
 */
export default function Modal({ open, onClose, labelledBy, describedBy, dismissible = true, children }: ModalProps) {
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
      // Esc fires "cancel": keep the dialog in React's hands instead of letting it close itself.
      onCancel={(e) => {
        e.preventDefault()
        if (dismissible) onClose()
      }}
      onClick={(e) => e.target === dialog.current && dismissible && onClose()} // backdrop click
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-board-line bg-board p-0 text-chalk shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          disabled={!dismissible}
          aria-label="Close"
          className="absolute top-5 right-5 rounded-lg p-1 text-chalk-dim hover:text-chalk disabled:opacity-40"
        >
          <X className="size-5" />
        </button>
        {open && children}
      </div>
    </dialog>
  )
}
