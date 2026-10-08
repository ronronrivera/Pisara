import { fillFor } from '../../store/uiStore'
import { drawElement } from '../renderer'
import type { Drawable, Point } from '../types'
import { round, type EngineApi, type ToolHandler } from './types'

export type ShapeKind = 'line' | 'arrow' | 'rect' | 'ellipse'

/** Shift: squares/circles for boxes, 45° steps for lines. */
function constrain(kind: ShapeKind, start: Point, p: Point): Point {
  const dx = p.x - start.x
  const dy = p.y - start.y
  if (kind === 'rect' || kind === 'ellipse') {
    const size = Math.max(Math.abs(dx), Math.abs(dy))
    return { x: start.x + Math.sign(dx || 1) * size, y: start.y + Math.sign(dy || 1) * size }
  }
  const step = Math.PI / 4
  const angle = Math.round(Math.atan2(dy, dx) / step) * step
  const length = Math.hypot(dx, dy)
  return { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length }
}

export function shapeTool(engine: EngineApi, kind: ShapeKind): ToolHandler {
  let start: Point | null = null
  let end: Point | null = null

  function draft(): Drawable | null {
    if (!start || !end) return null
    const { stroke, width, filled } = engine.style()
    if (kind === 'line' || kind === 'arrow') {
      return { type: kind, data: { x1: round(start.x), y1: round(start.y), x2: round(end.x), y2: round(end.y), stroke, width } }
    }
    return {
      type: kind,
      data: {
        x: round(Math.min(start.x, end.x)),
        y: round(Math.min(start.y, end.y)),
        w: round(Math.abs(end.x - start.x)),
        h: round(Math.abs(end.y - start.y)),
        stroke,
        width,
        fill: filled ? fillFor(stroke) : 'transparent',
      },
    }
  }

  return {
    cursor: 'crosshair',
    down(p) {
      start = p
      end = p
      engine.requestActive()
    },
    move(p, e) {
      if (!start) return
      end = e.shiftKey ? constrain(kind, start, p) : p
      engine.requestActive()
    },
    up() {
      const shape = draft()
      // A click without a drag (< 3 screen px) isn't a shape.
      if (shape && start && end && Math.hypot(end.x - start.x, end.y - start.y) * engine.zoom() >= 3) {
        engine.addElement(shape)
      }
      start = end = null
      engine.requestActive()
    },
    cancel() {
      start = end = null
      engine.requestActive()
    },
    drawActive(ctx) {
      const shape = draft()
      if (shape) drawElement(ctx, shape)
    },
  }
}
