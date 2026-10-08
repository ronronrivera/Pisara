import { nextZIndex, sortedElements, useBoardStore } from '../store/boardStore'
import { useUiStore, type DrawStyle, type Tool } from '../store/uiStore'
import { elementAt, elementBounds } from './geometry'
import { drawSelection, Renderer } from './renderer'
import { eraserTool } from './tools/eraser'
import { penTool } from './tools/pen'
import { selectTool } from './tools/select'
import { shapeTool } from './tools/shape'
import { textTool } from './tools/text'
import type { EngineApi, PenDraft, TextEditTarget, ToolHandler } from './tools/types'
import type { BoardElement, Point } from './types'
import { panBy, screenToWorld, zoomAt } from './viewport'

/** Tools a viewer may use: they can look around and select, but not change anything. */
export const VIEWER_TOOLS: Tool[] = ['select', 'hand']

const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  h: 'hand',
  p: 'pen',
  l: 'line',
  r: 'rect',
  o: 'ellipse',
  a: 'arrow',
  t: 'text',
  e: 'eraser',
}

const HIT_TOLERANCE_PX = 6

interface EngineOptions {
  readOnly: boolean
  /** Open (target) or close (null) the text editor overlay */
  onTextEdit: (target: TextEditTarget | null) => void
  /** My in-progress pen stroke, for live sharing */
  onStrokeProgress?: (draft: PenDraft | null) => void
  /** Pointer position in world coordinates, or null when it leaves the canvas */
  onPointerWorld?: (point: Point | null) => void
  /** Extra drawing on the active layer (e.g. other people's strokes in progress) */
  drawOverlay?: (ctx: CanvasRenderingContext2D) => void
}

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

/**
 * Owns the two canvases and all input. Lives outside React: it reads the stores
 * directly and draws in requestAnimationFrame only when something is dirty, so
 * drawing never waits on component renders.
 */
export class CanvasEngine implements EngineApi {
  readonly readOnly: boolean
  private readonly renderer: Renderer
  private readonly tools: Partial<Record<Tool, ToolHandler>> = {}
  private session: { tool: ToolHandler; pointerId: number } | null = null
  private pan: { x: number; y: number; pointerId: number } | null = null
  private pinch: { distance: number; center: Point } | null = null
  private readonly touches = new Map<number, Point>()
  private spaceHeld = false
  private faded = new Set<string>()
  private editing: TextEditTarget | null = null
  private sortedCache: { source: Record<string, BoardElement>; list: BoardElement[] } | null = null
  private staticDirty = true
  private activeDirty = true
  private frame = 0
  private readonly cleanups: (() => void)[] = []
  private readonly container: HTMLElement
  private readonly activeCanvas: HTMLCanvasElement
  private readonly options: EngineOptions

