import { useBoardStore } from '../store/boardStore'
import { fillFor, type DrawStyle } from '../store/uiStore'
import type { BoardElement } from './types'

/** The element with a style change applied, or the same object if nothing applies to it. */
function restyle(el: BoardElement, patch: Partial<DrawStyle>): BoardElement {
  switch (el.type) {
    case 'text':
      return {
        ...el,
        data: { ...el.data, color: patch.stroke ?? el.data.color, fontSize: patch.fontSize ?? el.data.fontSize },
      }
    case 'rect':
    case 'ellipse': {
      const stroke = patch.stroke ?? el.data.stroke
      const filled = patch.filled ?? el.data.fill !== 'transparent'
      return {
        ...el,
        data: { ...el.data, stroke, width: patch.width ?? el.data.width, fill: filled ? fillFor(stroke) : 'transparent' },
      }
    }
    default:
      return { ...el, data: { ...el.data, stroke: patch.stroke ?? el.data.stroke, width: patch.width ?? el.data.width } } as BoardElement
  }
}

/** Restyle every selected element as one undoable step. Returns whether anything was selected. */
export function restyleSelection(patch: Partial<DrawStyle>): boolean {
  const board = useBoardStore.getState()
  const selected = board.selection.map((id) => board.elements[id]).filter(Boolean)
  if (selected.length === 0) return false
  const changes = selected
    .map((before) => ({ id: before.id, before, after: restyle(before, patch) }))
    .filter((c) => JSON.stringify(c.before.data) !== JSON.stringify(c.after.data))
  board.commit(changes)
  return true
}
