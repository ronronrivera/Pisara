import { describe, expect, it } from 'vitest'
import { distanceToSegment, elementAt, elementBounds, hitTest, translate } from '../../src/canvas/geometry'
import { simplify } from '../../src/canvas/smoothing'
import type { BoardElement, PenPoint } from '../../src/canvas/types'

const base = { zIndex: 1, version: 1, updatedAt: 0 }
const rect = (fill = 'transparent'): BoardElement => ({
  ...base, id: 'r', type: 'rect', data: { x: 0, y: 0, w: 100, h: 50, stroke: '#fff', width: 2, fill },
})
const ellipse: BoardElement = { ...base, id: 'e', type: 'ellipse', data: { x: 0, y: 0, w: 100, h: 50, stroke: '#fff', width: 2, fill: 'transparent' } }
const line: BoardElement = { ...base, id: 'l', type: 'line', data: { x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#fff', width: 4 } }
const pen: BoardElement = { ...base, id: 'p', type: 'pen', data: { points: [[0, 0, 0.5], [50, 50, 0.5], [100, 0, 0.5]], stroke: '#fff', width: 4 } }

describe('hit testing', () => {
  it('measures distance to a segment, including past its ends', () => {
    expect(distanceToSegment({ x: 50, y: 10 }, 0, 0, 100, 0)).toBe(10)
    expect(distanceToSegment({ x: 110, y: 0 }, 0, 0, 100, 0)).toBe(10)
  })

  it('hits an outlined rectangle on its edge but not in its middle', () => {
    expect(hitTest(rect(), { x: 50, y: 1 }, 3)).toBe(true)
    expect(hitTest(rect(), { x: 50, y: 25 }, 3)).toBe(false)
  })

  it('hits a filled rectangle anywhere inside', () => {
    expect(hitTest(rect('#ff000033'), { x: 50, y: 25 }, 3)).toBe(true)
  })

  it('hits an ellipse outline but not its empty middle', () => {
    expect(hitTest(ellipse, { x: 50, y: 0.5 }, 3)).toBe(true)
    expect(hitTest(ellipse, { x: 50, y: 25 }, 3)).toBe(false)
  })

  it('counts stroke width for lines and pen strokes', () => {
    expect(hitTest(line, { x: 50, y: 4 }, 2)).toBe(true) // 2 tolerance + 2 half-width
    expect(hitTest(line, { x: 50, y: 5 }, 2)).toBe(false)
    expect(hitTest(pen, { x: 25, y: 25 }, 2)).toBe(true)
    expect(hitTest(pen, { x: 50, y: 0 }, 2)).toBe(false)
  })

  it('returns the topmost element under the point', () => {
    const top = { ...rect('#0003'), id: 'top', zIndex: 2 }
    expect(elementAt([rect('#0003'), top], { x: 10, y: 10 }, 2)?.id).toBe('top')
    expect(elementAt([rect()], { x: 500, y: 500 }, 2)).toBeNull()
  })
})

describe('bounds and moving', () => {
  it('normalizes boxes drawn in any direction', () => {
    const flipped: BoardElement = { ...ellipse, data: { ...ellipse.data, x: 100, y: 50, w: -100, h: -50 } }
    expect(elementBounds(flipped)).toEqual({ minX: -1, minY: -1, maxX: 101, maxY: 51 })
  })

  it('translates every kind of element without touching the original', () => {
    const moved = translate(pen, 10, -5)
    expect(moved.type === 'pen' && moved.data.points[1]).toEqual([60, 45, 0.5])
    expect(pen.type === 'pen' && pen.data.points[1]).toEqual([50, 50, 0.5])
    const movedLine = translate(line, 10, 10)
    expect(movedLine.type === 'line' && [movedLine.data.x1, movedLine.data.y2]).toEqual([10, 10])
  })
})

describe('stroke simplification', () => {
  it('drops points on a straight line but keeps the ends', () => {
    const straight: PenPoint[] = Array.from({ length: 50 }, (_, i) => [i, 0, 0.5])
    expect(simplify(straight, 0.5)).toEqual([[0, 0, 0.5], [49, 0, 0.5]])
  })

  it('keeps corners', () => {
    const corner: PenPoint[] = [[0, 0, 0.5], [5, 0, 0.5], [10, 0, 0.5], [10, 5, 0.5], [10, 10, 0.5]]
    expect(simplify(corner, 0.5)).toEqual([[0, 0, 0.5], [10, 0, 0.5], [10, 10, 0.5]])
  })
})