  constructor(container: HTMLElement, staticCanvas: HTMLCanvasElement, activeCanvas: HTMLCanvasElement, options: EngineOptions) {
    this.container = container
    this.activeCanvas = activeCanvas
    this.options = options
    this.readOnly = options.readOnly
    this.renderer = new Renderer(staticCanvas, activeCanvas)

    const listen = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Window,
      type: K,
      handler: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, handler as EventListener, opts)
      this.cleanups.push(() => target.removeEventListener(type, handler as EventListener, opts))
    }
    listen(activeCanvas, 'pointerdown', this.onPointerDown)
    listen(activeCanvas, 'pointermove', this.onPointerMove)
    listen(activeCanvas, 'pointerup', this.onPointerUp)
    listen(activeCanvas, 'pointercancel', this.onPointerUp)
    listen(activeCanvas, 'dblclick', this.onDoubleClick)
    listen(activeCanvas, 'contextmenu', (e) => e.preventDefault())
    listen(activeCanvas, 'pointerleave', () => this.options.onPointerWorld?.(null))
    listen(container, 'wheel', this.onWheel, { passive: false })
    listen(window, 'keydown', this.onKeyDown)
    listen(window, 'keyup', this.onKeyUp)
    listen(window, 'blur', () => (this.spaceHeld = false))

    const resize = new ResizeObserver(() => this.resize())
    resize.observe(container)
    this.cleanups.push(() => resize.disconnect())
    this.resize()

    this.cleanups.push(
      useBoardStore.subscribe((state, prev) => {
        if (state.elements !== prev.elements || state.viewport !== prev.viewport) this.staticDirty = true
        this.activeDirty = true
        this.requestFrame()
      }),
      useUiStore.subscribe((state, prev) => {
        if (state.tool !== prev.tool) {
          this.session?.tool.cancel()
          this.session = null
          this.updateCursor()
          this.requestActive()
        }
      }),
    )

    if (this.readOnly && !VIEWER_TOOLS.includes(useUiStore.getState().tool)) useUiStore.getState().setTool('hand')
    this.updateCursor()

    if (import.meta.env.DEV) (window as unknown as { __pisara?: unknown }).__pisara = { board: useBoardStore, engine: this }
  }

  destroy() {
    cancelAnimationFrame(this.frame)
    this.cleanups.forEach((fn) => fn())
    if (import.meta.env.DEV) delete (window as unknown as { __pisara?: unknown }).__pisara
  }

  // ---- EngineApi (used by tools) -------------------------------------------

  zoom = () => useBoardStore.getState().viewport.zoom
  style = (): DrawStyle => useUiStore.getState().style
  tolerance = () => HIT_TOLERANCE_PX / this.zoom()

  sorted = () => {
    const elements = useBoardStore.getState().elements
    if (this.sortedCache?.source !== elements) this.sortedCache = { source: elements, list: sortedElements(elements) }
    return this.sortedCache.list
  }

  addElement = (element: Pick<BoardElement, 'type' | 'data'>, id: string = crypto.randomUUID()) => {
    const board = useBoardStore.getState()
    const created = {
      ...element,
      id,
      zIndex: nextZIndex(board.elements),
      version: 0,
      updatedAt: Date.now(),
    } as BoardElement
    board.commit([{ id: created.id, before: null, after: created }])
  }

  strokeProgress = (draft: PenDraft | null) => {
    this.options.onStrokeProgress?.(draft)
  }

  requestActive = () => {
    this.activeDirty = true
    this.requestFrame()
  }

  setFaded = (ids: Set<string>) => {
    this.faded = new Set(ids)
    this.staticDirty = true
    this.requestFrame()
  }

  editText = (target: TextEditTarget) => {
    if (this.readOnly) return
    this.editing = target
    this.staticDirty = true // hide the element being edited; the overlay shows it instead
    this.requestFrame()
    this.options.onTextEdit(target)
  }

  // ---- Public controls (used by React UI) ----------------------------------

  /** Called by the text overlay when typing ends. Empty text deletes / discards. */
  finishTextEdit(text: string) {
    const target = this.editing
    if (!target) return
    this.editing = null
    this.options.onTextEdit(null)
    this.staticDirty = true
    this.requestFrame()

    const value = text.replace(/\s+$/, '')
    const board = useBoardStore.getState()
    if (target.id === null) {
      if (value.trim()) {
        this.addElement({ type: 'text', data: { x: target.x, y: target.y, text: value, fontSize: target.fontSize, color: target.color } })
      }
      return
    }
    const before = board.elements[target.id]
    if (!before || before.type !== 'text') return
    if (!value.trim()) board.commit([{ id: before.id, before, after: null }])
    else if (value !== before.data.text) board.commit([{ id: before.id, before, after: { ...before, data: { ...before.data, text: value } } }])
  }

  /** Zoom around the middle of the canvas (zoom buttons and keyboard). */
  zoomBy(factor: number) {
    const { width, height } = this.renderer.size
    const board = useBoardStore.getState()
    board.setViewport(zoomAt(board.viewport, { x: width / 2, y: height / 2 }, factor))
  }

  resetZoom() {
    this.zoomBy(1 / this.zoom())
  }

  deleteSelection() {
    if (this.readOnly) return
    const board = useBoardStore.getState()
    const doomed = board.selection.map((id) => board.elements[id]).filter(Boolean)
    board.commit(doomed.map((before) => ({ id: before.id, before, after: null })))
  }

  // ---- Rendering -------------------------------------------------------------

  private requestFrame() {
    if (!this.frame) this.frame = requestAnimationFrame(this.draw)
  }

  private draw = () => {
    this.frame = 0
    const { viewport, selection, elements } = useBoardStore.getState()
    if (this.staticDirty) {
      this.staticDirty = false
      const hidden = new Set(this.editing?.id ? [this.editing.id] : [])
      this.renderer.renderStatic(this.sorted(), viewport, { hidden, faded: this.faded })
    }
    if (this.activeDirty) {
      this.activeDirty = false
      this.renderer.renderActive(viewport, (ctx) => {
        const bounds = selection.filter((id) => elements[id] && id !== this.editing?.id).map((id) => elementBounds(elements[id]))
        if (bounds.length) drawSelection(ctx, bounds, viewport.zoom)
        this.options.drawOverlay?.(ctx)
        this.session?.tool.drawActive?.(ctx)
      })
    }
  }

  private resize() {
    const rect = this.container.getBoundingClientRect()
    this.renderer.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2))
    this.staticDirty = this.activeDirty = true
    this.requestFrame()
  }

  // ---- Input -----------------------------------------------------------------

  private toolHandler(tool: Tool): ToolHandler | null {
    if (tool === 'hand') return null
    if (this.readOnly && !VIEWER_TOOLS.includes(tool)) return null
    return (this.tools[tool] ??= this.createTool(tool))
  }

  private createTool(tool: Exclude<Tool, 'hand'>): ToolHandler {
    switch (tool) {
      case 'select':
        return selectTool(this)
      case 'pen':
        return penTool(this)
      case 'text':
        return textTool(this)
      case 'eraser':
        return eraserTool(this, (ids) => {
          const board = useBoardStore.getState()
          board.commit(ids.map((id) => board.elements[id]).filter(Boolean).map((before) => ({ id: before.id, before, after: null })))
        })
      default:
        return shapeTool(this, tool)
    }
  }

  private screenPoint(e: { clientX: number; clientY: number }): Point {
    const rect = this.activeCanvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private worldPoint(e: { clientX: number; clientY: number }): Point {
    return screenToWorld(useBoardStore.getState().viewport, this.screenPoint(e))
  }

  private updateCursor(grabbing = false) {
    const tool = useUiStore.getState().tool
    this.activeCanvas.style.cursor =
      grabbing ? 'grabbing'
      : this.spaceHeld || tool === 'hand' ? 'grab'
      : (this.toolHandler(tool)?.cursor ?? 'default')
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 2) return
    // Canvas clicks must not move focus: the browser's default would immediately blur
    // (and so close) a text box the text tool just opened.
    e.preventDefault()
    if (this.editing) {
      // Clicking away finishes typing; the editor commits on blur.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      return
    }
    this.activeCanvas.setPointerCapture(e.pointerId)

    if (e.pointerType === 'touch') {
      this.touches.set(e.pointerId, this.screenPoint(e))
      if (this.touches.size === 2) {
        // Second finger: abandon the stroke and start pinch-zoom/pan.
        this.session?.tool.cancel()
        this.session = null
        this.pinch = this.pinchState()
        return
      }
      if (this.touches.size > 2) return
    }

    const tool = useUiStore.getState().tool
    if (e.button === 1 || this.spaceHeld || tool === 'hand' || (this.readOnly && !VIEWER_TOOLS.includes(tool))) {
      this.pan = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
      this.updateCursor(true)
      return
    }

    const handler = this.toolHandler(tool)
    if (!handler) return
    this.session = { tool: handler, pointerId: e.pointerId }
    handler.down(this.worldPoint(e), e)
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, this.screenPoint(e))
    if (e.pointerType !== 'touch') this.options.onPointerWorld?.(this.worldPoint(e))

    if (this.pinch && this.touches.size === 2) {
      const next = this.pinchState()
      const board = useBoardStore.getState()
      const zoomed = zoomAt(board.viewport, next.center, next.distance / this.pinch.distance)
      board.setViewport(panBy(zoomed, next.center.x - this.pinch.center.x, next.center.y - this.pinch.center.y))
      this.pinch = next
      return
    }

    if (this.pan?.pointerId === e.pointerId) {
      const board = useBoardStore.getState()
      board.setViewport(panBy(board.viewport, e.clientX - this.pan.x, e.clientY - this.pan.y))
      this.pan.x = e.clientX
      this.pan.y = e.clientY
      return
    }

    if (this.session?.pointerId === e.pointerId) {
      // Coalesced events give smooth strokes even when frames are dropped.
      const events = e.getCoalescedEvents?.() ?? []
      for (const ev of events.length ? events : [e]) this.session.tool.move(this.worldPoint(ev), ev)
      return
    }

    // Hovering with the select tool: show a move cursor over elements.
    if (!this.pan && !this.spaceHeld && useUiStore.getState().tool === 'select' && e.pointerType === 'mouse') {
      const over = elementAt(this.sorted(), this.worldPoint(e), this.tolerance())
      this.activeCanvas.style.cursor = over && !this.readOnly ? 'move' : 'default'
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    this.touches.delete(e.pointerId)
    if (this.pinch) {
      if (this.touches.size < 2) this.pinch = null
      return
    }
    if (this.pan?.pointerId === e.pointerId) {
      this.pan = null
      this.updateCursor()
      return
    }
    if (this.session?.pointerId === e.pointerId) {
      const { tool } = this.session
      this.session = null
      if (e.type === 'pointercancel') tool.cancel()
      else tool.up(this.worldPoint(e), e)
      this.requestActive()
    }
  }

  private onDoubleClick = (e: MouseEvent) => {
    if (this.readOnly || useUiStore.getState().tool !== 'select') return
    const hit = elementAt(this.sorted(), this.worldPoint(e), this.tolerance())
    if (hit?.type === 'text') this.editText({ id: hit.id, ...hit.data })
  }

  private pinchState() {
    const [a, b] = [...this.touches.values()]
    return { distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
    const board = useBoardStore.getState()
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+wheel, and trackpad pinch (which browsers report as ctrl+wheel).
      const delta = Math.max(-50, Math.min(50, e.deltaY * scale))
      board.setViewport(zoomAt(board.viewport, this.screenPoint(e), Math.exp(-delta * 0.01)))
    } else {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY
      board.setViewport(panBy(board.viewport, -dx * scale, -dy * scale))
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // While a text box is open, keys are for typing, never tool shortcuts, even if focus slipped.
    if (this.editing || isTypingTarget(e.target) || document.querySelector('dialog[open]')) return
    const board = useBoardStore.getState()
    const ui = useUiStore.getState()
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()

    if (e.key === ' ' && !e.repeat) {
      e.preventDefault()
      this.spaceHeld = true
      this.updateCursor()
      return
    }
    // Ctrl +/-/0 zoom the board instead of the browser page.
    if (mod && (key === '=' || key === '+' || key === '-' || key === '0')) {
      e.preventDefault()
      if (key === '0') this.resetZoom()
      else this.zoomBy(key === '-' ? 1 / 1.2 : 1.2)
      return
    }
    if (mod && key === 'a') {
      e.preventDefault()
      ui.setTool('select')
      board.setSelection(Object.keys(board.elements))
      return
    }
    if (this.readOnly) {
      if (!mod && TOOL_KEYS[key] && VIEWER_TOOLS.includes(TOOL_KEYS[key])) ui.setTool(TOOL_KEYS[key])
      return
    }
    if (mod && (key === 'z' || key === 'y')) {
      e.preventDefault()
      if (key === 'y' || e.shiftKey) board.redo()
      else board.undo()
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      this.deleteSelection()
      return
    }
    if (e.key === 'Escape') {
      this.session?.tool.cancel()
      this.session = null
      board.setSelection([])
      return
    }
    if (!mod && !e.altKey && TOOL_KEYS[key]) ui.setTool(TOOL_KEYS[key])
  }

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      this.spaceHeld = false
      this.updateCursor()
    }
  }
}
