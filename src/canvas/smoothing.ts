import type { PenPoint } from './types'

/** Ramer–Douglas–Peucker: drop points that barely change the stroke's shape. */
export function simplify(points: PenPoint[], epsilon: number): PenPoint[] {
  if (points.length <= 2) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]

  while (stack.length) {
    const [start, end] = stack.pop()!
    const [ax, ay] = points[start]
    const [bx, by] = points[end]
    const dx = bx - ax
    const dy = by - ay
    const length = Math.hypot(dx, dy)
    let maxDist = 0
    let index = -1
    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i]
      const dist = length === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / length
      if (dist > maxDist) {
        maxDist = dist
        index = i
      }
    }
    if (maxDist > epsilon && index !== -1) {
      keep[index] = 1
      stack.push([start, index], [index, end])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** Traces a smooth stroke through the points using quadratic curves between midpoints. */
export function tracePen(ctx: CanvasRenderingContext2D | Path2D, points: PenPoint[]) {
  const [x0, y0] = points[0]
  ctx.moveTo(x0, y0)
  if (points.length === 1) {
    ctx.lineTo(x0 + 0.01, y0) // a dot: round caps make it visible
    return
  }
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    const [nx, ny] = points[i + 1]
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
  }
  const [lx, ly] = points[points.length - 1]
  ctx.lineTo(lx, ly)
}
