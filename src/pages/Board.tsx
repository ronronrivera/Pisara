import { ArrowLeft, Pencil, PenTool } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { FullPageSpinner } from '../components/auth/RequireAuth'
import AppHeader from '../components/dashboard/AppHeader'
import RenameBoardDialog from '../components/dashboard/RenameBoardDialog'
import { boardErrorMessage, getBoard, renameBoard, type BoardWithRole } from '../lib/boards'

type State =
  | { status: 'loading' }
  | { status: 'ready'; board: BoardWithRole }
  | { status: 'missing' }
  | { status: 'error'; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function Board() {
  const { id = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [renaming, setRenaming] = useState(false)
  const [loadedId, setLoadedId] = useState(id)

  // Navigating between boards reuses this component: reset during render, not in an effect.
  if (loadedId !== id) {
    setLoadedId(id)
    setState({ status: 'loading' })
  }

  useEffect(() => {
    if (!UUID.test(id)) return // malformed ids render as "missing" below without a request
    let current = true
    getBoard(id)
      .then((board) => current && setState(board ? { status: 'ready', board } : { status: 'missing' }))
      .catch((e: unknown) => current && setState({ status: 'error', message: boardErrorMessage(e) }))
    return () => {
      current = false
    }
  }, [id])

  const view: State = UUID.test(id) ? state : { status: 'missing' }

  if (view.status === 'loading') return <FullPageSpinner label="Opening board…" />

  if (view.status !== 'ready') {
    return (
      <div className="min-h-svh">
        <AppHeader />
        <main className="flex flex-col items-center px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">
            {view.status === 'missing' ? 'Board not found' : 'Couldn’t open this board'}
          </h1>
          <p role={view.status === 'error' ? 'alert' : undefined} className="mt-2 max-w-md text-chalk-dim">
            {view.status === 'missing'
              ? 'It may have been deleted, or you don’t have access. Ask the owner for an invite link.'
              : view.message}
          </p>
          <Link to="/boards" className="mt-6 rounded-xl bg-chalk px-5 py-2.5 font-semibold text-board hover:bg-white">
            Back to your boards
          </Link>
        </main>
      </div>
    )
  }

  const { board } = view
  const owner = board.role === 'owner'

  return (
    <div className="flex h-svh flex-col">
      <AppHeader>
        <Link
          to="/boards"
          aria-label="Back to your boards"
          className="shrink-0 rounded-lg p-1.5 text-chalk-dim hover:bg-chalk/10 hover:text-chalk"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 truncate font-display text-lg font-semibold">{board.title}</h1>
        {owner ? (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            aria-label="Rename board"
            className="shrink-0 rounded-lg p-1.5 text-chalk-dim hover:bg-chalk/10 hover:text-chalk"
          >
            <Pencil className="size-4" />
          </button>
        ) : (
          <span className="rounded-full border border-board-line px-2 py-0.5 text-xs text-chalk-dim capitalize">
            {board.role}
          </span>
        )}
      </AppHeader>

      {/* The drawing canvas arrives in Milestone 2. */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#132520] [background-image:linear-gradient(#23362f_1px,transparent_1px),linear-gradient(90deg,#23362f_1px,transparent_1px)] [background-size:32px_32px]">
        <div className="rounded-2xl border border-board-line bg-board/80 px-6 py-5 text-center backdrop-blur-sm">
          <PenTool className="mx-auto size-6 text-chalk-dim" aria-hidden="true" />
          <p className="mt-2 font-semibold">Drawing tools are coming soon</p>
          <p className="mt-1 text-sm text-chalk-dim">This board is saved and ready for them.</p>
        </div>
      </main>

      <RenameBoardDialog
        title={renaming ? board.title : null}
        onClose={() => setRenaming(false)}
        onRename={async (title) => {
          try {
            const saved = await renameBoard(board.id, title)
            setState({ status: 'ready', board: { ...board, ...saved } })
          } catch (e) {
            throw new Error(boardErrorMessage(e))
          }
        }}
      />
    </div>
  )
}
