import type { RealtimeChannel } from '@supabase/supabase-js'
import type { CanvasEngine } from '../canvas/engine'
import { drawElement } from '../canvas/renderer'
import type { PenDraft } from '../canvas/tools/types'
import type { BoardElement, Point } from '../canvas/types'
import type { MemberRole } from '../lib/boards'
import { boardElementSchema, cursorSchema, deletionSchema, penDraftSchema } from '../lib/schemas'
import { supabase } from '../lib/supabase'
import { onLocalChange, setBoardActor, useBoardStore, type SyncBatch } from '../store/boardStore'
import { usePresenceStore, type Peer } from '../store/presenceStore'

const CURSOR_INTERVAL_MS = 50 // design doc: cursors at most 1 per 50 ms
const STROKE_INTERVAL_MS = 30 // design doc: in-progress strokes at most 1 per 30 ms
const MAX_CHUNK_BYTES = 120_000 // stay well under Realtime's message size limit

interface Options {
  boardId: string
  me: Peer
}

export interface RealtimeHandlers {
  onRenamed: (title: string) => void
  /** Someone's role changed (null = removed). The board page refetches when it's me. */
  onMembershipChanged: (userId: string, role: MemberRole | null) => void
}

/** Leading + trailing throttle: the first and the latest value always get through. */
function throttle<T>(ms: number, fn: (value: T) => void) {
  let last = 0
  let pending: { value: T } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = () => {
    timer = null
    if (!pending) return
    last = Date.now()
    fn(pending.value)
    pending = null
  }
  const call = (value: T) => {
    pending = { value }
    const wait = ms - (Date.now() - last)
    if (wait <= 0) flush()
    else timer ??= setTimeout(flush, wait)
  }
  call.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }
  return call
}

/** Split a list so each JSON message stays under the size limit. */
function chunk<T>(items: T[]): T[][] {
  const chunks: T[][] = []
  let current: T[] = []
  let size = 0
  for (const item of items) {
    const bytes = JSON.stringify(item).length
    if (current.length && size + bytes > MAX_CHUNK_BYTES) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(item)
    size += bytes
  }
  if (current.length) chunks.push(current)
  return chunks
}

/** Keep only well-formed elements; anything else from the network is dropped. */
function validElements(raw: unknown): BoardElement[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const parsed = boardElementSchema.safeParse(item)
    return parsed.success ? [parsed.data as BoardElement] : []
  })
}

function validDeletes(raw: unknown): SyncBatch['deletes'] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const parsed = deletionSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

const canBroadcast = (role: MemberRole) => role === 'owner' || role === 'editor'

/**
 * One board's private Realtime channel ("board:<id>"). Broadcast carries every change
 * to others instantly; presence says who's online. The database decides who may join
 * and who may broadcast, so a viewer's client can't send drawing events even if modified.
 *
 * Until saving exists, someone joining gets the current board from a member who is
 * already there (the editor with the lowest user id answers, so only one does).
 */
export class BoardRealtime {
  private channel: RealtimeChannel | null = null
  private engine: CanvasEngine | null = null
  private initialSyncDone = false
  private closed = false
  /** Bumped by every connect/close, so a connect that finishes late can tell it's stale */
  private generation = 0
  private readonly cleanups: (() => void)[] = []
  private readonly options: Options
  private handlers: RealtimeHandlers = { onRenamed: () => {}, onMembershipChanged: () => {} }

  constructor(options: Options) {
    this.options = options
  }

  /** Latest callbacks from the board page (updated after every render). */
  setHandlers(handlers: RealtimeHandlers) {
    this.handlers = handlers
  }

  private get me() {
    return this.options.me
  }

