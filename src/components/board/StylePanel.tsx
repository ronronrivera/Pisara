import { Palette, X } from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { restyleSelection } from '../../canvas/actions'
import { useBoardStore } from '../../store/boardStore'
import type { BoardElement } from '../../canvas/types'
import { FONT_SIZES, STROKE_COLORS, STROKE_WIDTHS, useUiStore, type DrawStyle } from '../../store/uiStore'

const COLOR_NAMES: Record<string, string> = {
  '#ece9df': 'Chalk',
  '#ff7a6b': 'Coral',
  '#5cc8ff': 'Sky',
  '#b6f36a': 'Lime',
  '#ffc04d': 'Amber',
  '#b79bff': 'Violet',
}

function styleOf(el: BoardElement, fallback: DrawStyle): DrawStyle {
  if (el.type === 'text') return { ...fallback, stroke: el.data.color, fontSize: el.data.fontSize }
  const filled = el.type === 'rect' || el.type === 'ellipse' ? el.data.fill !== 'transparent' : fallback.filled
  return { ...fallback, stroke: el.data.stroke, width: el.data.width, filled }
}

/**
 * Color, width, fill and text size. Changes apply to the next thing you draw,
 * and to the current selection (as one undo step).
 */
export default function StylePanel() {
  const style = useUiStore((s) => s.style)
  const setStyle = useUiStore((s) => s.setStyle)
  const tool = useUiStore((s) => s.tool)
  // useShallow: the selector builds a new array, so compare contents, not identity.
  const selected = useBoardStore(useShallow((s) => s.selection.map((id) => s.elements[id]?.type).filter(Boolean)))
  const first = useBoardStore((s) => (s.selection.length ? s.elements[s.selection[0]] : undefined))
  const [openOnMobile, setOpenOnMobile] = useState(false)

  const drawing = !['select', 'hand', 'eraser'].includes(tool)
  if (!drawing && selected.length === 0) return null

  // With a selection (and no drawing tool), show the selected element's style, not the last one used.
  const shown: DrawStyle = drawing || !first ? style : styleOf(first, style)
  const types = new Set(drawing ? [tool] : selected)
  const showWidth = [...types].some((t) => t !== 'text')
  const showFill = types.has('rect') || types.has('ellipse')
  const showFont = types.has('text')

  const update = (patch: Partial<DrawStyle>) => {
    setStyle(patch)
    restyleSelection(patch)
  }

  const chip = (active: boolean) =>
    `flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition ${
      active ? 'bg-chalk text-board' : 'text-chalk-dim hover:bg-chalk/10 hover:text-chalk'
    }`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenOnMobile(true)}
        aria-label="Style"
        className={`absolute top-[4.5rem] left-3 z-10 flex size-10 items-center justify-center rounded-xl border border-board-line bg-board/90 sm:hidden ${openOnMobile ? 'hidden' : ''}`}
      >
        <Palette className="size-5" style={{ color: shown.stroke }} aria-hidden="true" />
      </button>

      <section
        aria-label="Style"
        className={`absolute top-[4.5rem] left-3 z-10 w-48 space-y-4 rounded-2xl border border-board-line bg-board/90 p-3 shadow-xl shadow-black/40 backdrop-blur ${
          openOnMobile ? '' : 'max-sm:hidden'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenOnMobile(false)}
          aria-label="Close style panel"
          className="absolute top-2 right-2 rounded p-1 text-chalk-dim sm:hidden"
        >
          <X className="size-4" />
        </button>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-wide text-chalk-dim uppercase">Color</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {STROKE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => update({ stroke: color })}
                aria-label={COLOR_NAMES[color]}
                aria-pressed={shown.stroke === color}
                className={`size-6 rounded-full border-2 transition ${shown.stroke === color ? 'border-chalk scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </fieldset>

        {showWidth && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-chalk-dim uppercase">Stroke</legend>
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(STROKE_WIDTHS).map(([name, width]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => update({ width })}
                  aria-label={`${name} stroke`}
                  aria-pressed={shown.width === width}
                  className={chip(shown.width === width)}
                >
                  <span className="w-6 rounded-full bg-current" style={{ height: Math.max(2, width / 1.5) }} />
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {showFill && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-chalk-dim uppercase">Fill</legend>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={() => update({ filled: false })} aria-pressed={!shown.filled} className={chip(!shown.filled)}>
                None
              </button>
              <button type="button" onClick={() => update({ filled: true })} aria-pressed={shown.filled} className={chip(shown.filled)}>
                Tinted
              </button>
            </div>
          </fieldset>
        )}

        {showFont && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-chalk-dim uppercase">Text size</legend>
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(FONT_SIZES).map(([name, size]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => update({ fontSize: size })}
                  aria-label={`${name} text`}
                  aria-pressed={shown.fontSize === size}
                  className={chip(shown.fontSize === size)}
                >
                  {name === 'small' ? 'S' : name === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </section>
    </>
  )
}
