import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Copy, MousePointer2 } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useLoopStep } from '../../hooks/useLoopStep'
import { MARKERS } from './data'

// Small looping mock-ups of the real UI. They're decorative (aria-hidden);
// each figure's caption carries the meaning.

export default function DemoStrip() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { margin: '0px 0px -10% 0px' })
  const reduced = useReducedMotion()
  const play = inView && !reduced

  return (
    <section ref={ref} aria-labelledby="demo-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 id="demo-title" className="sr-only">
        Pisara in action
      </h2>
      <div className="grid gap-5 md:grid-cols-3">
        <Moment caption="Pick a name and you’re in. No account needed.">
          <NameDialogMock play={play} />
        </Moment>
        <Moment caption="Draw the same shape at the same time and watch it come together.">
          <SharedRectMock play={play} />
        </Moment>
        <Moment caption="Share a link with editor or viewer access.">
          <ShareDialogMock play={play} />
        </Moment>
      </div>
    </section>
  )
}

function Moment({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-board-line bg-board-raised/70">
      <div aria-hidden="true" className="relative flex h-60 items-center justify-center overflow-hidden px-5">
        {children}
      </div>
      <figcaption className="border-t border-board-line px-5 py-4 text-sm text-chalk-dim">{caption}</figcaption>
    </figure>
  )
}

const MockCard = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`w-full max-w-[260px] rounded-xl border border-chalk/10 bg-board p-4 shadow-2xl shadow-black/40 ${className}`}>
    {children}
  </div>
)

/** 1. The name dialog types "Ana" and joins. */
function NameDialogMock({ play }: { play: boolean }) {
  const NAME = 'Ana'
  // 0–3 typing, 4–5 pause, 6–7 press, 8–11 joined
  const step = useLoopStep(12, 380, play, 9)
  const typed = NAME.slice(0, Math.min(step, NAME.length))
  const pressed = step >= 6 && step <= 7
  const joined = step >= 8

  return (
    <MockCard>
      <p className="font-display text-base font-semibold text-chalk">What should we call you?</p>
      <div className="mt-3 flex h-9 items-center rounded-lg border border-chalk/15 bg-board-raised px-3 text-sm text-chalk">
        {typed}
        {!joined && <span className="caret ml-px inline-block h-4 w-px bg-chalk" />}
      </div>
      <motion.div
        animate={{ scale: pressed ? 0.96 : 1 }}
        className={`mt-3 rounded-lg py-2 text-center text-sm font-semibold text-board transition-colors ${
          pressed ? 'bg-white ring-2 ring-amber' : 'bg-chalk'
        }`}
      >
        Join board
      </motion.div>
      <p className={`mt-2 flex h-5 items-center gap-1 text-xs text-lime transition-opacity ${joined ? 'opacity-100' : 'opacity-0'}`}>
        <Check className="size-3.5" /> Joined as {NAME}
      </p>
    </MockCard>
  )
}

/** 2. Two cursors draw halves of one rectangle; an avatar stack shows who's online. */
function SharedRectMock({ play }: { play: boolean }) {
  const loop = play
    ? { duration: 2.4, ease: 'easeInOut' as const, repeat: Infinity, repeatDelay: 1.2 }
    : { duration: 0 }
  const draw = { pathLength: play ? [0, 1] : 1 }

  return (
    <div className="relative h-[200px] w-[280px] shrink-0">
      <div className="absolute top-0 right-0 flex items-center gap-2">
        <div className="flex -space-x-2">
          {[
            ['A', MARKERS.coral],
            ['M', MARKERS.sky],
            ['J', MARKERS.lime],
          ].map(([initial, color]) => (
            <span
              key={initial}
              className="flex size-7 items-center justify-center rounded-full border-2 border-board-raised text-xs font-bold text-board"
              style={{ backgroundColor: color }}
            >
              {initial}
            </span>
          ))}
        </div>
        <span className="text-xs text-chalk-dim">Online: 3</span>
      </div>

      <svg viewBox="0 0 280 200" className="absolute inset-0 h-full w-full">
        {/* Ana: top + right edge. Miguel: bottom + left edge. */}
        <motion.path
          d="M 50 70 H 230 V 170"
          fill="none"
          stroke={MARKERS.coral}
          strokeWidth={3.5}
          strokeLinecap="round"
          initial={false}
          animate={draw}
          transition={loop}
        />
        <motion.path
          d="M 230 170 H 50 V 70"
          fill="none"
          stroke={MARKERS.sky}
          strokeWidth={3.5}
          strokeLinecap="round"
          initial={false}
          animate={draw}
          transition={loop}
        />
      </svg>

      {[
        { name: 'Ana', color: MARKERS.coral, x: [50, 230, 230], y: [70, 70, 170] },
        { name: 'Miguel', color: MARKERS.sky, x: [230, 50, 50], y: [170, 170, 70] },
      ].map((c) => (
        <motion.div
          key={c.name}
          className="absolute top-0 left-0"
          initial={false}
          animate={play ? { x: c.x.map((v) => v - 2), y: c.y.map((v) => v - 2) } : { x: c.x[2] - 2, y: c.y[2] - 2 }}
          transition={{ ...loop, times: [0, 0.5, 1] }}
        >
          <MousePointer2 className="size-5" style={{ color: c.color, fill: c.color }} />
          <span
            className="ml-3 rounded px-1.5 py-0.5 text-[10px] font-semibold text-board"
            style={{ backgroundColor: c.color }}
          >
            {c.name}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

/** 3. The share dialog: switch role, copy the link, see a toast. */
function ShareDialogMock({ play }: { play: boolean }) {
  // 0–1 editor, 2 menu open, 3 viewer, 4 press copy, 5–6 toast, 7 back to editor
  const step = useLoopStep(8, 750, play, 0)
  const role = step >= 3 && step <= 6 ? 'Viewer' : 'Editor'
  const menuOpen = step === 2
  const copying = step === 4
  const toast = step >= 5 && step <= 6

  return (
    <div className="relative w-full max-w-[260px]">
      <MockCard>
        <p className="font-display text-base font-semibold text-chalk">Share board</p>
        <div className="relative mt-3 flex items-center justify-between gap-2 text-sm text-chalk-dim">
          <span>Anyone with the link can {role === 'Editor' ? 'edit' : 'view'}</span>
          <span className="flex shrink-0 items-center gap-1 rounded-md border border-chalk/15 bg-board-raised px-2 py-1 text-xs text-chalk">
            {role} <ChevronDown className="size-3" />
          </span>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-8 right-0 z-10 w-28 rounded-lg border border-chalk/15 bg-board-raised p-1 text-xs text-chalk shadow-xl"
              >
                <div className="flex items-center justify-between rounded px-2 py-1.5">
                  Editor <Check className="size-3" />
                </div>
                <div className="rounded bg-chalk/10 px-2 py-1.5">Viewer</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-lg border border-chalk/15 bg-board-raised px-3 py-2 font-mono text-xs text-chalk-dim">
            /join/k3Xq9vTb2LmP
          </span>
          <motion.span
            animate={{ scale: copying ? 0.9 : 1 }}
            className={`flex size-8 items-center justify-center rounded-lg text-board ${copying ? 'bg-white ring-2 ring-amber' : 'bg-chalk'}`}
          >
            <Copy className="size-4" />
          </motion.span>
        </div>
      </MockCard>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute -bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-board"
          >
            <Check className="size-3.5" /> Link copied
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
