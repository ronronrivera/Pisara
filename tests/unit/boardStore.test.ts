import { beforeEach, describe, expect, it } from 'vitest'
import type { BoardElement } from '../../src/canvas/types'
import { useBoardStore } from '../../src/store/boardStore'

const box = (id: string, x = 0): BoardElement => ({
  id, type: 'rect', zIndex: 1, version: 0, updatedAt: 0,
  data: { x, y: 0, w: 10, h: 10, stroke: '#fff', width: 2, fill: 'transparent' },
})
const store = () => useBoardStore.getState()

describe('board store history', () => {
  beforeEach(() => store().reset())

  it('adds with version 1 and undoes/redoes the add', () => {
    store().commit([{ id: 'a', before: null, after: box('a') }])
    expect(store().elements.a.version).toBe(1)
    store().undo()
    expect(store().elements.a).toBeUndefined()
    store().redo()
    expect(store().elements.a).toBeDefined()
  })

  it('bumps the version on every change, including undo — versions never go backwards', () => {
    store().commit([{ id: 'a', before: null, after: box('a') }]) // v1
    const v1 = store().elements.a
    store().commit([{ id: 'a', before: v1, after: box('a', 50) }]) // v2
    expect(store().elements.a.version).toBe(2)
    store().undo() // back to x=0, but as a new change
    expect(store().elements.a.data).toMatchObject({ x: 0 })
    expect(store().elements.a.version).toBe(3)
  })

  it('restoring a deleted element continues from its last version', () => {
    store().commit([{ id: 'a', before: null, after: box('a') }])
    store().commit([{ id: 'a', before: store().elements.a, after: box('a', 9) }]) // v2
    store().commit([{ id: 'a', before: store().elements.a, after: null }]) // the delete itself is v3
    store().undo()
    expect(store().elements.a.version).toBe(4)
  })

  it('undoes a multi-element action as one step', () => {
    store().commit([
      { id: 'a', before: null, after: box('a') },
      { id: 'b', before: null, after: box('b') },
    ])
    store().commit([
      { id: 'a', before: store().elements.a, after: null },
      { id: 'b', before: store().elements.b, after: null },
    ])
    expect(Object.keys(store().elements)).toEqual([])
    store().undo()
    expect(Object.keys(store().elements).sort()).toEqual(['a', 'b'])
  })

  it('a new action clears redo, and deleted elements leave the selection', () => {
    store().commit([{ id: 'a', before: null, after: box('a') }])
    store().setSelection(['a'])
    store().undo()
    expect(store().selection).toEqual([])
    store().commit([{ id: 'b', before: null, after: box('b') }])
    expect(store().redoStack).toHaveLength(0)
  })

  it('preview changes elements without recording history', () => {
    store().commit([{ id: 'a', before: null, after: box('a') }])
    store().preview([box('a', 77)])
    expect(store().elements.a.data).toMatchObject({ x: 77 })
    expect(store().undoStack).toHaveLength(1)
  })
})

describe('merging changes from other users', () => {
  beforeEach(() => store().reset())
  const remote = (id: string, version: number, x: number, updatedBy = 'them', updatedAt = 1000): BoardElement => ({
    ...box(id, x), version, updatedAt, updatedBy,
  })

  it('applies a newer version and ignores an older one', () => {
    store().applyRemote({ upserts: [remote('a', 3, 30)], deletes: [] })
    store().applyRemote({ upserts: [remote('a', 2, 20)], deletes: [] })
    expect(store().elements.a.data).toMatchObject({ x: 30 })
  })

  it('remote changes are not added to my undo history', () => {
    store().applyRemote({ upserts: [remote('a', 1, 0)], deletes: [] })
    expect(store().undoStack).toHaveLength(0)
  })

  it('breaks same-version ties the same way on every client', () => {
    const fromAna = remote('a', 2, 10, 'ana', 5000)
    const fromBen = remote('a', 2, 99, 'ben', 5000)
    store().applyRemote({ upserts: [fromAna], deletes: [] })
    store().applyRemote({ upserts: [fromBen], deletes: [] })
    const first = store().elements.a.data
    store().reset()
    store().applyRemote({ upserts: [fromBen], deletes: [] })
    store().applyRemote({ upserts: [fromAna], deletes: [] })
    expect(store().elements.a.data).toEqual(first) // same winner regardless of arrival order
  })

  it('a stale update cannot resurrect a deleted element', () => {
    store().applyRemote({ upserts: [remote('a', 1, 0)], deletes: [] })
    store().applyRemote({ upserts: [], deletes: [{ id: 'a', version: 2 }] })
    store().applyRemote({ upserts: [remote('a', 1, 0)], deletes: [] }) // late duplicate
    expect(store().elements.a).toBeUndefined()
  })

  it('an edit made after a delete wins (e.g. someone undid the delete)', () => {
    store().applyRemote({ upserts: [remote('a', 1, 0)], deletes: [{ id: 'a', version: 2 }] })
    store().applyRemote({ upserts: [remote('a', 3, 7)], deletes: [] })
    expect(store().elements.a.data).toMatchObject({ x: 7 })
  })

  it('a delete older than my edit is ignored', () => {
    store().applyRemote({ upserts: [remote('a', 4, 0)], deletes: [] })
    store().applyRemote({ upserts: [], deletes: [{ id: 'a', version: 3 }] })
    expect(store().elements.a).toBeDefined()
  })

  it('local changes are announced with bumped versions, deletes included', async () => {
    const { onLocalChange, setBoardActor } = await import('../../src/store/boardStore')
    const seen: unknown[] = []
    setBoardActor('me')
    const stop = onLocalChange((batch) => seen.push(batch))
    store().commit([{ id: 'a', before: null, after: box('a') }])
    store().commit([{ id: 'a', before: store().elements.a, after: null }])
    store().undo()
    stop()
    setBoardActor(undefined)
    expect(seen).toEqual([
      { upserts: [expect.objectContaining({ id: 'a', version: 1, updatedBy: 'me' })], deletes: [] },
      { upserts: [], deletes: [{ id: 'a', version: 2 }] },
      { upserts: [expect.objectContaining({ id: 'a', version: 3 })], deletes: [] },
    ])
  })

  it('my undo after a remote edit still wins, as a newer version', () => {
    store().commit([{ id: 'a', before: null, after: box('a', 0) }]) // v1 mine
    store().applyRemote({ upserts: [remote('a', 2, 50)], deletes: [] }) // v2 theirs
    store().undo() // removes my add → delete at v3
    expect(store().elements.a).toBeUndefined()
    expect(store().tombstones.a).toBe(3)
  })
})
