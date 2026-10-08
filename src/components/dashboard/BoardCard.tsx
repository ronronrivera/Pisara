import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { BoardWithRole } from '../../lib/boards'
import { timeAgo } from '../../lib/time'
import BoardThumbnail from './BoardThumbnail'

interface BoardCardProps {
  board: BoardWithRole
  onRename: () => void
  onDelete: () => void
}

export default function BoardCard({ board, onRename, onDelete }: BoardCardProps) {
  const owner = board.role === 'owner'

  return (
    <li className="group relative">
      <Link
        to={`/b/${board.id}`}
        className="block overflow-hidden rounded-2xl border border-board-line bg-board-raised/70 transition hover:border-chalk/30"
      >
        <BoardThumbnail id={board.id} url={board.thumbnail_url} />
        <div className="border-t border-board-line px-4 py-3">
          <h3 className="truncate pr-8 font-semibold">{board.title}</h3>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-chalk-dim">
            <span>Edited {timeAgo(board.updated_at)}</span>
            {!owner && (
              <span className="rounded-full border border-board-line px-1.5 text-xs capitalize">{board.role}</span>
            )}
          </p>
        </div>
      </Link>
      {/* Outside the link, so the menu button isn't nested in another interactive element. */}
      {owner && <BoardMenu title={board.title} onRename={onRename} onDelete={onDelete} />}
    </li>
  )
}

function BoardMenu({ title, onRename, onDelete }: { title: string; onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const firstItem = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    firstItem.current?.focus()
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <div ref={root} className="absolute right-2 bottom-2.5">
      <button
        type="button"
        aria-label={`Options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-chalk-dim hover:bg-chalk/10 hover:text-chalk"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Options for ${title}`}
          className="absolute right-0 bottom-full z-10 mb-1 w-40 rounded-xl border border-board-line bg-board p-1 shadow-xl shadow-black/40"
        >
          <button
            ref={firstItem}
            type="button"
            role="menuitem"
            onClick={choose(onRename)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-chalk/10 focus:bg-chalk/10"
          >
            <Pencil className="size-4" aria-hidden="true" /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={choose(onDelete)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-coral hover:bg-coral/10 focus:bg-coral/10"
          >
            <Trash2 className="size-4" aria-hidden="true" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
