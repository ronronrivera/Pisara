import { useEffect, useRef, useState } from 'react'
import { CanvasEngine } from '../../canvas/engine'
import type { TextEditTarget } from '../../canvas/tools/types'
import type { BoardRealtime } from '../../realtime/boardRealtime'
import { usePresenceStore } from '../../store/presenceStore'
import CanvasControls from './CanvasControls'
import RemoteCursors from './RemoteCursors'
import StylePanel from './StylePanel'
import TextEditor from './TextEditor'
import Toolbar from './Toolbar'

interface CanvasStageProps {
  boardId: string
  readOnly: boolean
  /** The board's live channel, once connected */
  realtime: BoardRealtime | null
}

const STATUS_TEXT = {
  connecting: 'Connecting…',
  live: 'Live · not saved yet',
  reconnecting: 'Reconnecting…',
  offline: 'Offline · changes stay on this screen',
} as const

/** The drawing surface: two stacked canvases driven by CanvasEngine, plus the floating UI. */
export default function CanvasStage({ boardId, readOnly, realtime }: CanvasStageProps) {
  const container = useRef<HTMLDivElement>(null)
  const staticCanvas = useRef<HTMLCanvasElement>(null)
  const activeCanvas = useRef<HTMLCanvasElement>(null)
  const [engine, setEngine] = useState<CanvasEngine | null>(null)
  const [editing, setEditing] = useState<TextEditTarget | null>(null)
  const status = usePresenceStore((s) => s.status)
  // The engine outlives channel reconnects, so it reaches the current channel through a ref.
  const live = useRef(realtime)

  useEffect(() => {
    live.current = realtime
    realtime?.attachEngine(engine)
    return () => realtime?.attachEngine(null)
  }, [realtime, engine])

  useEffect(() => {
    const created = new CanvasEngine(container.current!, staticCanvas.current!, activeCanvas.current!, {
      readOnly,
      onTextEdit: setEditing,
      onStrokeProgress: (draft) => live.current?.sendStroke(draft),
      onPointerWorld: (point) => live.current?.sendCursor(point),
      drawOverlay: (ctx) => live.current?.drawOverlay(ctx),
    })
    setEngine(created)
    return () => {
      created.destroy()
      setEngine(null)
      setEditing(null)
    }
  }, [boardId, readOnly])

  return (
    <div
      ref={container}
      className="relative flex-1 touch-none overflow-hidden bg-[#132520] select-none"
      role="application"
      aria-label="Whiteboard canvas. Use the toolbar or keyboard shortcuts to draw."
    >
      <canvas ref={staticCanvas} className="absolute inset-0 size-full" aria-hidden="true" />
      <canvas ref={activeCanvas} className="absolute inset-0 size-full" aria-hidden="true" />
      <RemoteCursors />
      {editing && engine && (
        <TextEditor key={editing.id ?? `${editing.x},${editing.y}`} target={editing} onDone={(text) => engine.finishTextEdit(text)} />
      )}
      <Toolbar readOnly={readOnly} />
      {!readOnly && <StylePanel />}
      <CanvasControls engine={engine} readOnly={readOnly} />
      <p
        role="status"
        className="pointer-events-none absolute right-3 bottom-4 z-10 flex items-center gap-2 rounded-full border border-board-line bg-board/80 px-3 py-1 text-xs text-chalk-dim max-sm:top-[4.75rem] max-sm:bottom-auto"
      >
        <span
          className={`size-2 rounded-full ${status === 'live' ? 'bg-lime' : status === 'offline' ? 'bg-coral' : 'animate-pulse bg-amber'}`}
          aria-hidden="true"
        />
        {readOnly && status === 'live' ? 'Live · view only' : STATUS_TEXT[status]}
      </p>
    </div>
  )
}
