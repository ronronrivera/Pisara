import { MARKERS } from '../landing/data'

const COLORS = Object.values(MARKERS)

/** Small deterministic hash so each board gets its own doodle. */
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Placeholder art until real thumbnails exist: a chalkboard grid with two or three
 * marker doodles picked from the board id, so cards are easy to tell apart.
 */
export default function BoardThumbnail({ id, url }: { id: string; url?: string | null }) {
  if (url) return <img src={url} alt="" className="aspect-[16/10] w-full object-cover" />

  const h = hash(id)
  const pick = (shift: number, n: number) => (h >>> shift) % n
  const c1 = COLORS[pick(0, COLORS.length)]
  const c2 = COLORS[(pick(0, COLORS.length) + 1 + pick(3, COLORS.length - 1)) % COLORS.length]
  const x = 18 + pick(6, 40)
  const y = 16 + pick(10, 24)

  return (
    <svg viewBox="0 0 160 100" className="aspect-[16/10] w-full" aria-hidden="true">
      <defs>
        <pattern id={`grid-${id}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#23362f" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="160" height="100" fill="#132520" />
      <rect width="160" height="100" fill={`url(#grid-${id})`} />
      <g fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {pick(14, 2) === 0 ? (
          <rect x={x} y={y} width="44" height="28" rx="3" stroke={c1} />
        ) : (
          <ellipse cx={x + 22} cy={y + 14} rx="24" ry="15" stroke={c1} />
        )}
        <path d={`M ${x + 52} ${y + 14} L ${x + 76} ${y + 14} M ${x + 69} ${y + 8} L ${x + 76} ${y + 14} L ${x + 69} ${y + 20}`} stroke={c2} />
        {pick(16, 2) === 0 && (
          <path d={`M ${x - 4} ${y + 52} c 8 -10 16 10 24 0 s 16 10 24 0 s 16 10 24 0`} stroke={c2} opacity="0.85" />
        )}
      </g>
    </svg>
  )
}
