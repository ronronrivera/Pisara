import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, MIN_ZOOM, panBy, screenToWorld, visibleBounds, worldToScreen, zoomAt } from '../../src/canvas/viewport'

describe('viewport', () => {
  const v = { x: 100, y: -50, zoom: 2 }

  it('round-trips screen ↔ world', () => {
    const p = { x: 37, y: 412 }
    expect(worldToScreen(v, screenToWorld(v, p))).toEqual(p)
  })

  it('keeps the point under the cursor fixed while zooming', () => {
    const cursor = { x: 300, y: 200 }
    const before = screenToWorld(v, cursor)
    const after = screenToWorld(zoomAt(v, cursor, 1.7), cursor)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('clamps zoom', () => {
    expect(zoomAt(v, { x: 0, y: 0 }, 1000).zoom).toBe(MAX_ZOOM)
    expect(zoomAt(v, { x: 0, y: 0 }, 0.0001).zoom).toBe(MIN_ZOOM)
  })

  it('pans by screen pixels regardless of zoom', () => {
    const moved = panBy(v, 40, -20)
    expect(worldToScreen(moved, screenToWorld(v, { x: 0, y: 0 }))).toEqual({ x: 40, y: -20 })
  })

  it('reports the visible world area', () => {
    expect(visibleBounds(v, 800, 600)).toEqual({ minX: 100, minY: -50, maxX: 500, maxY: 250 })
  })
})
