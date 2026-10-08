import { hitTest } from '../geometry'
import type { Point } from '../types'
import type { EngineApi, ToolHandler } from './types'

/** Drag across elements to erase them; they fade while you drag and go on release. */
export function eraserTool(engine: EngineApi, onErase: (ids: string[]) => void): ToolHandler {
  let erasing: Set<string> | null = null
  let last: Point | null = null

  function sweep(p: Point) {
    if (!erasing) return
    const tol = engine.tolerance()
    // Sample between pointer events so fast swipes don't skip thin strokes.
    const steps = last ? Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / tol)) : 1
    const from = last ?? p
    for (let i = 1; i <= steps; i++) {
      const q = { x: from.x + ((p.x - from.x) * i) / steps, y: from.y + ((p.y - from.y) * i) / steps }
      for (const el of engine.sorted()) if (!erasing.has(el.id) && hitTest(el, q, tol)) erasing.add(el.id)
    }
    last = p
    engine.setFaded(erasing)
  }

  return {
    cursor: 'cell',
    down(p) {
      erasing = new Set()
      last = null
      sweep(p)
    },
    move(p) {
      sweep(p)
    },
    up() {
      if (erasing?.size) onErase([...erasing])
      erasing = null
      engine.setFaded(new Set())
    },
    cancel() {
      erasing = null
      engine.setFaded(new Set())
    },
  }
}
