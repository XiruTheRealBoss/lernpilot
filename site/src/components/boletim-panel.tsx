import { ChevronRight, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { gradedSubjects, pending, provasMean, semesterStatus, withSimulated, yearAverage, type SemStatus } from '@/lib/boletim'
import { setGoal, setSimulated, useStore } from '@/lib/store'
import type { BoletimDisc, BoletimProva } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Tabs } from './ui/vercel-tabs'

const fmt = (n: number | null | undefined) => (n == null ? '—' : (Math.round(n * 100) / 100).toFixed(2).replace('.', ','))
const tone = (n: number | null, goal: number) => (n === null ? 'text-mute' : n >= goal ? 'text-emerald-700' : n >= goal - 1 ? 'text-amber-700' : 'text-red-700')
const CHIP = { good: 'bg-emerald-50 text-emerald-700', warn: 'bg-amber-50 text-amber-800', bad: 'bg-red-50 text-red-700', mute: 'bg-paper text-mute' }

function chipFor(st: SemStatus): { cls: keyof typeof CHIP; text: string } | null {
  switch (st.estado) {
    case 'aprovado':
      return { cls: 'good', text: 'aprovado' }
    case 'garantido':
      return { cls: 'good', text: 'garantido' }
    case 'recuperado':
      return { cls: 'good', text: 'recuperado' }
    case 'precisa':
      return { cls: 'warn', text: `precisa ${fmt(st.precisa)}` }
    case 'recuperacao':
    case 'impossivel':
      return { cls: 'bad', text: 'recuperação' }
    case 'andamento':
      return { cls: 'mute', text: 'em curso' }
    default:
      return null
  }
}

function explain(d: BoletimDisc, st: SemStatus, sp: string, goal: number, left: number): string {
  const year = st.mira === 'ano'
  switch (st.estado) {
    case 'precisa':
      return `Para passar ${year ? 'no ano' : 'no semestre'} com média ${fmt(goal)}, você precisa de ${fmt(st.precisa)} em cada uma das ${left} avaliações que faltam${year ? `. O outro semestre fechou em ${fmt(st.outro)}, então este precisa fechar em ${fmt(st.alvoSem)}` : ''}.`
    case 'garantido':
      return year ? `Ano garantido: com o outro semestre em ${fmt(st.outro)}, você passa mesmo zerando o que falta.` : `Já está garantido: mesmo zerando o que falta, a média fica em ${fmt(goal)} ou mais.`
    case 'aprovado':
      return `Aprovado neste semestre com ${fmt(st.media)}.`
    case 'recuperado':
      return `Recuperado: a média de provas (${fmt(provasMean(d, sp))}) foi trocada pela recuperação (${fmt(st.rec)}, que vale até 6). A média foi de ${fmt(st.mediaOrig)} para ${fmt(st.media)}.`
    case 'recuperacao':
      return st.rec == null ? `Em recuperação: média ${fmt(st.media)}. A nota da recuperação ainda não saiu.` : `Em recuperação: mesmo com a recuperação (${fmt(st.rec)}), a média ficou em ${fmt(st.media)}.`
    case 'impossivel':
      return `Pela média não dá mais: o máximo possível é ${fmt(st.max)} e seria preciso ${fmt(st.alvoSem)}. Depende de recuperação ou conselho.`
    case 'andamento':
      return `Semestre em andamento, média parcial ${fmt(st.media)}. O cálculo de quanto falta foi desligado porque a conta não bateu com a média oficial do 1º semestre.`
    default:
      return 'Sem fórmula de média para esta disciplina.'
  }
}

