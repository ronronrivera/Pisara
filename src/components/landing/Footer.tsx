import GitHubIcon from '../ui/GitHubIcon'
import { GITHUB_URL, PORTFOLIO_URL } from './data'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-board-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo className="text-xl" />
          <p className="mt-3 text-sm text-chalk-dim">
            Built by Ron-ron Aspe Rivera · Made with React, Three.js and Supabase
          </p>
        </div>
        <ul className="flex flex-wrap gap-5 text-sm">
          <li>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-chalk-dim hover:text-chalk">
              <GitHubIcon className="size-4" /> Source on GitHub
            </a>
          </li>
          <li>
            <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className="text-chalk-dim hover:text-chalk">
              ronronrivera.tech
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
