import { Loader2, PenLine, Plus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import OAuthButtons from '../components/auth/OAuthButtons'
import AppHeader from '../components/dashboard/AppHeader'
import BoardCard from '../components/dashboard/BoardCard'
import DeleteBoardDialog from '../components/dashboard/DeleteBoardDialog'
import RenameBoardDialog from '../components/dashboard/RenameBoardDialog'
import { useBoards } from '../hooks/useBoards'
import { boardErrorMessage, createBoard, type BoardWithRole } from '../lib/boards'
import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.user?.id)
  const navigate = useNavigate()
  const { boards, status: boardsStatus, error, reload, rename, remove } = useBoards(userId)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<BoardWithRole | null>(null)
  const [deleting, setDeleting] = useState<BoardWithRole | null>(null)
  const guest = status === 'guest'

  async function handleCreate() {
    setCreating(true)
    setCreateError(null)
    try {
      const board = await createBoard()
      navigate(`/b/${board.id}`)
    } catch (e) {
      setCreateError(boardErrorMessage(e))
      setCreating(false)
    }
  }

  const newBoardButton = (
    <button
      type="button"
      onClick={handleCreate}
      disabled={creating}
      className="inline-flex items-center gap-2 rounded-xl bg-chalk px-4 py-2.5 font-semibold text-board transition hover:bg-white disabled:opacity-70"
    >
      {creating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
      New board
    </button>
  )

  return (
    <div className="min-h-svh">
      <AppHeader />

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

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Your boards</h1>
          {boardsStatus === 'ready' && boards.length > 0 && newBoardButton}
        </div>
        {createError && (
          <p role="alert" className="mt-3 text-sm text-coral">
            {createError}
          </p>
        )}

        {boardsStatus === 'loading' && (
          <ul aria-label="Loading boards" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="overflow-hidden rounded-2xl border border-board-line">
                <div className="aspect-[16/10] animate-pulse bg-board-raised" />
                <div className="space-y-2 border-t border-board-line px-4 py-3">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-board-line" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-board-line" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {boardsStatus === 'error' && (
          <div role="alert" className="mt-6 rounded-2xl border border-coral/30 bg-coral/5 p-6 text-center">
            <p className="font-semibold">Couldn’t load your boards</p>
            <p className="mt-1 text-sm text-chalk-dim">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-board-line px-4 py-2 font-semibold hover:border-chalk/40"
            >
              <RotateCw className="size-4" aria-hidden="true" /> Try again
            </button>
          </div>
        )}

        {boardsStatus === 'ready' && boards.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-board-line px-6 py-16 text-center">
            <PenLine className="size-8 text-chalk-dim" aria-hidden="true" />
            <p className="mt-3 font-semibold">No boards yet</p>
            <p className="mt-1 mb-5 max-w-sm text-sm text-chalk-dim">Start one and invite people with a link.</p>
            {newBoardButton}
          </div>
        )}

        {boardsStatus === 'ready' && boards.length > 0 && (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onRename={() => setRenaming(board)}
                onDelete={() => setDeleting(board)}
              />
            ))}
          </ul>
        )}
      </main>

      <RenameBoardDialog
        title={renaming?.title ?? null}
        onClose={() => setRenaming(null)}
        onRename={(title) => rename(renaming!, title)}
      />
      <DeleteBoardDialog
        title={deleting?.title ?? null}
        onClose={() => setDeleting(null)}
        onDelete={() => remove(deleting!)}
      />
    </div>
  )
}
