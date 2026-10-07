import { Link } from 'react-router'

/** "Pisara" wordmark with a chalk-stroke underline. */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`relative inline-block font-display text-2xl font-bold tracking-tight text-chalk ${className}`}>
      Pisara
      <svg
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute -bottom-1.5 left-0 h-2 w-full text-coral"
        aria-hidden="true"
      >
        <path
          d="M2 6.5 C 18 3.5, 34 7.5, 52 5 S 84 3, 98 5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </Link>
  )
}
