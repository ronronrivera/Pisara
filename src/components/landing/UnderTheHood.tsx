import { motion, useReducedMotion } from 'framer-motion'
import { ServerOff, ShieldCheck, Zap } from 'lucide-react'
import { MARKERS } from './data'

const SERVICES = [
  { name: 'Auth', detail: 'guests · Google · GitHub', color: MARKERS.lime },
  { name: 'Postgres + RLS', detail: 'tables · RPC · versions', color: MARKERS.sky },
  { name: 'Realtime Broadcast', detail: 'strokes · cursors', color: MARKERS.coral },
  { name: 'Presence', detail: 'who’s online', color: MARKERS.amber },
  { name: 'Storage', detail: 'thumbnails · PNG exports', color: MARKERS.violet },
]

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: 'Optimistic updates with per-element versioning',
    body: 'Your shape appears instantly. The database accepts a change only if it carries the next version number, and stale edits roll back on their own.',
  },
  {
    icon: ShieldCheck,
    title: 'Permissions enforced in the database with row-level security',
    body: 'Postgres decides who can read or draw on a board. Element writes go through a single function that checks your role.',
  },
  {
    icon: ServerOff,
    title: 'Zero backend servers: React on Vercel + Supabase',
    body: 'The static frontend talks straight to Supabase for auth, data, real-time messaging and file storage.',
  },
]

const STACK = ['React', 'Vite', 'Tailwind', 'Three.js', 'Supabase', 'PostgreSQL']

interface Layout {
  viewBox: string
  browser: { x: number; y: number; w: number; h: number }
  container: { x: number; y: number; w: number; h: number }
  service: (i: number) => { x: number; y: number; w: number; h: number }
  wire: (i: number) => string
}

const DESKTOP: Layout = {
  viewBox: '0 0 820 400',
  browser: { x: 20, y: 145, w: 210, h: 110 },
  container: { x: 330, y: 14, w: 470, h: 372 },
  service: (i) => ({ x: 380, y: 66 + i * 62, w: 390, h: 48 }),
  wire: (i) => {
    const cy = 90 + i * 62
    return `M230 200 C 300 200, 300 ${cy}, 380 ${cy}`
  },
}

const MOBILE: Layout = {
  viewBox: '0 0 360 560',
  browser: { x: 70, y: 8, w: 220, h: 90 },
  container: { x: 8, y: 128, w: 344, h: 424 },
  service: (i) => ({ x: 60, y: 178 + i * 72, w: 276, h: 56 }),
  wire: (i) => `M180 98 V 113 H 34 V ${206 + i * 72} H 60`,
}

const ARIA =
  'Architecture: the browser runs React with a canvas and Zustand, served as a static site from Vercel. It talks directly to Supabase, which provides Auth for guests and Google or GitHub sign-in, Postgres with row-level security and RPC functions, Realtime Broadcast for strokes and cursors, Presence for who is online, and Storage for thumbnails and PNG exports.'

function Diagram({ layout, className }: { layout: Layout; className: string }) {
  const reduced = useReducedMotion()
  const { browser: b, container: c } = layout

  return (
    <svg viewBox={layout.viewBox} className={className} role="img" aria-label={ARIA}>
      <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={18} fill="#15241f" stroke="#2c4a40" strokeDasharray="6 6" />
      <text x={c.x + 22} y={c.y + 32} fontSize={15} fontWeight={700} fill="#ece9df" fontFamily="'Bricolage Grotesque', sans-serif">
        Supabase
      </text>
      <text x={c.x + 102} y={c.y + 32} fontSize={11} fill="#a9b3ad">
        managed · nothing to deploy
      </text>

      {SERVICES.map((s, i) => {
        const r = layout.service(i)
        const wire = layout.wire(i)
        return (
          <g key={s.name}>
            <motion.path
              d={wire}
              fill="none"
              stroke={s.color}
              strokeOpacity={0.45}
              strokeWidth={1.5}
              initial={{ pathLength: reduced ? 1 : 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.15 * i }}
            />
            {!reduced && (
              <circle r={3.5} fill={s.color}>
                <animateMotion dur={`${2.2 + i * 0.25}s`} repeatCount="indefinite" path={wire} begin={`${i * 0.4}s`} />
              </circle>
            )}
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10} fill="#0f1a17" stroke={s.color} strokeOpacity={0.5} />
            <circle cx={r.x + 18} cy={r.y + r.h / 2} r={5} fill={s.color} />
            <text x={r.x + 34} y={r.y + r.h / 2 + 5} fontSize={14} fontWeight={600} fill="#ece9df">
              {s.name}
            </text>
            <text x={r.x + r.w - 14} y={r.y + r.h / 2 + 4} fontSize={11} fill="#a9b3ad" textAnchor="end" className="max-sm:hidden">
              {s.detail}
            </text>
          </g>
        )
      })}

      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill="#ece9df" />
      <text x={b.x + b.w / 2} y={b.y + b.h / 2 - 8} textAnchor="middle" fontSize={17} fontWeight={700} fill="#0f1a17" fontFamily="'Bricolage Grotesque', sans-serif">
        Browser
      </text>
      <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 12} textAnchor="middle" fontSize={11} fill="#33443e">
        React · canvas · Zustand
      </text>
      <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 28} textAnchor="middle" fontSize={11} fill="#33443e">
        static build on Vercel
      </text>
    </svg>
  )
}

export default function UnderTheHood() {
  return (
    <section id="under-the-hood" aria-labelledby="hood-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <p className="text-sm font-semibold tracking-wide text-sky uppercase">Under the hood</p>
      <h2 id="hood-title" className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        How it’s built
      </h2>

      <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="rounded-2xl border border-board-line bg-board/60 p-4 sm:p-6">
          <Diagram layout={DESKTOP} className="hidden h-auto w-full md:block" />
          <Diagram layout={MOBILE} className="mx-auto h-auto w-full max-w-sm md:hidden" />
        </div>

        <div>
          <ul className="space-y-6">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chalk/8 text-chalk">
                  <h.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{h.title}</h3>
                  <p className="mt-1 text-chalk-dim">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <ul aria-label="Tech stack" className="mt-10 flex flex-wrap gap-2">
            {STACK.map((s) => (
              <li key={s} className="rounded-full border border-board-line px-3 py-1 font-mono text-xs text-chalk-dim">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
