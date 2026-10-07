import { useMotionValueEvent, useScroll } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import GitHubIcon from '../ui/GitHubIcon'
import { GITHUB_URL, NAV_LINKS } from './data'
import Logo from './Logo'

export default function Navbar() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const solid = scrolled || open

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        solid ? 'border-board-line bg-board/80 backdrop-blur-md' : 'border-transparent'
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-chalk-dim transition-colors hover:text-chalk">
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-chalk-dim transition-colors hover:text-chalk"
            >
              <GitHubIcon className="size-4" />
              GitHub
            </a>
          </li>
        </ul>

        <div className="flex items-center gap-2">
          <Link
            to="/boards"
            className="rounded-lg bg-chalk px-4 py-2 text-sm font-semibold text-board transition hover:bg-white"
          >
            Start drawing
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-chalk md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <ul id="mobile-menu" className="space-y-1 border-t border-board-line px-4 py-3 md:hidden">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 text-chalk-dim hover:text-chalk">
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-chalk-dim hover:text-chalk"
            >
              <GitHubIcon className="size-4" /> GitHub
            </a>
          </li>
        </ul>
      )}
    </header>
  )
}
