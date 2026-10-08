import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { useHasFinePointer, useIsSmallScreen } from '../../hooks/useMediaQuery'
import { useStartBoard } from '../../hooks/useStartBoard'
import { useAuthStore } from '../../store/authStore'
import GitHubIcon from '../ui/GitHubIcon'
import { HeroPoster } from './ScenePoster'

const HeroScene = lazy(() => import('./HeroScene'))

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
}

export default function Hero() {
  const reduced = useReducedMotion()
  const small = useIsSmallScreen()
  const finePointer = useHasFinePointer()
  const scene = useRef<HTMLDivElement>(null)
  const inView = useInView(scene, { margin: '100px' })
  const { start, signedIn } = useStartBoard()
  const [gitHubError, setGitHubError] = useState<string | null>(null)

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-4 lg:pt-12 lg:pb-20">
        <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.08 }} className="relative z-10">
          <motion.p
            variants={fadeUp}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-board-line bg-board-raised px-3 py-1 text-xs font-medium text-chalk-dim"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-lime" />
            </span>
            Multiplayer whiteboard
          </motion.p>

          <motion.h1
            id="hero-title"
            variants={fadeUp}
            className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl"
          >
            Draw together,{' '}
            <span className="relative inline-block text-coral">
              live.
              <svg viewBox="0 0 120 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full" aria-hidden="true">
                <path d="M3 8 C 30 3, 70 10, 117 4" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
              </svg>
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 max-w-md text-lg text-chalk-dim">
            A shared whiteboard where every stroke and cursor shows up in real time. No sign-up needed.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={start}
              className="group inline-flex items-center gap-2 rounded-xl bg-chalk px-5 py-3 font-semibold text-board transition hover:bg-white"
            >
              {signedIn ? 'Open your boards' : 'Start a board'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <GitHubButton onError={setGitHubError} />
          </motion.div>
          {gitHubError && (
            <p role="alert" className="mt-3 text-sm text-coral">
              {gitHubError}
            </p>
          )}

          <motion.p variants={fadeUp} className="mt-5 text-sm text-chalk-dim">
            Free · Works in your browser · Invite with a link
          </motion.p>
        </motion.div>

        <div
          ref={scene}
          role="img"
          aria-label="A tilted chalkboard where four collaborators, Ana, Miguel, Jo and Kai, draw a rectangle, a circle, an arrow and a squiggle with glowing markers at the same time."
          className="scene-fade relative -mx-4 h-[340px] overflow-hidden sm:mx-0 sm:h-[460px] lg:h-[560px]"
        >
          {reduced ? (
            <HeroPoster />
          ) : (
            <Suspense fallback={<HeroPoster />}>
              <HeroScene active={inView} simplified={small} finePointer={finePointer} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  )
}

/** Signs in with GitHub, or upgrades a guest in place. Hidden for signed-in members. */
function GitHubButton({ onError }: { onError: (message: string | null) => void }) {
  const status = useAuthStore((s) => s.status)
  const [pending, setPending] = useState(false)

  if (status === 'member') return null

  async function onClick() {
    setPending(true)
    onError(null)
    const auth = await import('../../lib/auth')
    try {
      await (status === 'guest' ? auth.linkProvider('github') : auth.signInWithProvider('github'))
      // On success the browser navigates away to GitHub.
    } catch (e) {
      onError(auth.authErrorMessage(e))
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl border border-board-line bg-board-raised px-5 py-3 font-semibold text-chalk transition hover:border-chalk/40 disabled:opacity-60"
    >
      <GitHubIcon className="size-4" />
      {status === 'guest' ? 'Keep boards with GitHub' : 'Sign in with GitHub'}
    </button>
  )
}
