import type { DrawStyle } from '../../store/uiStore'
import type { BoardElement, PenData, Point } from '../types'

/** A pen stroke still being drawn; its id becomes the finished element's id. */
export interface PenDraft extends PenData {
  id: string
}

/** What the text editor overlay needs to open. `id` is set when editing an existing element. */
export interface TextEditTarget {
  id: string | null
  x: number
  y: number
  text: string
  fontSize: number
  color: string
}

/** The engine features tools may use. */
export interface EngineApi {
  readonly readOnly: boolean
  zoom(): number
  style(): DrawStyle
  /** Hit-test slack in world units (a fixed number of screen pixels at any zoom) */
  tolerance(): number
  /** Elements bottom → top */
  sorted(): BoardElement[]
  /** Create an element on top of everything and record it for undo. `id` lets a tool pick it up front. */
  addElement(element: Pick<BoardElement, 'type' | 'data'>, id?: string): void
  /** Share an in-progress pen stroke with others (null = abandoned or finished) */
  strokeProgress(draft: PenDraft | null): void
  requestActive(): void
  setFaded(ids: Set<string>): void
  editText(target: TextEditTarget): void
}

export interface ToolHandler {
  cursor: string
  down(p: Point, e: PointerEvent): void
  move(p: Point, e: PointerEvent): void
  up(p: Point, e: PointerEvent): void
  /** Abandon whatever is in progress (Esc, tool switch, pinch started) */
  cancel(): void
  /** Draw in-progress state on the active layer, in world coordinates */
  drawActive?(ctx: CanvasRenderingContext2D): void
}

/** Round to 2 decimals: plenty of precision, much smaller payloads. */
export const round = (n: number) => Math.round(n * 100) / 100
