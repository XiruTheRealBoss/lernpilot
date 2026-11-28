import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Vercel-style filter row (adapted from the vercel-tabs component): a soft pill slides to the option
 * under the pointer and an orange line slides to the selected one.
 * Changes from the original: controlled by the page (`value`), real buttons with the toolbar +
 * aria-pressed semantics of the button groups it replaces, project colours instead of `dark:` ones,
 * and it measures again when the font loads or the options change.
 */
export function Tabs<T extends string>({ tabs, value, onChange, label, className }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string; className?: string }) {
  const row = useRef<HTMLDivElement>(null)
  const [boxes, setBoxes] = useState<{ left: number; width: number }[]>([])
  const [pill, setPill] = useState(0) // last option pointed at; it keeps its place while fading out
  const [pointing, setPointing] = useState(false)
  const names = tabs.map((t) => t.label).join('|')

  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const buttons = [...el.querySelectorAll('button')]
    const measure = () => setBoxes(buttons.map((b) => ({ left: b.offsetLeft, width: b.offsetWidth })))
    measure()
    const ro = new ResizeObserver(measure) // the web font arriving changes every width
    buttons.forEach((b) => ro.observe(b))
    return () => ro.disconnect()
  }, [names])

  const active = tabs.findIndex((t) => t.id === value)
  const at = (i: number) => boxes[i] ?? { left: 0, width: 0 }
  const point = (i: number) => {
    setPill(i)
    setPointing(true)
  }
  return (
    <div className={cn('max-w-full overflow-x-auto', className)}>
      <div ref={row} role="toolbar" aria-label={label} className="relative flex w-max items-center gap-1.5 pb-2" onPointerLeave={() => setPointing(false)}>
        {/* drawn only once measured: otherwise both would slide in from the left edge on every page load */}
        {boxes.length > 0 && (
          <>
            <span aria-hidden="true" className={cn('pointer-events-none absolute top-0 h-10 rounded-lg bg-navy-900/[0.08] transition-[left,width,opacity] duration-300 ease-out motion-reduce:transition-none', pointing ? 'opacity-100' : 'opacity-0')} style={at(pill)} />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-0.5 h-0.5 rounded-full bg-flame-500 transition-[left,width] duration-300 ease-out motion-reduce:transition-none" style={at(active)} />
          </>
        )}
        {tabs.map((t, i) => (
          <button
            key={t.id || 'all'}
            type="button"
            aria-pressed={i === active}
            onClick={() => onChange(t.id)}
            onPointerEnter={() => point(i)}
            onFocus={() => point(i)}
            onBlur={() => setPointing(false)}
            className={cn('relative h-10 rounded-lg px-3.5 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-300', i === active ? 'text-navy-950' : 'text-mute hover:text-navy-900')}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
