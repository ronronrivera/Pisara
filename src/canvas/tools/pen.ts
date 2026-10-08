import { drawElement } from '../renderer'
import { simplify } from '../smoothing'
import type { PenPoint } from '../types'
import { round, type EngineApi, type PenDraft, type ToolHandler } from './types'

const pressureOf = (e: PointerEvent) => (e.pointerType === 'pen' && e.pressure > 0 ? round(e.pressure) : 0.5)

export function penTool(engine: EngineApi): ToolHandler {
  let points: PenPoint[] | null = null
  let stroke = ''
  let width = 0
  let id = ''

  const draft = (): PenDraft | null => (points ? { id, points, stroke, width } : null)

  return {
    cursor: 'crosshair',
    down(p, e) {
      ;({ stroke, width } = engine.style())
      id = crypto.randomUUID() // chosen now, so others' live preview and the final stroke match
      points = [[p.x, p.y, pressureOf(e)]]
      engine.strokeProgress(draft())
      engine.requestActive()
    },
    move(p, e) {
      if (!points) return
      const [lx, ly] = points[points.length - 1]
      if (Math.hypot(p.x - lx, p.y - ly) < 0.75 / engine.zoom()) return // ignore sub-pixel jitter
      points.push([p.x, p.y, pressureOf(e)])
      engine.strokeProgress(draft())
      engine.requestActive()
    },
    up() {
      if (!points) return
      // Fewer points = smaller saves; the tolerance scales so strokes look the same at any zoom.
      const simplified = simplify(points, 0.5 / engine.zoom()).map(([x, y, pr]) => [round(x), round(y), pr] as PenPoint)
      engine.addElement({ type: 'pen', data: { points: simplified, stroke, width } }, id)
      points = null
      engine.strokeProgress(null)
      engine.requestActive()
    },
    cancel() {
      if (points) engine.strokeProgress(null)
      points = null
      engine.requestActive()
    },
    drawActive(ctx) {
      if (points) drawElement(ctx, { type: 'pen', data: { points, stroke, width } })
    },
  }
}
