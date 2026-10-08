import { create } from 'zustand'
import type { BoardElement, Viewport } from '../canvas/types'

/** One element before and after a change. null = didn't exist / was deleted. */
export interface Change {
  id: string
  before: BoardElement | null
  after: BoardElement | null
}

/** What changed, as other users need to hear it: full elements, and deletions with their version. */
export interface SyncBatch {
  upserts: BoardElement[]
  deletes: { id: string; version: number }[]
}

/** A user action: everything it changed, so it can be undone or redone as a unit. */
type HistoryEntry = Change[]

const HISTORY_LIMIT = 200

interface BoardState {
  elements: Record<string, BoardElement>
  /** Last known version of each deleted element, so a stale update can't resurrect it */
  tombstones: Record<string, number>
  selection: string[]
  viewport: Viewport
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]

  /** Fresh, empty board (called when opening a board). */
  reset: () => void
  /** Apply an action and record it for undo. Versions are bumped here. */
  commit: (changes: Change[]) => void
  /** Apply without recording or broadcasting, e.g. live previews while dragging. */
  preview: (elements: BoardElement[]) => void
  undo: () => void
  redo: () => void
  /** Merge changes from another user (last writer wins by version). Never recorded or re-sent. */
  applyRemote: (batch: SyncBatch) => void
  setSelection: (ids: string[]) => void
  setViewport: (viewport: Viewport) => void
}

const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 }

// ---- Local change feed (consumed by real-time sync) ---------------------------

let actor: string | undefined
/** Who local changes are attributed to (element.updatedBy). */
export const setBoardActor = (userId: string | undefined) => {
  actor = userId
}

type Listener = (batch: SyncBatch) => void
const listeners = new Set<Listener>()
/** Called after every local commit, undo and redo, with exactly what changed. */
export function onLocalChange(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Writes the target state of each change. Every write is a normal upsert or delete
 * with a bumped version, which is exactly what gets broadcast to other users.
 */
function apply(
  state: Pick<BoardState, 'elements' | 'tombstones'>,
  targets: { id: string; element: BoardElement | null }[],
) {
  const elements = { ...state.elements }
  const tombstones = { ...state.tombstones }
  const batch: SyncBatch = { upserts: [], deletes: [] }
  const now = Date.now()
  for (const { id, element } of targets) {
    const last = Math.max(elements[id]?.version ?? 0, tombstones[id] ?? 0)
    if (element === null) {
      if (!elements[id]) continue
      delete elements[id]
      tombstones[id] = last + 1
      batch.deletes.push({ id, version: last + 1 })
    } else {
      // Never go backwards: restoring a deleted element continues from its last version.
      const next = { ...element, version: Math.max(last, element.version) + 1, updatedAt: now, updatedBy: actor }
      elements[id] = next
      delete tombstones[id]
      batch.upserts.push(next)
    }
  }
  return { elements, tombstones, batch }
}

const emit = (batch: SyncBatch) => {
  if (batch.upserts.length || batch.deletes.length) listeners.forEach((fn) => fn(batch))
}

/**
 * Deterministic winner between two writes of the same version (two people edited the
 * same element at once). Every client picks the same one, so everyone converges.
 */
const beats = (a: BoardElement, b: BoardElement) =>
  a.version !== b.version
    ? a.version > b.version
    : a.updatedAt !== b.updatedAt
      ? a.updatedAt > b.updatedAt
      : (a.updatedBy ?? '') > (b.updatedBy ?? '')

const pruneSelection = (selection: string[], elements: Record<string, BoardElement>) =>
  selection.filter((id) => id in elements)

export const useBoardStore = create<BoardState>((set, get) => ({
  elements: {},
  tombstones: {},
  selection: [],
  viewport: initialViewport,
  undoStack: [],
  redoStack: [],

  reset: () =>
    set({ elements: {}, tombstones: {}, selection: [], viewport: initialViewport, undoStack: [], redoStack: [] }),

  commit: (changes) => {
    const meaningful = changes.filter((c) => c.before !== null || c.after !== null)
    if (meaningful.length === 0) return
    const { elements, tombstones, batch } = apply(get(), meaningful.map((c) => ({ id: c.id, element: c.after })))
    set({
      elements,
      tombstones,
      selection: pruneSelection(get().selection, elements),
      undoStack: [...get().undoStack, meaningful].slice(-HISTORY_LIMIT),
      redoStack: [],
    })
    emit(batch)
  },

  preview: (list) => {
    const elements = { ...get().elements }
    for (const el of list) elements[el.id] = el
    set({ elements })
  },

  undo: () => {
    const entry = get().undoStack.at(-1)
    if (!entry) return
    const { elements, tombstones, batch } = apply(get(), entry.map((c) => ({ id: c.id, element: c.before })))
    set({
      elements,
      tombstones,
      selection: pruneSelection(get().selection, elements),
      undoStack: get().undoStack.slice(0, -1),
      redoStack: [...get().redoStack, entry],
    })
    emit(batch)
  },

  redo: () => {
    const entry = get().redoStack.at(-1)
    if (!entry) return
    const { elements, tombstones, batch } = apply(get(), entry.map((c) => ({ id: c.id, element: c.after })))
    set({
      elements,
      tombstones,
      selection: pruneSelection(get().selection, elements),
      undoStack: [...get().undoStack, entry],
      redoStack: get().redoStack.slice(0, -1),
    })
    emit(batch)
  },

  applyRemote: ({ upserts, deletes }) => {
    const { elements: current, tombstones: currentTombs } = get()
    let elements = current
    let tombstones = currentTombs
    const write = () => {
      if (elements === current) elements = { ...current }
      if (tombstones === currentTombs) tombstones = { ...currentTombs }
    }
    for (const incoming of upserts) {
      const mine = elements[incoming.id]
      if ((tombstones[incoming.id] ?? 0) >= incoming.version) continue // deleted at this version or later
      if (mine && !beats(incoming, mine)) continue
      write()
      elements[incoming.id] = incoming
      delete tombstones[incoming.id]
    }
    for (const { id, version } of deletes) {
      const mine = elements[id]
      if (mine && mine.version > version) continue // edited after that delete
      if ((tombstones[id] ?? 0) >= version && !mine) continue
      write()
      delete elements[id]
      tombstones[id] = Math.max(tombstones[id] ?? 0, version)
    }
    if (elements !== current || tombstones !== currentTombs) {
      set({ elements, tombstones, selection: pruneSelection(get().selection, elements) })
    }
  },

  setSelection: (ids) => set({ selection: ids }),
  setViewport: (viewport) => set({ viewport }),
}))

/** Elements in paint order, bottom to top. */
export const sortedElements = (elements: Record<string, BoardElement>) =>
  Object.values(elements).sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))

export const nextZIndex = (elements: Record<string, BoardElement>) =>
  Object.values(elements).reduce((max, el) => Math.max(max, el.zIndex), 0) + 1
