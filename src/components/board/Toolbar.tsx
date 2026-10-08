import { ArrowUpRight, Circle, Eraser, Hand, Minus, MousePointer2, Pencil, Square, Type, type LucideIcon } from 'lucide-react'
import { VIEWER_TOOLS } from '../../canvas/engine'
import { useUiStore, type Tool } from '../../store/uiStore'

const TOOLS: { tool: Tool; label: string; key: string; Icon: LucideIcon }[] = [
  { tool: 'select', label: 'Select', key: 'V', Icon: MousePointer2 },
  { tool: 'hand', label: 'Pan', key: 'H', Icon: Hand },
  { tool: 'pen', label: 'Pen', key: 'P', Icon: Pencil },
  { tool: 'line', label: 'Line', key: 'L', Icon: Minus },
  { tool: 'arrow', label: 'Arrow', key: 'A', Icon: ArrowUpRight },
  { tool: 'rect', label: 'Rectangle', key: 'R', Icon: Square },
  { tool: 'ellipse', label: 'Ellipse', key: 'O', Icon: Circle },
  { tool: 'text', label: 'Text', key: 'T', Icon: Type },
  { tool: 'eraser', label: 'Eraser', key: 'E', Icon: Eraser },
]

export default function Toolbar({ readOnly }: { readOnly: boolean }) {
  const active = useUiStore((s) => s.tool)
  const setTool = useUiStore((s) => s.setTool)
  const tools = readOnly ? TOOLS.filter((t) => VIEWER_TOOLS.includes(t.tool)) : TOOLS

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className="absolute top-3 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-2xl border border-board-line bg-board/90 p-1.5 shadow-xl shadow-black/40 backdrop-blur"
    >
      {tools.map(({ tool, label, key, Icon }) => (
        <button
          key={tool}
          type="button"
          onClick={() => setTool(tool)}
          aria-pressed={active === tool}
          aria-label={`${label} (${key})`}
          title={`${label} — ${key}`}
          className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl transition ${
            active === tool ? 'bg-violet text-board' : 'text-chalk-dim hover:bg-chalk/10 hover:text-chalk'
          }`}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
          <span className="absolute right-1 bottom-0.5 text-[9px] font-semibold opacity-60" aria-hidden="true">
            {key}
          </span>
        </button>
      ))}
    </div>
  )
}
