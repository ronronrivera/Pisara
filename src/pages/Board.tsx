import { ArrowLeft, Pencil, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FullPageSpinner } from '../components/auth/RequireAuth'
import CanvasStage from '../components/board/CanvasStage'
import PresenceBar from '../components/board/PresenceBar'
import ShareDialog from '../components/board/ShareDialog'
import AppHeader from '../components/dashboard/AppHeader'
import RenameBoardDialog from '../components/dashboard/RenameBoardDialog'
import { useBoardRealtime } from '../hooks/useBoardRealtime'
import { boardErrorMessage, getBoard, renameBoard, type BoardWithRole } from '../lib/boards'
import { useAuthStore } from '../store/authStore'
import { useBoardStore } from '../store/boardStore'

type State =
  | { status: 'loading' }
  | { status: 'ready'; board: BoardWithRole }
  | { status: 'missing' }
  | { status: 'removed' }
  | { status: 'error'; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function Board() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const myId = useAuthStore((s) => s.user?.id ?? '')
  const [state, setState] = useState<State>({ status: 'loading' })
  const [renaming, setRenaming] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadedId, setLoadedId] = useState(id)

  // Navigating between boards reuses this component: reset during render, not in an effect.
  if (loadedId !== id) {
    setLoadedId(id)
    setState({ status: 'loading' })
  }

  // Each board starts from a clean canvas (until saving exists, content comes from people online).
  useEffect(() => {
    useBoardStore.getState().reset()
  }, [id])

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

  const board = state.status === 'ready' ? state.board : null

  const realtime = useBoardRealtime(board, {
    onRenamed: (title) => setState((s) => (s.status === 'ready' ? { ...s, board: { ...s.board, title } } : s)),
    onMembershipChanged: (userId, role) => {
      if (userId !== myId) return
      if (role === null) {
        setSharing(false)
        setState({ status: 'removed' })
        return
      }
      // My role changed: reload so permissions (and the channel's authorization) match.
      getBoard(id).then((fresh) => {
        if (!fresh) return setState({ status: 'removed' })
        setState({ status: 'ready', board: fresh })
        setNotice(fresh.role === 'viewer' ? 'You can now view this board.' : 'You can now edit this board.')
      })
    },
  })

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const view: State = UUID.test(id) ? state : { status: 'missing' }

  if (view.status === 'loading') return <FullPageSpinner label="Opening board…" />

  if (view.status !== 'ready') {
    const copy = {
      missing: ['Board not found', 'It may have been deleted, or you don’t have access. Ask the owner for an invite link.'],
      removed: ['You’re no longer on this board', 'The owner removed you, or you left. Ask them for a new invite link.'],
      error: ['Couldn’t open this board', view.status === 'error' ? view.message : ''],
    }[view.status]
    return (
      <div className="min-h-svh">
        <AppHeader />
        <main className="flex flex-col items-center px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">{copy[0]}</h1>
          <p role={view.status === 'error' ? 'alert' : undefined} className="mt-2 max-w-md text-chalk-dim">
            {copy[1]}
          </p>
          <Link to="/boards" className="mt-6 rounded-xl bg-chalk px-5 py-2.5 font-semibold text-board hover:bg-white">
            Back to your boards
          </Link>
        </main>
      </div>
    )
  }

  const current = view.board
  const owner = current.role === 'owner'

  return (
    <div className="flex h-svh flex-col">
      <AppHeader
        actions={
          <>
            <PresenceBar />
            <button
              type="button"
              onClick={() => setSharing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-chalk px-3 py-1.5 text-sm font-semibold text-board hover:bg-white"
            >
              <Share2 className="size-4" aria-hidden="true" />
              <span className="max-sm:sr-only">Share</span>
            </button>
          </>
        }
      >
        <Link
          to="/boards"
          aria-label="Back to your boards"
          className="shrink-0 rounded-lg p-1.5 text-chalk-dim hover:bg-chalk/10 hover:text-chalk"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 truncate font-display text-lg font-semibold">{current.title}</h1>
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
          <span className="shrink-0 rounded-full border border-board-line px-2 py-0.5 text-xs text-chalk-dim capitalize max-sm:hidden">
            {current.role}
          </span>
        )}
      </AppHeader>

      <CanvasStage boardId={current.id} readOnly={current.role === 'viewer'} realtime={realtime} />

      {notice && (
        <p role="status" className="fixed top-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-lime px-4 py-1.5 text-sm font-semibold text-board shadow-lg">
          {notice}
        </p>
      )}

      <ShareDialog
        open={sharing}
        onClose={() => setSharing(false)}
        board={current}
        myId={myId}
        realtime={realtime}
        onBoardChange={(patch) => setState({ status: 'ready', board: { ...current, ...patch } })}
        onLeft={() => navigate('/boards', { replace: true })}
      />

      <RenameBoardDialog
        title={renaming ? current.title : null}
        onClose={() => setRenaming(false)}
        onRename={async (title) => {
          try {
            const saved = await renameBoard(current.id, title)
            setState({ status: 'ready', board: { ...current, ...saved } })
            realtime?.sendRenamed(saved.title)
          } catch (e) {
            throw new Error(boardErrorMessage(e))
          }
        }}
      />
    </div>
  )
}