/** One evaluation chip; an open one can receive a simulated grade (kept on this device, clearly labelled). */
function ProvaChip({ disc, prova }: { disc: string; prova: BoletimProva }) {
  const key = `${disc}|${prova.code}`
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = parseFloat(value.replace(',', '.'))
    if (!Number.isNaN(n) && n >= 0 && n <= 10) setSimulated(key, n)
    setEditing(false)
    setValue('')
  }
  if (prova.grade !== null && !prova.simulated)
    return (
      <span className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13px] text-navy-900">
        {prova.name} <b className="tabular-nums">{fmt(prova.grade)}</b>
      </span>
    )
  if (prova.simulated)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-flame-500 bg-flame-100/50 py-0.5 pr-0.5 pl-2.5 text-[13px] text-navy-900">
        {prova.name} <b className="tabular-nums">{fmt(prova.grade)}</b> <span className="text-[11px] font-semibold uppercase tracking-wide text-flame-600">simulada</span>
        <button onClick={() => setSimulated(key, null)} className="grid h-9 w-9 place-items-center rounded-md text-mute hover:text-red-700" aria-label={`Remover a nota simulada de ${prova.name}`}>
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  if (editing)
    return (
      <form onSubmit={submit} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400 bg-white py-0.5 pr-0.5 pl-2.5 text-[13px]">
        <label htmlFor={`sim-${key}`}>{prova.name}</label>
        <input id={`sim-${key}`} autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0 a 10" className="h-9 w-16 rounded-md border border-line px-2 text-center outline-none focus:border-blue-400" />
        <button className="h-9 rounded-md bg-navy-900 px-2.5 text-[12.5px] font-semibold text-white">Simular</button>
      </form>
    )
  return (
    <button onClick={() => setEditing(true)} className="min-h-9 rounded-lg border border-dashed border-blue-300 px-2.5 text-[13px] text-blue-600 transition hover:bg-blue-50">
      {prova.name} +
    </button>
  )
}

