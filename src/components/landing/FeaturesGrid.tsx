import { motion, type Variants } from 'framer-motion'
import { Check, ImageDown, Link2, MousePointer2, PenTool, Undo2, UserRound, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MARKERS } from './data'

// Each card's hint plays when the card is hovered (variants propagate from the card).

const drawHint: Variants = { rest: { pathLength: 0.12 }, hover: { pathLength: 1, transition: { duration: 0.7 } } }
const cursorHint: Variants = {
  rest: { x: 0, y: 0 },
  hover: { x: [0, 22, 8, 16], y: [0, -10, 6, 0], transition: { duration: 1.1 } },
}
const popHint: Variants = { rest: { opacity: 0, y: 6, scale: 0.9 }, hover: { opacity: 1, y: 0, scale: 1 } }
const undoHint: Variants = { rest: { rotate: 0 }, hover: { rotate: [0, -50, 0], transition: { duration: 0.6 } } }
const exportHint: Variants = {
  rest: { y: 0 },
  hover: { y: [0, 5, 0], transition: { duration: 0.6, repeat: Infinity } },
}

interface Feature {
  icon: LucideIcon
  title: string
  body: string
  color: string
  hint: ReactNode
}

const FEATURES: Feature[] = [
  {
    icon: PenTool,
    title: 'Drawing tools',
    body: 'Pen, shapes, arrows, text and eraser on an infinite canvas.',
    color: MARKERS.coral,
    hint: (
      <svg viewBox="0 0 64 24" className="h-6 w-16">
        <motion.path variants={drawHint} d="M2 16 C 12 2, 20 22, 32 12 S 52 4, 62 14" fill="none" stroke={MARKERS.coral} strokeWidth={3} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    icon: MousePointer2,
    title: 'Live cursors',
    body: 'See who’s here and where they’re pointing.',
    color: MARKERS.sky,
    hint: (
      <motion.span variants={cursorHint} className="flex items-center gap-1">
        <MousePointer2 className="size-4" style={{ color: MARKERS.sky, fill: MARKERS.sky }} />
        <span className="rounded px-1 text-[10px] font-semibold text-board" style={{ backgroundColor: MARKERS.sky }}>
          Miguel
        </span>
      </motion.span>
    ),
  },
  {
    icon: UserRound,
    title: 'No sign-up needed',
    body: 'Start as a guest with just a name. Sign in later and keep your boards.',
    color: MARKERS.lime,
    hint: (
      <motion.span variants={popHint} className="rounded-full border border-lime/40 px-2 py-0.5 text-[11px] text-lime">
        Guest → Ana
      </motion.span>
    ),
  },
  {
    icon: Link2,
    title: 'Invite by link',
    body: 'Share with editor or viewer access.',
    color: MARKERS.amber,
    hint: (
      <motion.span variants={popHint} className="flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 text-[11px] font-semibold text-board">
        <Check className="size-3" /> Copied
      </motion.span>
    ),
  },
  {
    icon: Undo2,
    title: 'Your own undo',
    body: 'Undo your changes without touching anyone else’s.',
    color: MARKERS.violet,
    hint: (
      <motion.span variants={undoHint} className="inline-flex">
        <Undo2 className="size-5 text-violet" />
      </motion.span>
    ),
  },
  {
    icon: ImageDown,
    title: 'Export to PNG',
    body: 'Download your board as an image.',
    color: MARKERS.sky,
    hint: (
      <motion.span variants={exportHint} className="font-mono text-[11px] text-sky">
        board.png ↓
      </motion.span>
    ),
  },
]

export default function FeaturesGrid() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <p className="text-sm font-semibold tracking-wide text-coral uppercase">Features</p>
      <h2 id="features-title" className="mt-2 max-w-2xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        Everything you need to think out loud, together
      </h2>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.li
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
          >
            <motion.article
              initial="rest"
              animate="rest"
              whileHover="hover"
              className="group relative h-full rounded-2xl border border-board-line bg-board-raised/70 p-6 transition-colors hover:border-chalk/25"
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className="flex size-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${f.color}1f`, color: f.color }}
                >
                  <f.icon className="size-5" aria-hidden="true" />
                </span>
                <span aria-hidden="true" className="flex h-11 items-center">
                  {f.hint}
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-chalk-dim">{f.body}</p>
            </motion.article>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
