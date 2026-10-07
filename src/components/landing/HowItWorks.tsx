import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { lazy, Suspense, useRef, useState } from 'react'
import { HOW_IT_WORKS_STEPS } from './data'
import { StepPoster } from './ScenePoster'

const ExplodingCanvasScene = lazy(() => import('./ExplodingCanvasScene'))

const SCENE_LABEL =
  'A small diagram on a chalkboard. Its shapes lift off into separate labeled layers, each with its own version number, then settle onto two boards side by side, Ana’s screen and Miguel’s screen, with a pulse traveling between them.'

const STEP_LABELS = [
  'A chalkboard with a small diagram: two boxes joined by an arrow, an ellipse, a few lines of text and a squiggle.',
  'The same diagram with each shape lifted into its own layer, labeled with its type and version, such as rect · v3.',
  'Two boards side by side, Ana’s screen and Miguel’s screen, showing the same diagram, with a dashed line linking them.',
]

function SectionHeading() {
  return (
    <>
      <p className="text-sm font-semibold tracking-wide text-amber uppercase">How it works</p>
      <h2 id="how-title" className="mt-2 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        From your sketch to everyone’s screen
      </h2>
    </>
  )
}

export default function HowItWorks() {
  const reduced = useReducedMotion()
  return reduced ? <StaticSteps /> : <PinnedSteps />
}

function PinnedSteps() {
  const section = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })
  const inView = useInView(section, { margin: '200px' })
  const [step, setStep] = useState(0)

  useMotionValueEvent(scrollYProgress, 'change', (p) => setStep(p < 0.3 ? 0 : p < 0.6 ? 1 : 2))

  return (
    <section id="how-it-works" ref={section} aria-labelledby="how-title" className="relative h-[320vh]">
      <div className="sticky top-0 mx-auto flex h-svh max-w-7xl flex-col gap-4 px-4 pt-20 pb-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-10 lg:py-0">
        <div>
          <SectionHeading />

          <div className="mt-6 h-1 w-full max-w-sm overflow-hidden rounded-full bg-board-line" aria-hidden="true">
            <motion.div className="h-full origin-left bg-amber" style={{ scaleX: scrollYProgress }} />
          </div>

          <ol className="mt-6 space-y-5">
            {HOW_IT_WORKS_STEPS.map((s, i) => (
              <li
                key={s.title}
                aria-current={i === step ? 'step' : undefined}
                className={`transition-opacity duration-300 ${i === step ? 'opacity-100' : 'hidden opacity-35 lg:block'}`}
              >
                <h3 className="flex items-baseline gap-3 font-display text-xl font-semibold sm:text-2xl">
                  <span className="font-mono text-sm text-amber">0{i + 1}</span>
                  {s.title}
                </h3>
                <p className="mt-1.5 max-w-md pl-8 text-chalk-dim">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div role="img" aria-label={SCENE_LABEL} className="relative min-h-0 w-full flex-1 overflow-hidden lg:h-[78vh] lg:flex-none">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center p-6">
                <StepPoster step={0} />
              </div>
            }
          >
            <ExplodingCanvasScene progress={scrollYProgress} active={inView} />
          </Suspense>
        </div>
      </div>
    </section>
  )
}

/** Reduced motion: no pinning or scroll animation, just three still frames. */
function StaticSteps() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading />
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {HOW_IT_WORKS_STEPS.map((s, i) => (
          <li key={s.title} className="overflow-hidden rounded-2xl border border-board-line bg-board-raised/70">
            <div role="img" aria-label={STEP_LABELS[i]} className="p-4">
              <StepPoster step={i as 0 | 1 | 2} />
            </div>
            <div className="border-t border-board-line p-5">
              <h3 className="flex items-baseline gap-3 font-display text-xl font-semibold">
                <span className="font-mono text-sm text-amber">0{i + 1}</span>
                {s.title}
              </h3>
              <p className="mt-1.5 text-chalk-dim">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
