// Static SVG stand-ins for the 3D scenes: shown while three.js loads and
// whenever the visitor prefers reduced motion. Built from the same shapes as the scenes.

import { COLLABORATORS, MARKERS } from './data'
import { CURSOR_OUTLINE, DIAGRAM_BOARD, DIAGRAM_ELEMENTS, HERO_BOARD, HERO_SHAPES, TEXT_BARS, type Pt } from './shapes'

const toPath = (points: Pt[], map: (p: Pt) => Pt) =>
  points.map((p, i) => `${i ? 'L' : 'M'}${map(p).map((n) => n.toFixed(1)).join(' ')}`).join(' ')

function Cursor({ x, y, color, name, scale = 34 }: { x: number; y: number; color: string; name: string; scale?: number }) {
  const outline = toPath(CURSOR_OUTLINE, ([px, py]) => [x + px * scale, y - py * scale]) + ' Z'
  return (
    <g>
      <path d={outline} fill={color} stroke="#0f1a17" strokeWidth={1.5} />
      <rect x={x + 13} y={y + 25} width={name.length * 7.5 + 14} height={20} rx={5} fill={color} />
      <text x={x + 20} y={y + 39} fontSize={12} fontWeight={600} fill="#0f1a17" fontFamily="Inter, sans-serif">
        {name}
      </text>
    </g>
  )
}

function GridDefs({ id, size }: { id: string; size: number }) {
  return (
    <defs>
      <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
        <path d={`M ${size} 0 L 0 0 0 ${size}`} fill="none" stroke="#2c4a40" strokeWidth={1} />
      </pattern>
    </defs>
  )
}

export function HeroPoster() {
  const W = 620
  const H = 390
  const sx = W / HERO_BOARD.width
  const sy = H / HERO_BOARD.height
  const map = ([x, y]: Pt): Pt => [40 + W / 2 + x * sx, 40 + H / 2 - y * sy]

  return (
    <div className="flex h-full w-full items-center justify-center [perspective:1200px]">
      <svg
        viewBox="0 0 700 470"
        className="w-full max-w-[680px] [transform:rotateX(22deg)_rotateY(-10deg)]"
        aria-hidden="true"
      >
        <GridDefs id="hero-grid" size={sx / 2} />
        <rect x={34} y={34} width={W + 12} height={H + 12} rx={14} fill="#0a1310" />
        <rect x={40} y={40} width={W} height={H} rx={10} fill="#132520" />
        <rect x={40} y={40} width={W} height={H} rx={10} fill="url(#hero-grid)" opacity={0.6} />
        {COLLABORATORS.map((c) => (
          <path
            key={c.name}
            d={toPath(HERO_SHAPES[c.shape], map)}
            fill="none"
            stroke={c.color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {COLLABORATORS.map((c) => {
          const pts = HERO_SHAPES[c.shape]
          const [x, y] = map(pts[Math.floor(pts.length * 0.6)])
          return <Cursor key={c.name} x={x} y={y} color={c.color} name={c.name} />
        })}
      </svg>
    </div>
  )
}

/** One frame of the "how it works" scene: 0 = flat board, 1 = layers, 2 = two synced screens. */
export function StepPoster({ step }: { step: 0 | 1 | 2 }) {
  const W = 300
  const H = (W * DIAGRAM_BOARD.height) / DIAGRAM_BOARD.width
  const s = W / DIAGRAM_BOARD.width

  const board = (ox: number, oy: number, scale: number, lift: boolean, key: string) => {
    const k = s * scale
    return (
      <g key={key}>
        <rect x={ox - 4} y={oy - 4} width={W * scale + 8} height={H * scale + 8} rx={10} fill="#0a1310" />
        <rect x={ox} y={oy} width={W * scale} height={H * scale} rx={7} fill="#132520" />
        <rect x={ox} y={oy} width={W * scale} height={H * scale} rx={7} fill="url(#step-grid)" opacity={0.5} />
        {DIAGRAM_ELEMENTS.map((el, i) => {
          // Lifted layers shift up and right, like a stack seen at an angle.
          const dx = lift ? i * 10 : 0
          const dy = lift ? -i * 14 : 0
          const cx = ox + (W * scale) / 2 + el.x * k + dx
          const cy = oy + (H * scale) / 2 - el.y * k + dy
          const map = ([x, y]: Pt): Pt => [cx + x * k, cy - y * k]
          return (
            <g key={el.label}>
              {lift && (
                <>
                  <rect
                    x={cx - ((el.w + 0.3) * k) / 2}
                    y={cy - ((el.h + 0.3) * k) / 2}
                    width={(el.w + 0.3) * k}
                    height={(el.h + 0.3) * k}
                    rx={4}
                    fill="#ece9df"
                    fillOpacity={0.08}
                    stroke="#ece9df"
                    strokeOpacity={0.25}
                  />
                  <text
                    x={cx - ((el.w + 0.3) * k) / 2}
                    y={cy - ((el.h + 0.3) * k) / 2 - 4}
                    fontSize={10}
                    fill="#ece9df"
                    fontFamily="ui-monospace, monospace"
                  >
                    {el.label}
                  </text>
                </>
              )}
              {el.kind === 'text' ? (
                TEXT_BARS.map(([x, y, w]) => (
                  <rect key={y} x={map([x, y])[0]} y={map([x, y])[1] - 2} width={w * k} height={4} rx={2} fill={el.color} />
                ))
              ) : (
                <path
                  d={toPath(el.points, map)}
                  fill={el.kind === 'rect' ? el.color : 'none'}
                  fillOpacity={0.12}
                  stroke={el.color}
                  strokeWidth={2.5 * Math.max(scale, 0.7)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <svg viewBox="0 0 360 260" className="h-auto w-full" aria-hidden="true">
      <GridDefs id="step-grid" size={s * 0.4} />
      {step === 0 && board(30, 28, 1, false, 'a')}
      {step === 1 && board(20, 60, 1, true, 'a')}
      {step === 2 && (
        <>
          {board(8, 70, 0.55, false, 'a')}
          {board(187, 70, 0.55, false, 'b')}
          <path d="M 90 64 Q 180 0 270 64" fill="none" stroke={MARKERS.violet} strokeWidth={2} strokeDasharray="6 5" />
          <circle cx={180} cy={33} r={5} fill={MARKERS.violet} />
          {[
            ['Ana’s screen', 90],
            ['Miguel’s screen', 270],
          ].map(([label, x]) => (
            <text key={label} x={x} y={200} textAnchor="middle" fontSize={12} fill="#ece9df" fontFamily="Inter, sans-serif">
              {label}
            </text>
          ))}
        </>
      )}
    </svg>
  )
}
