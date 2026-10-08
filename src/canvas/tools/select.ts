import { useBoardStore } from '../../store/boardStore'
import { boundsIntersect, elementAt, elementBounds, translate } from '../geometry'
import { drawMarquee } from '../renderer'
import type { BoardElement, Bounds, Point } from '../types'
import type { EngineApi, ToolHandler } from './types'

type Mode =
  | { kind: 'move'; origin: Point; originals: BoardElement[]; moved: boolean }
  | { kind: 'marquee'; origin: Point; current: Point; keep: string[] }
  | null

const rectFrom = (a: Point, b: Point): Bounds => ({
  minX: Math.min(a.x, b.x),
  minY: Math.min(a.y, b.y),
  maxX: Math.max(a.x, b.x),
  maxY: Math.max(a.y, b.y),
})

/**
 * Click to select, shift-click to add/remove, drag empty space for a selection box,
 * drag a selected element to move everything selected.
 */
export function selectTool(engine: EngineApi): ToolHandler {
  let mode: Mode = null

  return {
    cursor: 'default',
    down(p, e) {
      const board = useBoardStore.getState()
      const hit = elementAt(engine.sorted(), p, engine.tolerance())

      if (!hit) {
        if (!e.shiftKey) board.setSelection([])
        mode = { kind: 'marquee', origin: p, current: p, keep: e.shiftKey ? board.selection : [] }
        return
      }

      let selection = board.selection
      if (e.shiftKey) {
        selection = selection.includes(hit.id) ? selection.filter((id) => id !== hit.id) : [...selection, hit.id]
      } else if (!selection.includes(hit.id)) {
        selection = [hit.id]
      }
      board.setSelection(selection)

      // Viewers can select (to see what's what) but not move; shift-click toggling doesn't start a drag.
      mode =
        engine.readOnly || !selection.includes(hit.id)
          ? null
          : { kind: 'move', origin: p, originals: selection.map((id) => board.elements[id]).filter(Boolean), moved: false }
    },

    move(p) {
      if (!mode) return
      const board = useBoardStore.getState()
      if (mode.kind === 'move') {
        const dx = p.x - mode.origin.x
        const dy = p.y - mode.origin.y
        if (!mode.moved && Math.hypot(dx, dy) * engine.zoom() < 3) return // a click, not a drag
        mode.moved = true
        board.preview(mode.originals.map((el) => translate(el, dx, dy)))
        return
      }
      mode.current = p
      const box = rectFrom(mode.origin, p)
      const inside = engine.sorted().filter((el) => boundsIntersect(elementBounds(el), box)).map((el) => el.id)
      board.setSelection([...new Set([...mode.keep, ...inside])])
      engine.requestActive()
    },

    up() {
      if (mode?.kind === 'move' && mode.moved) {
        const board = useBoardStore.getState()
        // One undo step for the whole drag: before = where they started, after = where they are now.
        board.commit(mode.originals.map((before) => ({ id: before.id, before, after: board.elements[before.id] ?? null })))
      }
      mode = null
      engine.requestActive()
    },

    cancel() {
      if (mode?.kind === 'move' && mode.moved) useBoardStore.getState().preview(mode.originals) // snap back
      mode = null
      engine.requestActive()
    },

    drawActive(ctx) {
      if (mode?.kind === 'marquee' && (mode.origin.x !== mode.current.x || mode.origin.y !== mode.current.y)) {
        drawMarquee(ctx, rectFrom(mode.origin, mode.current), engine.zoom())
      }
    },
  }
}
