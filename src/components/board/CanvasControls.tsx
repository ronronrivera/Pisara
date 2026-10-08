import { Minus, Plus, Redo2, Undo2 } from 'lucide-react'
import type { CanvasEngine } from '../../canvas/engine'
import { useBoardStore } from '../../store/boardStore'

const button =
  'flex size-9 items-center justify-center rounded-lg text-chalk-dim transition hover:bg-chalk/10 hover:text-chalk disabled:pointer-events-none disabled:opacity-35'

/** Undo/redo (your own changes only) and zoom, bottom-left. */
export default function CanvasControls({ engine, readOnly }: { engine: CanvasEngine | null; readOnly: boolean }) {
  const zoom = useBoardStore((s) => s.viewport.zoom)
  const canUndo = useBoardStore((s) => s.undoStack.length > 0)
  const canRedo = useBoardStore((s) => s.redoStack.length > 0)
  const undo = useBoardStore((s) => s.undo)
  const redo = useBoardStore((s) => s.redo)

  return (
    <div className="absolute bottom-3 left-3 z-10 flex gap-2">
      <div className="flex items-center rounded-xl border border-board-line bg-board/90 p-1 backdrop-blur">
        <button type="button" onClick={() => engine?.zoomBy(1 / 1.2)} aria-label="Zoom out" className={button}>
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => engine?.resetZoom()}
          aria-label="Reset zoom to 100%"
          title="Reset zoom (Ctrl+0)"
          className="h-9 min-w-14 rounded-lg px-1 text-xs font-medium text-chalk-dim tabular-nums hover:bg-chalk/10 hover:text-chalk"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={() => engine?.zoomBy(1.2)} aria-label="Zoom in" className={button}>
          <Plus className="size-4" />
        </button>
      </div>
      {!readOnly && (
        <div className="flex items-center rounded-xl border border-board-line bg-board/90 p-1 backdrop-blur">
          <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" className={button}>
            <Undo2 className="size-4" />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={button}>
            <Redo2 className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