function DiscCard({ d, sp, goal }: { d: BoletimDisc; sp: string; goal: number }) {
  const [open, setOpen] = useState(false)
  const st = semesterStatus(d, sp, goal)
  const chip = chipFor(st)
  const left = pending(d, sp)
  const mine = d.provas.filter((p) => p.sp === sp && /^(P|D|SM)\d+_/.test(p.code))
  const graded = mine.filter((p) => p.grade !== null)
  const simulated = graded.some((p) => p.simulated)
  const running = ['precisa', 'garantido', 'andamento'].includes(st.estado)
  return (
    <li className="card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-navy-950">{d.name}</span>
          {d.teacher && <span className="block truncate text-[12.5px] text-mute">{d.teacher}</span>}
        </span>
        {chip && <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold', CHIP[chip.cls])}>{chip.text}</span>}
        <span className="w-16 shrink-0 text-right">
          <span className={cn('block text-[19px] leading-tight font-semibold tabular-nums', tone(st.media, goal))}>{fmt(st.media)}</span>
          <span className="block text-[10.5px] uppercase tracking-wide text-mute">{st.media === null ? '' : simulated ? 'simulada' : st.oficial ? 'oficial' : 'parcial'}</span>
        </span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 text-mute transition-transform duration-200', open && 'rotate-90')} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4 text-[14px]">
          <p className="leading-relaxed text-navy-900">{explain(d, st, sp, goal, left.length)}</p>
          {left.length > 0 && running && (
            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-mute">Ainda dá para tirar nota em</p>
              <div className="flex flex-wrap gap-1.5">
                {left.map((p) => (
                  <ProvaChip key={p.code} disc={d.id} prova={p} />
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-mute">Toque para simular uma nota que o professor já entregou e ainda não lançou. Fica só neste aparelho.</p>
            </div>
          )}
          {graded.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-mute">Notas lançadas</p>
              <div className="flex flex-wrap gap-1.5">
                {graded.map((p) => (
                  <ProvaChip key={p.code} disc={d.id} prova={p} />
                ))}
              </div>
            </div>
          )}
          {d.attendance && (
            <p className="text-[13px] text-mute">
              Presença {d.attendance.presence ?? '—'}% · Faltas {d.attendance.absences ?? '—'} de {d.attendance.allowed ?? '—'} permitidas
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function YearRow({ d, goal, current }: { d: BoletimDisc; goal: number; current: string }) {
  const [m1, m2] = ['1', '2'].map((sp) => semesterStatus(d, sp, goal).media)
  const year = yearAverage(d, goal)
  // approval is decided at 6 by the school, whatever personal goal is set
  const now = semesterStatus(d, current, 6).estado
  const chip =
    year.media === null
      ? { cls: 'mute' as const, text: '—' }
      : year.oficial
        ? year.media >= 6
          ? { cls: 'good' as const, text: 'aprovado' }
          : { cls: 'bad' as const, text: 'recuperação' }
        : ['garantido', 'aprovado', 'recuperado'].includes(now)
          ? { cls: 'good' as const, text: 'garantido' }
          : now === 'impossivel'
            ? { cls: 'bad' as const, text: 'não dá' }
            : { cls: 'warn' as const, text: 'não garantido' }
  const cell = (label: string, n: number | null) => (
    <span className="w-12 shrink-0 text-center">
      <span className={cn('block text-[15px] font-semibold tabular-nums', tone(n, goal))}>{fmt(n)}</span>
      <span className="block text-[10.5px] uppercase text-mute">{label}</span>
    </span>
  )
  return (
    <li className="card flex items-center gap-2 px-4 py-3">
      <span className="min-w-0 flex-1 truncate font-medium text-navy-950">{d.name}</span>
      {cell('1º', m1)}
      {cell('2º', m2)}
      {cell('ano', year.media)}
      <span className={cn('hidden shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold sm:inline', CHIP[chip.cls])}>{chip.text}</span>
    </li>
  )
}

const PERIODS = [
  { id: '1', label: '1º sem' },
  { id: '2', label: '2º sem' },
  { id: 'ano', label: 'Ano' },
]

/** "How much is still needed" per discipline, from the Lyceum report card. */
export function BoletimPanel() {
  const { data } = useStore()
  const { goal, simulated } = data.study
  const discs = gradedSubjects(withSimulated(data.boletim, simulated))
  const current = data.boletim.find((d) => d.currentSp)?.currentSp ?? '2'
  const [sp, setSp] = useState(current)
  if (!discs.length) return null
  const nSim = Object.keys(simulated).length
  return (
    <section aria-labelledby="quanto-falta" className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 id="quanto-falta" className="font-display text-[19px] font-semibold text-navy-950">Quanto falta para passar</h2>
        <Tabs label="Período" className="ml-auto" value={sp} onChange={setSp} tabs={PERIODS} />
        <label className="flex items-center gap-2 text-[13px] text-mute">
          passa com
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={goal}
            onChange={(e) => setGoal(Math.min(10, Math.max(0, parseFloat(e.target.value) || 6)))}
            className="h-10 w-16 rounded-xl border border-line bg-white text-center text-navy-950 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </label>
      </div>
      {nSim > 0 && (
        <p className="mb-3 rounded-xl border border-dashed border-flame-500 bg-flame-100/40 px-3 py-2 text-[13px] text-navy-900" role="status">
          {nSim === 1 ? '1 nota simulada entra' : `${nSim} notas simuladas entram`} nas contas abaixo. Elas não são oficiais e aparecem marcadas como “simulada”.
        </p>
      )}
      <ul className="space-y-2.5">{sp === 'ano' ? discs.map((d) => <YearRow key={d.id} d={d} goal={goal} current={current} />) : discs.map((d) => <DiscCard key={d.id} d={d} sp={sp} goal={goal} />)}</ul>
      <p className="mt-3 text-[12px] leading-relaxed text-mute">
        “Oficial” é a média fechada pelo Lyceum. “Parcial” considera só o que já foi lançado. “Quanto falta” usa a fórmula da escola e supõe a mesma nota em cada avaliação que resta. A média do ano é estimativa até os dois semestres fecharem.
      </p>
    </section>
  )
}
