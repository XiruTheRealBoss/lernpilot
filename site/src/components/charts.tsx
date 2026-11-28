/**
 * Small SVG charts for the statistics page. Specs from the dataviz guide: bars <= 24px with a
 * 4px rounded data end, 2px lines, >= 8px markers with a 2px surface ring, solid hairline grid,
 * text in text colours (never the series colour), a hover/focus tooltip and a table view twin.
 */
import { AlertTriangle, Table2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { fmt1 } from '@/lib/stats'
import { cn } from '@/lib/utils'

export const C = {
  series: '#2563eb',
  low: '#d9560f', // validated against white (contrast >= 3:1, CVD-separated from the blue)
  good: '#16a34a',
  bad: '#dc2626',
  grid: '#e6ebf4',
  axis: '#c9d3e4',
  ink: '#04102b',
  mute: '#5b6b88',
  surface: '#ffffff',
}

const useWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

type Tip = { x: number; y: number; value: string; label: string } | null

const Tooltip = ({ tip }: { tip: Tip }) =>
  tip ? (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-navy-950 px-2.5 py-1.5 text-center whitespace-nowrap shadow-lg"
      style={{ left: tip.x, top: tip.y, transition: "left .14s ease-out, top .14s ease-out" }}
    >
      <span className="block text-[14px] leading-tight font-semibold text-white">{tip.value}</span>
      <span className="block text-[11.5px] text-blue-200">{tip.label}</span>
    </div>
  ) : null

/** Title row + a "Ver tabela" toggle; the table is the chart's accessible twin. */
export function ChartCard({ title, note, table, children, className }: { title: string; note?: ReactNode; table: { head: string[]; rows: (string | number)[][] }; children: ReactNode; className?: string }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <section className={cn('card p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-navy-950">{title}</h2>
          {note && <p className="mt-0.5 text-[13px] text-mute">{note}</p>}
        </div>
        <button onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-blue-600 hover:bg-blue-50">
          <Table2 className="h-4 w-4" aria-hidden="true" />
          {asTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>
      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-mute">
                {table.head.map((h) => (
                  <th key={h} className="py-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-line/70 last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className={cn('py-2 pr-4', j === 0 ? 'text-navy-950' : 'text-navy-800')}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

/** Bar with a square baseline end and a 4px rounded data end (horizontal). */
const hBar = (x: number, y: number, w: number, t: number) => {
  const r = Math.min(4, w / 2, t / 2)
  return `M${x} ${y}h${w - r}a${r} ${r} 0 0 1 ${r} ${r}v${t - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r)}z`
}
/** Column with a square baseline end and a 4px rounded top. */
const vBar = (x: number, base: number, h: number, t: number) => {
  const r = Math.min(4, h / 2, t / 2)
  return `M${x} ${base}v${-(h - r)}a${r} ${r} 0 0 1 ${r} ${-r}h${t - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - r}z`
}

/** Ranked horizontal bars on a 0-10 scale with a reference line (e.g. the passing grade). */
export function RankedBars({ rows, refValue = 6, refLabel = 'média 6' }: { rows: { label: string; value: number; low?: boolean; note?: string }[]; refValue?: number; refLabel?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [tip, setTip] = useState<Tip>(null)
  const labelW = w < 420 ? 104 : 148
  const valueW = 40
  const rowH = 36
  const t = 16
  const top = 22
  const plotW = Math.max(40, w - labelW - valueW)
  const x = (v: number) => labelW + (Math.min(10, Math.max(0, v)) / 10) * plotW
  const h = top + rows.length * rowH + 22 // bottom band holds the reference-line label
  return (
    <div ref={ref} className="relative" onPointerLeave={() => setTip(null)}>
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label={`Média por matéria, de 0 a 10. ${rows.map((r) => `${r.label} ${fmt1(r.value)}`).join(', ')}.`}>
          {[0, 2, 4, 6, 8, 10].map((g) => (
            <g key={g}>
              <line x1={x(g)} x2={x(g)} y1={top - 6} y2={h - 16} stroke={g === 0 ? C.axis : C.grid} strokeWidth={1} />
              <text x={x(g)} y={12} textAnchor="middle" fontSize={11} fill={C.mute} className="tabular-nums">{g}</text>
            </g>
          ))}
          <line x1={x(refValue)} x2={x(refValue)} y1={top - 6} y2={h - 16} stroke={C.ink} strokeOpacity={0.55} strokeWidth={1} />
          <text x={x(refValue)} y={h - 3} textAnchor="middle" fontSize={11} fill={C.mute}>{refLabel}</text>
          {rows.map((r, i) => {
            const y = top + i * rowH
            const bw = Math.max(2, x(r.value) - labelW)
            const show = (cx: number) => setTip({ x: cx, y: y + 6, value: fmt1(r.value), label: r.note ? `${r.label} · ${r.note}` : r.label })
            return (
              <g key={r.label} tabIndex={0} onPointerMove={() => show(labelW + bw)} onFocus={() => show(labelW + bw)} onBlur={() => setTip(null)} className="outline-none focus-visible:[&>rect]:fill-blue-50">
                <rect x={0} y={y} width={w} height={rowH} fill="transparent" />
                <text x={r.low ? 18 : 0} y={y + rowH / 2 + 4} fontSize={13} fill={C.ink}>
                  {r.label.length > (w < 420 ? 11 : 17) ? r.label.slice(0, w < 420 ? 10 : 16) + '…' : r.label}
                </text>
                {r.low && (
                  <foreignObject x={0} y={y + rowH / 2 - 7} width={14} height={14}>
                    <AlertTriangle className="h-3.5 w-3.5 text-flame-600" aria-hidden="true" />
                  </foreignObject>
                )}
                <path d={hBar(labelW, y + (rowH - t) / 2, bw, t)} fill={r.low ? C.low : C.series} className="sb-grow-x" style={{ animationDelay: `${i * 35}ms` }} />
                <text x={labelW + bw + 6} y={y + rowH / 2 + 4} fontSize={12.5} fontWeight={600} fill={C.ink} className="sb-fade" style={{ animationDelay: `${220 + i * 35}ms` }}>{fmt1(r.value)}</text>
              </g>
            )
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

/** Single-series line (0-10) with an area wash, crosshair and per-point focus. */
export function LineChart({ points, label }: { points: { x: string; y: number; detail: string }[]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const h = 220
  const padL = 28
  const padR = 16
  const padT = 14
  const padB = 28
  const plotW = Math.max(40, w - padL - padR)
  const n = points.length
  const xs = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const ys = (v: number) => padT + (1 - v / 10) * (h - padT - padB)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${xs(i)} ${ys(p.y)}`).join('')
  const area = n > 1 ? `${d}L${xs(n - 1)} ${ys(0)}L${xs(0)} ${ys(0)}Z` : ''
  const nearest = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - padL
    return Math.max(0, Math.min(n - 1, Math.round(n === 1 ? 0 : (rel / plotW) * (n - 1))))
  }
  const a = active === null ? null : points[active]
  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <svg
          width={w}
          height={h}
          role="img"
          aria-label={`${label}: ${points.map((p) => `${p.x} ${fmt1(p.y)}`).join(', ')}.`}
          onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
        >
          {[0, 2, 4, 6, 8, 10].map((g) => (
            <g key={g}>
              <line x1={padL} x2={w - padR} y1={ys(g)} y2={ys(g)} stroke={g === 0 ? C.axis : C.grid} />
              <text x={padL - 8} y={ys(g) + 4} textAnchor="end" fontSize={11} fill={C.mute} className="tabular-nums">{g}</text>
            </g>
          ))}
          {points.map((p, i) =>
            n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
              <text key={p.x} x={xs(i)} y={h - 8} textAnchor="middle" fontSize={11} fill={C.mute}>{p.x}</text>
            ) : null,
          )}
          {area && <path d={area} fill={C.series} fillOpacity={0.1} className="sb-fade" />}
          <path d={d} fill="none" stroke={C.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="sb-draw-line" />
          {active !== null && <line x1={xs(active)} x2={xs(active)} y1={padT} y2={ys(0)} stroke={C.ink} strokeOpacity={0.35} />}
          {points.map((p, i) => (
            <circle
              key={p.x}
              cx={xs(i)}
              cy={ys(p.y)}
              r={active === i ? 5.5 : 4}
              fill={C.series}
              stroke={C.surface}
              strokeWidth={2}
              tabIndex={0}
              aria-label={`${p.x}: ${fmt1(p.y)}`}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
            />
          ))}
          {n > 0 && (
            <text x={Math.min(xs(n - 1) + 8, w - padR - 24)} y={ys(points[n - 1].y) - 10} fontSize={12.5} fontWeight={600} fill={C.ink}>{fmt1(points[n - 1].y)}</text>
          )}
        </svg>
      )}
      {a && active !== null && <Tooltip tip={{ x: xs(active), y: ys(a.y), value: fmt1(a.y), label: `${a.x} · ${a.detail}` }} />}
    </div>
  )
}

/** Columns for counts (e.g. exams per week); value on the cap of non-zero columns. */
export function Columns({ cols, label }: { cols: { x: string; value: number; detail: string; accent?: boolean }[]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [tip, setTip] = useState<Tip>(null)
  const h = 200
  const padT = 22
  const padB = 28
  const max = Math.max(1, ...cols.map((c) => c.value))
  const band = w / Math.max(1, cols.length)
  const t = Math.min(24, band * 0.55)
  const base = h - padB
  const ys = (v: number) => (v / max) * (base - padT)
  return (
    <div ref={ref} className="relative" onPointerLeave={() => setTip(null)}>
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label={`${label}: ${cols.map((c) => `${c.x} ${c.value}`).join(', ')}.`}>
          <line x1={0} x2={w} y1={base} y2={base} stroke={C.axis} />
          {cols.map((c, i) => {
            const cx = i * band + band / 2
            const show = () => setTip({ x: cx, y: base - ys(c.value), value: String(c.value), label: c.detail })
            return (
              <g key={c.x} tabIndex={0} onPointerMove={show} onFocus={show} onBlur={() => setTip(null)} className="outline-none">
                <rect x={i * band} y={padT - 10} width={band} height={base - padT + 10} fill="transparent" />
                {c.value > 0 && <path d={vBar(cx - t / 2, base, Math.max(3, ys(c.value)), t)} fill={c.accent ? C.low : C.series} className="sb-grow-y" style={{ animationDelay: `${i * 40}ms` }} />}
                {c.value > 0 && <text x={cx} y={base - ys(c.value) - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.ink}>{c.value}</text>}
                <text x={cx} y={h - 8} textAnchor="middle" fontSize={11} fill={C.mute}>{c.x}</text>
              </g>
            )
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

/** Tall segmented bar: one whole split into named parts (<= 6), share printed inside when it fits. */
export function SegmentedBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const total = parts.reduce((s, p) => s + p.value, 0)
  const visible = parts.filter((p) => p.value > 0)
  const gap = 2
  const usable = Math.max(0, w - gap * (visible.length - 1))
  const widths = visible.map((p) => (total ? (p.value / total) * usable : 0))
  const lefts = widths.map((_, i) => widths.slice(0, i).reduce((s, v) => s + v + gap, 0))
  return (
    <div>
      <div ref={ref} className="relative h-7" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value} (${total ? Math.round((p.value / total) * 100) : 0}%)`).join(', ')}>
        {w > 0 &&
          visible.map((p, i) => {
            const pw = widths[i]
            const left = lefts[i]
            const share = `${Math.round((p.value / total) * 100)}%`
            return (
              <div
                key={p.label}
                title={`${p.label}: ${p.value} (${share})`}
                className="absolute top-0 flex h-7 items-center rounded-[4px] px-2 text-[12px] font-semibold text-white"
                style={{ left, width: pw, background: p.color }}
              >
                {pw > share.length * 7.5 + 12 ? share : ''}
              </div>
            )
          })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-navy-800">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
            {p.label} <span className="font-semibold text-navy-950">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Meter list: name, a thin bar against its own whole, and the figure. */
export function MeterList({ rows }: { rows: { label: string; value: number; max: number | null; figure: string; alert?: boolean }[] }) {
  const top = Math.max(1, ...rows.map((r) => r.max ?? r.value))
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const whole = r.max ?? top
        const pct = Math.min(100, (r.value / Math.max(1, whole)) * 100)
        return (
          <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
            <span className="truncate text-[13.5px] text-navy-950">{r.label}</span>
            <span className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-blue-100 sm:col-span-1 sm:row-start-auto">
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: r.alert ? C.low : C.series }} />
            </span>
            <span className={cn('text-right text-[13px] font-semibold tabular-nums', r.alert ? 'text-flame-600' : 'text-navy-950')}>{r.figure}</span>
          </li>
        )
      })}
    </ul>
  )
}
