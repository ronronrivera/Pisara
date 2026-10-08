import { arrowHeadLength, boxBounds, boundsIntersect, elementBounds, LINE_HEIGHT, TEXT_FONT } from './geometry'
import { tracePen } from './smoothing'
import type { BoardElement, Bounds, Drawable, Viewport } from './types'
import { visibleBounds } from './viewport'

const GRID_COLOR = '#1f332d'
const SELECTION_COLOR = '#b79bff'

/** Draws one element in world coordinates (the context is already transformed). */
export function drawElement(ctx: CanvasRenderingContext2D, el: Drawable) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (el.type) {
    case 'pen': {
      ctx.strokeStyle = el.data.stroke
      ctx.lineWidth = el.data.width
      ctx.beginPath()
      tracePen(ctx, el.data.points)
      ctx.stroke()
      return
    }
    case 'line':
    case 'arrow': {
      const { x1, y1, x2, y2, stroke, width } = el.data
      ctx.strokeStyle = stroke
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      if (el.type === 'arrow' && (x1 !== x2 || y1 !== y2)) {
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const head = arrowHeadLength(el.data)
        for (const side of [-1, 1]) {
          ctx.moveTo(x2, y2)
          ctx.lineTo(x2 - head * Math.cos(angle + side * 0.45), y2 - head * Math.sin(angle + side * 0.45))
        }
      }
      ctx.stroke()
      return
    }
    case 'rect':
    case 'ellipse': {
      const b = boxBounds(el.data)
      const w = b.maxX - b.minX
      const h = b.maxY - b.minY
      ctx.beginPath()
      if (el.type === 'rect') ctx.roundRect(b.minX, b.minY, w, h, Math.min(4, w / 2, h / 2))
      else ctx.ellipse(b.minX + w / 2, b.minY + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      if (el.data.fill !== 'transparent') {
        ctx.fillStyle = el.data.fill
        ctx.fill()
      }
      ctx.strokeStyle = el.data.stroke
      ctx.lineWidth = el.data.width
      ctx.stroke()
      return
    }
    case 'text': {
      const { x, y, text, fontSize, color } = el.data
      ctx.fillStyle = color
      ctx.font = `${fontSize}px ${TEXT_FONT}`
      ctx.textBaseline = 'top'
      // Board text is drawn on the canvas, never inserted as HTML, so it can't inject markup.
      text.split('\n').forEach((line, i) => ctx.fillText(line, x, y + i * fontSize * LINE_HEIGHT + fontSize * 0.1))
      return
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, v: Viewport, view: Bounds) {
  let spacing = 32
  while (spacing * v.zoom < 12) spacing *= 2 // keep lines from crowding when zoomed out
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1 / v.zoom
  ctx.beginPath()
  for (let x = Math.floor(view.minX / spacing) * spacing; x <= view.maxX; x += spacing) {
    ctx.moveTo(x, view.minY)
    ctx.lineTo(x, view.maxY)
  }
  for (let y = Math.floor(view.minY / spacing) * spacing; y <= view.maxY; y += spacing) {
    ctx.moveTo(view.minX, y)
    ctx.lineTo(view.maxX, y)
  }
  ctx.stroke()
}

/** Dashed box around selected elements, in world coordinates. */
export function drawSelection(ctx: CanvasRenderingContext2D, bounds: Bounds[], zoom: number) {
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1.5 / zoom
  ctx.setLineDash([6 / zoom, 4 / zoom])
  const pad = 6 / zoom
  for (const b of bounds) ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2)
  ctx.setLineDash([])
}

export function drawMarquee(ctx: CanvasRenderingContext2D, b: Bounds, zoom: number) {
  ctx.fillStyle = 'rgba(183, 155, 255, 0.08)'
  ctx.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY)
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1 / zoom
  ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY)
}

/**
 * Two stacked canvases. The static layer holds committed elements and is redrawn only
 * when they or the viewport change; the active layer holds the stroke in progress,
 * selection and marquee, and is cheap to clear every frame.
 */
export class Renderer {
  private width = 0
  private height = 0
  private dpr = 1
  private readonly staticCanvas: HTMLCanvasElement
  private readonly activeCanvas: HTMLCanvasElement

  constructor(staticCanvas: HTMLCanvasElement, activeCanvas: HTMLCanvasElement) {
    this.staticCanvas = staticCanvas
    this.activeCanvas = activeCanvas
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width
    this.height = height
    this.dpr = dpr
    for (const canvas of [this.staticCanvas, this.activeCanvas]) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
  }

  get size() {
    return { width: this.width, height: this.height }
  }

  private begin(canvas: HTMLCanvasElement, v: Viewport) {
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const s = this.dpr * v.zoom
    ctx.setTransform(s, 0, 0, s, -v.x * s, -v.y * s)
    return ctx
  }

  /** Returns how many elements were actually drawn (the rest were off screen). */
  renderStatic(elements: BoardElement[], v: Viewport, options: { hidden: Set<string>; faded: Set<string> }) {
    const ctx = this.begin(this.staticCanvas, v)
    const view = visibleBounds(v, this.width, this.height)
    drawGrid(ctx, v, view)
    let drawn = 0
    for (const el of elements) {
      if (options.hidden.has(el.id)) continue
      if (!boundsIntersect(elementBounds(el), view)) continue // skip what's off screen
      ctx.globalAlpha = options.faded.has(el.id) ? 0.25 : 1
      drawElement(ctx, el)
      drawn++
    }
    ctx.globalAlpha = 1
    return drawn
  }

  renderActive(v: Viewport, draw: (ctx: CanvasRenderingContext2D) => void) {
    draw(this.begin(this.activeCanvas, v))
  }
}
