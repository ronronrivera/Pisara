import { useEffect, useRef, useState } from 'react'
import { LINE_HEIGHT, measureText, TEXT_FONT } from '../../canvas/geometry'
import type { TextEditTarget } from '../../canvas/tools/types'
import { worldToScreen } from '../../canvas/viewport'
import { useBoardStore } from '../../store/boardStore'

interface TextEditorProps {
  target: TextEditTarget
  onDone: (text: string) => void
}

/**
 * A transparent textarea laid exactly over where the text will be drawn.
 * Enter finishes (Shift+Enter for a new line); Esc or clicking away also finishes.
 */
export default function TextEditor({ target, onDone }: TextEditorProps) {
  const viewport = useBoardStore((s) => s.viewport)
  const [text, setText] = useState(target.text)
  const ref = useRef<HTMLTextAreaElement>(null)
  const done = useRef(false)
  const openedAt = useRef(0)

  useEffect(() => {
    // Focus right away so no keystroke is lost (a stray letter would switch tools).
    openedAt.current = performance.now()
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const finish = () => {
    if (done.current) return
    done.current = true
    onDone(ref.current?.value ?? text)
  }

  const onBlur = () => {
    // Some browsers move focus away again at the tail end of the click that opened
    // the editor. That isn't the user leaving, so take focus back instead of closing.
    if (performance.now() - openedAt.current < 400 && !ref.current?.value) {
      requestAnimationFrame(() => ref.current?.focus())
      return
    }
    finish()
  }

  const pos = worldToScreen(viewport, target)
  const size = measureText({ ...target, text: text || ' ' })
  const fontPx = target.fontSize * viewport.zoom

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
          e.preventDefault()
          finish()
        }
      }}
      aria-label="Text"
      spellCheck={false}
      wrap="off"
      rows={1}
      className="absolute resize-none overflow-hidden border-0 bg-transparent p-0 whitespace-pre outline-1 outline-offset-4 outline-violet/60 outline-dashed"
      style={{
        left: pos.x,
        top: pos.y,
        width: (size.width + target.fontSize) * viewport.zoom,
        height: size.height * viewport.zoom,
        font: `${fontPx}px/${LINE_HEIGHT} ${TEXT_FONT}`,
        color: target.color,
        caretColor: target.color,
      }}
    />
  )
}
