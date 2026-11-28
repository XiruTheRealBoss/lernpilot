import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Lernpilot mark: a white planet on a blue tile, crossed by an orange orbit (the school's lines). */
export const BrandMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={cn('h-8 w-8 shrink-0', className)} aria-hidden="true">
    <defs>
      <linearGradient id="sb-tile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2563eb" />
        <stop offset="1" stopColor="#0b2a63" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#sb-tile)" />
    <circle cx="16" cy="16" r="6" fill="white" />
    <ellipse cx="16" cy="16" rx="12.5" ry="4.6" transform="rotate(-22 16 16)" fill="none" stroke="#ff8a3d" strokeWidth="1.8" />
  </svg>
)

export const Brand = ({ to = '/', className, light = true }: { to?: string; className?: string; light?: boolean }) => (
  <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="Lernpilot, página inicial">
    <BrandMark />
    <span className={cn('font-display text-[19px] font-semibold tracking-tight', light ? 'text-white' : 'text-navy-950')}>Lernpilot</span>
  </Link>
)

/** The school's orange curved lines (as on its banner), drawn once on load. */
export const OrangeLines = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1440 520" preserveAspectRatio="none" className={cn('pointer-events-none', className)} aria-hidden="true">
    <g fill="none" stroke="#f26b1d" strokeLinecap="round">
      <path className="sb-line" vectorEffect="non-scaling-stroke" d="M-60 470 C 300 120, 760 40, 1500 210" strokeWidth="1.6" strokeOpacity="0.75" />
      <path className="sb-line" vectorEffect="non-scaling-stroke" d="M-40 90 C 380 330, 980 420, 1500 60" strokeWidth="1.2" strokeOpacity="0.5" style={{ animationDelay: '.25s' }} />
      <path className="sb-line" vectorEffect="non-scaling-stroke" d="M260 -40 C 520 260, 900 300, 1180 560" strokeWidth="1" strokeOpacity="0.35" style={{ animationDelay: '.5s' }} />
    </g>
  </svg>
)
