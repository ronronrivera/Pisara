// The board is a set of independent elements; every stroke, shape or text box is one.
// Coordinates are in world units, so panning and zooming never change element data.

export type ElementType = 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text'

export interface StrokeStyle {
  stroke: string
  width: number
}

/** [x, y, pressure] */
export type PenPoint = [number, number, number]

export interface PenData extends StrokeStyle {
  points: PenPoint[]
}

export interface LineData extends StrokeStyle {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface BoxData extends StrokeStyle {
  x: number
  y: number
  w: number
  h: number
  /** 'transparent' or a color */
  fill: string
}

export interface TextData {
  x: number
  y: number
  text: string
  fontSize: number
  color: string
}

interface Base<T extends ElementType, D> {
  /** UUID generated on the client so shapes appear before the database answers */
  id: string
  type: T
  data: D
  zIndex: number
  /** Bumped on every change; the database will use it to reject stale updates */
  version: number
  updatedAt: number
  /** User id of whoever made this version (used to break ties between simultaneous edits) */
  updatedBy?: string
}

export type BoardElement =
  | Base<'pen', PenData>
  | Base<'line', LineData>
  | Base<'arrow', LineData>
  | Base<'rect', BoxData>
  | Base<'ellipse', BoxData>
  | Base<'text', TextData>

/** Just what's needed to draw an element (e.g. a stroke still in progress). */
export type Drawable = {
  [T in ElementType]: Pick<Extract<BoardElement, { type: T }>, 'type' | 'data'>
}[ElementType]

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Pan offset (world position of the screen's top-left corner) and zoom factor. */
export interface Viewport {
  x: number
  y: number
  zoom: number
}
