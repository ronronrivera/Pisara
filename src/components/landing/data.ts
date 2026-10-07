// Copy, names and colors for the landing page live here so they're easy to tweak.

export const GITHUB_URL = 'https://github.com/ronronrivera/Pisara'
export const PORTFOLIO_URL = 'https://ronronrivera.tech'

export const MARKERS = {
  coral: '#ff7a6b',
  sky: '#5cc8ff',
  lime: '#b6f36a',
  amber: '#ffc04d',
  violet: '#b79bff',
} as const

export type ShapeKind = 'rect' | 'circle' | 'arrow' | 'squiggle'

export interface Collaborator {
  name: string
  color: string
  shape: ShapeKind
  /** Seconds per draw → fade → redraw loop */
  period: number
  /** 0..1 offset so cursors don't move in lockstep */
  phase: number
}

export const COLLABORATORS: Collaborator[] = [
  { name: 'Ana', color: MARKERS.coral, shape: 'rect', period: 7.2, phase: 0 },
  { name: 'Miguel', color: MARKERS.sky, shape: 'circle', period: 6.4, phase: 0.35 },
  { name: 'Jo', color: MARKERS.lime, shape: 'arrow', period: 6.8, phase: 0.6 },
  { name: 'Kai', color: MARKERS.amber, shape: 'squiggle', period: 7.6, phase: 0.15 },
]

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Under the hood', href: '#under-the-hood' },
]

export const HOW_IT_WORKS_STEPS = [
  {
    title: 'Draw',
    body: 'Pen, shapes, arrows and text on an infinite canvas. Sketch a flow, a wireframe or a diagram in seconds.',
  },
  {
    title: 'Every shape is its own element',
    body: 'Each stroke, box and label is stored separately with its own version number, so two people editing different shapes never collide.',
  },
  {
    title: 'Synced to everyone',
    body: 'Changes are broadcast to everyone on the board right away, then saved to Postgres in small batches. Close the tab and it’s all still there.',
  },
]