  async connect() {
    const generation = ++this.generation
    this.closed = false
    usePresenceStore.getState().reset()
    setBoardActor(this.me.userId)
    await supabase.realtime.setAuth() // private channels authorize with the user's JWT
    // A close() or newer connect() happened while we waited (e.g. React StrictMode).
    if (generation !== this.generation) return

    const channel = supabase.channel(`board:${this.options.boardId}`, {
      config: { private: true, broadcast: { self: false }, presence: { key: this.me.userId, enabled: true } },
    })
    this.channel = channel

    channel
      .on('broadcast', { event: 'element:upsert' }, ({ payload }) => {
        const upserts = validElements(payload?.elements)
        if (!upserts.length) return
        useBoardStore.getState().applyRemote({ upserts, deletes: [] })
        this.clearDrafts(upserts.map((el) => el.id))
      })
      .on('broadcast', { event: 'element:delete' }, ({ payload }) => {
        const deletes = validDeletes(payload?.deletes)
        if (deletes.length) useBoardStore.getState().applyRemote({ upserts: [], deletes })
      })
      .on('broadcast', { event: 'state:snapshot' }, ({ payload }) => {
        if (payload?.to !== this.me.userId) return
        useBoardStore.getState().applyRemote({ upserts: validElements(payload.elements), deletes: validDeletes(payload.deletes) })
      })
      .on('broadcast', { event: 'stroke:progress' }, ({ payload }) => {
        const from = typeof payload?.userId === 'string' ? payload.userId : null
        if (!from || from === this.me.userId) return
        const drafts = { ...usePresenceStore.getState().drafts }
        const parsed = payload.draft === null ? null : penDraftSchema.safeParse(payload.draft)
        if (parsed === null) delete drafts[from]
        else if (parsed.success) drafts[from] = parsed.data as PenDraft
        else return
        usePresenceStore.setState({ drafts })
        this.engine?.requestActive()
      })
      .on('broadcast', { event: 'cursor:move' }, ({ payload }) => {
        const from = typeof payload?.userId === 'string' ? payload.userId : null
        if (!from || from === this.me.userId) return
        const cursors = { ...usePresenceStore.getState().cursors }
        const parsed = payload.point === null ? null : cursorSchema.safeParse(payload.point)
        if (parsed === null) delete cursors[from]
        else if (parsed.success) cursors[from] = parsed.data
        else return
        usePresenceStore.setState({ cursors })
      })
      .on('broadcast', { event: 'board:renamed' }, ({ payload }) => {
        if (typeof payload?.title === 'string' && payload.title.length <= 80) this.handlers.onRenamed(payload.title)
      })
      .on('broadcast', { event: 'member:updated' }, ({ payload }) => {
        const role = payload?.role
        if (typeof payload?.userId !== 'string') return
        if (role === null || role === 'editor' || role === 'viewer' || role === 'owner') {
          this.handlers.onMembershipChanged(payload.userId, role)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        this.initialSyncDone = true
        this.updatePeers()
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        // Joins delivered with the initial state are people already here, not newcomers.
        if (this.initialSyncDone && key !== this.me.userId) this.maybeSendSnapshot(key)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (channel.presenceState()[key]?.length) return // still open in another tab
        const { cursors, drafts } = usePresenceStore.getState()
        const nextCursors = { ...cursors }
        const nextDrafts = { ...drafts }
        delete nextCursors[key]
        delete nextDrafts[key]
        usePresenceStore.setState({ cursors: nextCursors, drafts: nextDrafts })
        this.engine?.requestActive()
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          usePresenceStore.setState({ status: 'live' })
          await channel.track({ ...this.me })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          usePresenceStore.setState({ status: 'reconnecting' })
          this.initialSyncDone = false // the next presence state is a fresh snapshot
        } else if (status === 'CLOSED' && !this.closed) {
          usePresenceStore.setState({ status: 'offline' })
        }
      })

    if (canBroadcast(this.me.role)) {
      this.cleanups.push(
        onLocalChange(({ upserts, deletes }) => {
          for (const part of chunk(upserts)) this.send('element:upsert', { elements: part })
          for (const part of chunk(deletes)) this.send('element:delete', { deletes: part })
        }),
      )
    }
  }

