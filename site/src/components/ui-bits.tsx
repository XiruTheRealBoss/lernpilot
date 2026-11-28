import { ArrowUpRight, Loader2, Plug } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sourceLabel, type Source } from '@/lib/types'
import { cn } from '@/lib/utils'

const sourceDot: Record<Source, string> = {
  lyceum: 'bg-flame-500',
  classroom: 'bg-blue-500',
  agenda: 'bg-sky-500',
  drive: 'bg-navy-700',
}

export const SourceChip = ({ source, className }: { source: Source; className?: string }) => (
  <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-mute', className)}>
    <span className={cn('h-1.5 w-1.5 rounded-full', sourceDot[source])} />
    {sourceLabel[source]}
  </span>
)

export const PageHead = ({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: ReactNode; action?: ReactNode }) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-flame-600">
        <span className="h-px w-6 bg-flame-500" />
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold text-navy-950 sm:text-[34px]">{title}</h1>
      {children && <p className="mt-1.5 max-w-2xl text-[15px] text-mute">{children}</p>}
    </div>
    {action}
  </header>
)

export const Empty = ({ title, children, to = '/conexoes', cta = 'Conectar contas' }: { title: string; children: ReactNode; to?: string; cta?: string }) => (
  <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-blue-100 bg-blue-50/60 p-6">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">
      <Plug className="h-4.5 w-4.5" aria-hidden="true" />
    </span>
    <div>
      <p className="font-display text-[17px] font-semibold text-navy-950">{title}</p>
      <p className="mt-1 max-w-md text-sm text-mute">{children}</p>
    </div>
    {to && (
      <Link to={to} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-navy-800 active:translate-y-0">
        {cta}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    )}
  </div>
)

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />

export const Card = ({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn('card p-5', className)}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        {title && <h2 className="text-[17px] font-semibold text-navy-950">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
)

export const TextLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="group inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-500">
    <span className="bg-[length:0%_1px] bg-left-bottom bg-no-repeat bg-gradient-to-r from-current to-current transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">{children}</span>
    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
  </Link>
)

/** Opens an item at its source (Classroom, Drive…) in a new tab when it has a link. */
export const MaybeLink = ({ url, children, className }: { url?: string; children: ReactNode; className?: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className={cn('hover:text-blue-600', className)}>
      {children}
    </a>
  ) : (
    <span className={className}>{children}</span>
  )
