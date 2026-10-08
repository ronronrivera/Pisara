import type { Bounds, Point, Viewport } from './types'

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

export const screenToWorld = (v: Viewport, p: Point): Point => ({ x: p.x / v.zoom + v.x, y: p.y / v.zoom + v.y })

export const worldToScreen = (v: Viewport, p: Point): Point => ({ x: (p.x - v.x) * v.zoom, y: (p.y - v.y) * v.zoom })

/** Zoom by `factor` while keeping the world point under `screenPoint` fixed. */
export function zoomAt(v: Viewport, screenPoint: Point, factor: number): Viewport {
  const zoom = clampZoom(v.zoom * factor)
  const anchor = screenToWorld(v, screenPoint)
  return { zoom, x: anchor.x - screenPoint.x / zoom, y: anchor.y - screenPoint.y / zoom }
}

/** Pan by a screen-space distance. */
export const panBy = (v: Viewport, dx: number, dy: number): Viewport => ({ ...v, x: v.x - dx / v.zoom, y: v.y - dy / v.zoom })

/** The world area visible in a `width × height` screen. */
export const visibleBounds = (v: Viewport, width: number, height: number): Bounds => ({
  minX: v.x,
  minY: v.y,
  maxX: v.x + width / v.zoom,
  maxY: v.y + height / v.zoom,
})