  /** Wire the canvas: my cursor and strokes go out, others' strokes are drawn in. */
  attachEngine(engine: CanvasEngine | null) {
    this.engine = engine
  }

  /** Draws other people's in-progress strokes (called by the engine's active layer). */
  drawOverlay = (ctx: CanvasRenderingContext2D) => {
    ctx.globalAlpha = 0.85
    for (const draft of Object.values(usePresenceStore.getState().drafts)) {
      drawElement(ctx, { type: 'pen', data: draft })
    }
    ctx.globalAlpha = 1
  }

  sendCursor = throttle<Point | null>(CURSOR_INTERVAL_MS, (point) => {
    if (canBroadcast(this.me.role)) this.send('cursor:move', { userId: this.me.userId, point })
  })

  private sendStrokeNow = (draft: PenDraft | null) => {
    if (canBroadcast(this.me.role)) this.send('stroke:progress', { userId: this.me.userId, draft })
  }
  private sendStrokeThrottled = throttle<PenDraft>(STROKE_INTERVAL_MS, this.sendStrokeNow)

  sendStroke = (draft: PenDraft | null) => {
    if (draft) {
      this.sendStrokeThrottled(draft)
    } else {
      this.sendStrokeThrottled.cancel() // the finished element follows right after
      this.sendStrokeNow(null)
    }
  }

  sendRenamed(title: string) {
    this.send('board:renamed', { title })
  }

  sendMemberUpdated(userId: string, role: MemberRole | null) {
    this.send('member:updated', { userId, role })
  }

  async close() {
    this.generation++
    this.closed = true
    this.sendCursor.cancel()
    this.sendStrokeThrottled.cancel()
    this.cleanups.splice(0).forEach((fn) => fn())
    setBoardActor(undefined)
    if (this.channel) await supabase.removeChannel(this.channel)
    this.channel = null
    usePresenceStore.getState().reset()
  }

  // ---------------------------------------------------------------------------

  private send(event: string, payload: Record<string, unknown>) {
    if (!this.channel || this.closed) return
    void this.channel.send({ type: 'broadcast', event, payload })
  }

  private updatePeers() {
    if (!this.channel) return
    const state = this.channel.presenceState<Peer>()
    const peers = Object.values(state)
      .map((metas) => metas[0])
      .filter((p): p is Peer & { presence_ref: string } => typeof p?.userId === 'string')
      .map(({ userId, name, color, avatarUrl, isGuest, role }) => ({ userId, name, color, avatarUrl, isGuest, role }))
      .sort((a, b) => (a.userId === this.me.userId ? -1 : b.userId === this.me.userId ? 1 : a.name.localeCompare(b.name)))
    usePresenceStore.setState({ peers })
  }

  /** Exactly one editor (lowest user id, excluding the newcomer) sends them the board. */
  private maybeSendSnapshot(newcomer: string) {
    if (!canBroadcast(this.me.role)) return
    const responders = usePresenceStore
      .getState()
      .peers.filter((p) => p.userId !== newcomer && canBroadcast(p.role))
      .map((p) => p.userId)
      .sort()
    if ((responders[0] ?? this.me.userId) !== this.me.userId) return

    const { elements, tombstones } = useBoardStore.getState()
    const upserts = Object.values(elements)
    const deletes = Object.entries(tombstones).map(([id, version]) => ({ id, version }))
    if (!upserts.length && !deletes.length) return
    for (const part of chunk(upserts)) this.send('state:snapshot', { to: newcomer, elements: part, deletes: [] })
    for (const part of chunk(deletes)) this.send('state:snapshot', { to: newcomer, elements: [], deletes: part })
  }

  private clearDrafts(ids: string[]) {
    const drafts = usePresenceStore.getState().drafts
    const done = Object.entries(drafts).filter(([, d]) => ids.includes(d.id))
    if (!done.length) return
    const next = { ...drafts }
    for (const [userId] of done) delete next[userId]
    usePresenceStore.setState({ drafts: next })
    this.engine?.requestActive()
  }
}
