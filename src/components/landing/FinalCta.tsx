import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useStartBoard } from '../../hooks/useStartBoard'
import { MARKERS } from './data'

const DOODLE = [
  // a loose loop-de-loop, a star and a little underline swoosh
  { d: 'M20 80 C 40 20, 90 20, 90 60 C 90 95, 45 95, 55 60 C 65 25, 130 30, 150 70', color: MARKERS.coral },
  { d: 'M190 30 L 198 52 L 222 52 L 203 66 L 210 90 L 190 75 L 170 90 L 177 66 L 158 52 L 182 52 Z', color: MARKERS.amber },
  { d: 'M240 85 C 260 70, 280 95, 300 78', color: MARKERS.sky },
]

export default function FinalCta() {
  const reduced = useReducedMotion()
  const { start } = useStartBoard()

  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
      <div className="relative overflow-hidden rounded-3xl border border-board-line bg-board-raised/70 px-6 py-16 text-center sm:px-12">
        <svg viewBox="0 0 320 110" className="mx-auto h-20 w-auto sm:h-24" aria-hidden="true">
          {DOODLE.map((p, i) => (
            <motion.path
              key={p.color}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: false, margin: '-80px' }}
              transition={{ duration: 1.1, delay: i * 0.9, ease: 'easeInOut' }}
            />
          ))}
        </svg>

        <h2 id="cta-title" className="mt-8 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
          Grab a marker.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-chalk-dim">
          Open a board, send the link, and start sketching together in seconds.
        </p>
        <button
          type="button"
          onClick={start}
          className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-chalk px-6 py-3.5 text-lg font-semibold text-board transition hover:bg-white"
        >
          Start a board
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
