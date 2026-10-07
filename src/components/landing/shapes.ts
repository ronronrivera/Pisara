// Plain 2D geometry shared by the 3D scenes and their static SVG posters.
// Units are "board units": the hero board is 7 × 4.4, the how-it-works board is 5 × 3.4,
// both centered on (0, 0) with +y pointing up.

import { MARKERS, type ShapeKind } from './data'

export type Pt = [number, number]

export const HERO_BOARD = { width: 7, height: 4.4 }
export const DIAGRAM_BOARD = { width: 5, height: 3.4 }

/** Evenly spaced points along a polyline, so a trail grows at constant speed. */
export function resample(points: Pt[], count: number): Pt[] {
  const lengths = [0]
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]
    const [bx, by] = points[i]
    lengths.push(lengths[i - 1] + Math.hypot(bx - ax, by - ay))
  }
  const total = lengths[lengths.length - 1]
  const out: Pt[] = []
  let seg = 0
  for (let k = 0; k < count; k++) {
    const d = (total * k) / (count - 1)
    while (seg < points.length - 2 && lengths[seg + 1] < d) seg++
    const span = lengths[seg + 1] - lengths[seg] || 1
    const t = Math.min(1, (d - lengths[seg]) / span)
    const [ax, ay] = points[seg]
    const [bx, by] = points[seg + 1]
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t])
  }
  return out
}

export const rectPoints = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y1],
  [x1, y1],
  [x1, y0],
  [x0, y0],
  [x0, y1],
]

export const ellipsePoints = (cx: number, cy: number, rx: number, ry: number, n = 64): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    // Start at the top and go clockwise, like a hand-drawn circle.
    const a = Math.PI / 2 - (i / n) * Math.PI * 2
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt
  })

export function arrowPoints(from: Pt, to: Pt, head = 0.4): Pt[] {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0])
  const wing = (offset: number): Pt => [
    to[0] - Math.cos(angle + offset) * head,
    to[1] - Math.sin(angle + offset) * head,
  ]
  // Shaft, then one wing out and back, then the other wing.
  return [from, to, wing(0.5), to, wing(-0.5)]
}

export const squigglePoints = (x0: number, x1: number, y: number, amp: number, waves = 2.5, n = 80): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return [x0 + (x1 - x0) * t, y + Math.sin(t * waves * Math.PI * 2) * amp] as Pt
  })

/** Hero: each collaborator draws one of these on the board. */
export const HERO_SHAPES: Record<ShapeKind, Pt[]> = {
  rect: rectPoints(-2.9, 0.4, -1.0, 1.6),
  circle: ellipsePoints(1.7, 0.9, 0.75, 0.75),
  arrow: arrowPoints([-2.6, -1.5], [-0.5, -0.4]),
  squiggle: squigglePoints(0.4, 2.9, -1.2, 0.28),
}

export const TRAIL_POINTS = 120

export const heroTrail = (kind: ShapeKind) => resample(HERO_SHAPES[kind], TRAIL_POINTS)

/** How it works: a small diagram whose elements lift off into layers. */
export interface DiagramElement {
  kind: 'rect' | 'ellipse' | 'arrow' | 'pen' | 'text'
  label: string
  color: string
  /** Anchor (center) on the board */
  x: number
  y: number
  /** Layer card size */
  w: number
  h: number
  /** Outline relative to the anchor (unused for text) */
  points: Pt[]
}

export const DIAGRAM_ELEMENTS: DiagramElement[] = [
  {
    kind: 'rect',
    label: 'rect · v3',
    color: MARKERS.sky,
    x: -1.45,
    y: 0.7,
    w: 1.4,
    h: 0.85,
    points: rectPoints(-0.7, -0.42, 0.7, 0.42),
  },
  {
    kind: 'arrow',
    label: 'arrow · v1',
    color: MARKERS.coral,
    x: 0,
    y: 0.7,
    w: 1.0,
    h: 0.5,
    points: arrowPoints([-0.45, 0], [0.45, 0], 0.22),
  },
  {
    kind: 'ellipse',
    label: 'ellipse · v2',
    color: MARKERS.lime,
    x: 1.45,
    y: 0.7,
    w: 1.4,
    h: 0.9,
    points: ellipsePoints(0, 0, 0.66, 0.4),
  },
  {
    kind: 'text',
    label: 'text · v2',
    color: '#ece9df',
    x: -1.3,
    y: -0.8,
    w: 1.6,
    h: 0.8,
    points: [],
  },
  {
    kind: 'pen',
    label: 'pen · v4',
    color: MARKERS.amber,
    x: 1.25,
    y: -0.8,
    w: 1.7,
    h: 0.7,
    points: squigglePoints(-0.75, 0.75, 0, 0.18, 2),
  },
]

/** Text elements are drawn as three "lines of writing": [x offset, y offset, width]. */
export const TEXT_BARS: [number, number, number][] = [
  [-0.62, 0.22, 1.3],
  [-0.62, 0, 0.9],
  [-0.62, -0.22, 1.1],
]

/** Classic pointer outline with the tip at (0, 0), in board units, +y up. */
export const CURSOR_OUTLINE: Pt[] = [
  [0, 0],
  [0, -0.62],
  [0.15, -0.48],
  [0.26, -0.72],
  [0.36, -0.67],
  [0.25, -0.44],
  [0.45, -0.44],
]
