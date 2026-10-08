import type { BoardElement, BoxData, Bounds, LineData, Point, TextData } from './types'

export const LINE_HEIGHT = 1.25
export const TEXT_FONT = 'Inter, ui-sans-serif, system-ui, sans-serif'

let measureCtx: CanvasRenderingContext2D | null = null

/** Width and height of a text element, measured with the same font the renderer uses. */
export function measureText(data: TextData) {
  const lines = data.text.split('\n')
  measureCtx ??= document.createElement('canvas').getContext('2d')
  let width = 0
  if (measureCtx) {
    measureCtx.font = `${data.fontSize}px ${TEXT_FONT}`
    for (const line of lines) width = Math.max(width, measureCtx.measureText(line).width)
  } else {
    width = Math.max(...lines.map((l) => l.length)) * data.fontSize * 0.6
  }
  return { width, height: lines.length * data.fontSize * LINE_HEIGHT }
}

export const boxBounds = ({ x, y, w, h }: Pick<BoxData, 'x' | 'y' | 'w' | 'h'>): Bounds => ({
  minX: Math.min(x, x + w),
  minY: Math.min(y, y + h),
  maxX: Math.max(x, x + w),
  maxY: Math.max(y, y + h),
})

const pad = (b: Bounds, n: number): Bounds => ({ minX: b.minX - n, minY: b.minY - n, maxX: b.maxX + n, maxY: b.maxY + n })

export function elementBounds(el: BoardElement): Bounds {
  switch (el.type) {
    case 'pen': {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const [x, y] of el.data.points) {
        minX = Math.min(minX, x); minY = Math.min(minY, y)
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
      }
      return pad({ minX, minY, maxX, maxY }, el.data.width / 2)
    }
    case 'line':
    case 'arrow': {
      const { x1, y1, x2, y2, width } = el.data
      // Arrow heads stick out past the line.
      const extra = el.type === 'arrow' ? arrowHeadLength(el.data) : width / 2
      return pad({ minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) }, extra)
    }
    case 'rect':
    case 'ellipse':
      return pad(boxBounds(el.data), el.data.width / 2)
    case 'text': {
      const { width, height } = measureText(el.data)
      return { minX: el.data.x, minY: el.data.y, maxX: el.data.x + width, maxY: el.data.y + height }
    }
  }
}

export const boundsIntersect = (a: Bounds, b: Bounds) =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY

export const unionBounds = (list: Bounds[]): Bounds | null =>
  list.length === 0
    ? null
    : list.reduce((a, b) => ({
        minX: Math.min(a.minX, b.minX),
        minY: Math.min(a.minY, b.minY),
        maxX: Math.max(a.maxX, b.maxX),
        maxY: Math.max(a.maxY, b.maxY),
      }))

export const arrowHeadLength = (d: Pick<LineData, 'width'>) => Math.max(12, d.width * 3.5)

export function distanceToSegment(p: Point, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / lengthSq))
  return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy))
}

/** Is `p` on (or, for filled shapes, inside) the element? `tolerance` is in world units. */
export function hitTest(el: BoardElement, p: Point, tolerance: number): boolean {
  switch (el.type) {
    case 'pen': {
      const reach = tolerance + el.data.width / 2
      const pts = el.data.points
      if (pts.length === 1) return Math.hypot(p.x - pts[0][0], p.y - pts[0][1]) <= reach
      for (let i = 1; i < pts.length; i++) {
        if (distanceToSegment(p, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= reach) return true
      }
      return false
    }
    case 'line':
    case 'arrow': {
      const { x1, y1, x2, y2, width } = el.data
      return distanceToSegment(p, x1, y1, x2, y2) <= tolerance + width / 2
    }
    case 'rect': {
      const b = boxBounds(el.data)
      const reach = tolerance + el.data.width / 2
      const inside = p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY
      if (inside && el.data.fill !== 'transparent') return true
      return (
        distanceToSegment(p, b.minX, b.minY, b.maxX, b.minY) <= reach ||
        distanceToSegment(p, b.maxX, b.minY, b.maxX, b.maxY) <= reach ||
        distanceToSegment(p, b.maxX, b.maxY, b.minX, b.maxY) <= reach ||
        distanceToSegment(p, b.minX, b.maxY, b.minX, b.minY) <= reach
      )
    }
    case 'ellipse': {
      const b = boxBounds(el.data)
      const rx = (b.maxX - b.minX) / 2
      const ry = (b.maxY - b.minY) / 2
      if (rx < 0.5 || ry < 0.5) return distanceToSegment(p, b.minX, b.minY, b.maxX, b.maxY) <= tolerance
      const nx = (p.x - (b.minX + rx)) / rx
      const ny = (p.y - (b.minY + ry)) / ry
      const r = Math.hypot(nx, ny)
      if (r <= 1 && el.data.fill !== 'transparent') return true
      // Approximate distance to the outline in world units.
      return Math.abs(r - 1) * Math.min(rx, ry) <= tolerance + el.data.width / 2
    }
    case 'text': {
      const b = elementBounds(el)
      return p.x >= b.minX - tolerance && p.x <= b.maxX + tolerance && p.y >= b.minY - tolerance && p.y <= b.maxY + tolerance
    }
  }
}

/** Topmost element under the point, or null. `elements` must be sorted bottom → top. */
export function elementAt(elements: BoardElement[], p: Point, tolerance: number): BoardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTest(elements[i], p, tolerance)) return elements[i]
  }
  return null
}

/** A copy of the element moved by (dx, dy). */
export function translate<E extends BoardElement>(el: E, dx: number, dy: number): E {
  switch (el.type) {
    case 'pen':
      return { ...el, data: { ...el.data, points: el.data.points.map(([x, y, p]) => [x + dx, y + dy, p]) } }
    case 'line':
    case 'arrow':
      return { ...el, data: { ...el.data, x1: el.data.x1 + dx, y1: el.data.y1 + dy, x2: el.data.x2 + dx, y2: el.data.y2 + dy } }
    case 'rect':
    case 'ellipse':
    case 'text':
      return { ...el, data: { ...el.data, x: el.data.x + dx, y: el.data.y + dy } }
  }
}
