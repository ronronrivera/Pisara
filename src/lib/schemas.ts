import { z } from 'zod'
import { stripUnsafeChars } from './safety'

// Mirrors the CHECK constraint on profiles.display_name.
export const displayNameSchema = z
  .string()
  .transform(stripUnsafeChars)
  .pipe(z.string().trim()
  .min(1, 'Enter a name so others know who’s drawing.')
  .max(40, 'Keep it to 40 characters or fewer.'))

// Mirrors the CHECK constraint on boards.title.
export const boardTitleSchema = z
  .string()
  .transform(stripUnsafeChars)
  .pipe(z.string().trim()
  .min(1, 'Give the board a name.')
  .max(80, 'Keep it to 80 characters or fewer.'))

// ---- Board elements arriving from other users -------------------------------
// Anything received over Realtime is untrusted: a modified client could send
// malformed or huge elements to crash or freeze everyone's canvas. These limits
// match what the app itself can produce, with headroom.

const coord = z.number().finite().min(-1e7).max(1e7)
const color = z.string().regex(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i)
const strokeWidth = z.number().finite().min(0.5).max(64)
const id = z.string().uuid()

const elementBase = {
  id,
  zIndex: z.number().finite(),
  version: z.number().int().min(1).max(1e9),
  updatedAt: z.number().finite(),
  updatedBy: z.string().uuid().optional(),
}

const lineData = z.object({ x1: coord, y1: coord, x2: coord, y2: coord, stroke: color, width: strokeWidth })
const boxData = z.object({
  x: coord,
  y: coord,
  w: coord,
  h: coord,
  stroke: color,
  width: strokeWidth,
  fill: z.union([z.literal('transparent'), color]),
})
export const penPointsSchema = z.array(z.tuple([coord, coord, z.number().min(0).max(1)])).min(1).max(10_000)

export const boardElementSchema = z.discriminatedUnion('type', [
  z.object({ ...elementBase, type: z.literal('pen'), data: z.object({ points: penPointsSchema, stroke: color, width: strokeWidth }) }),
  z.object({ ...elementBase, type: z.literal('line'), data: lineData }),
  z.object({ ...elementBase, type: z.literal('arrow'), data: lineData }),
  z.object({ ...elementBase, type: z.literal('rect'), data: boxData }),
  z.object({ ...elementBase, type: z.literal('ellipse'), data: boxData }),
  z.object({
    ...elementBase,
    type: z.literal('text'),
    data: z.object({ x: coord, y: coord, text: z.string().max(5000), fontSize: z.number().min(6).max(400), color }),
  }),
])

export const deletionSchema = z.object({ id, version: z.number().int().min(1).max(1e9) })
export const penDraftSchema = z.object({ id, points: penPointsSchema, stroke: color, width: strokeWidth })
export const cursorSchema = z.object({ x: coord, y: coord })
