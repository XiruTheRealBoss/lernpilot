import { ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Empty, MaybeLink, PageHead, SourceChip, TextLink } from '@/components/ui-bits'
import { addDays, diffDays, longDate, relDay, shortDate, todayIso } from '@/lib/dates'
import { setTaskNote, toggleTaskDone, useStore } from '@/lib/store'
import { bucketize, courseKey, filterTasks } from '@/lib/study'
import { kindLabel, sourceLabel, type Task } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Collapsible group: the header is the control, with the label, how many, and an open/closed sign. */
function Section({ label, count, urgent, muted, defaultOpen, children }: { label: string; count: number; urgent?: boolean; muted?: boolean; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <h2>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-4 text-left">
          <ChevronRight className={cn('h-4 w-4 text-mute transition-transform duration-200', open && 'rotate-90')} aria-hidden="true" />
          <span className={cn('font-display text-[17px] font-semibold', urgent ? 'text-flame-600' : muted ? 'text-mute' : 'text-navy-950')}>{label}</span>
          <span className="ml-auto text-[13px] text-mute tabular-nums">{count}</span>
        </button>
      </h2>
      {open && <ul className="pb-2">{children}</ul>}
    </section>
  )
}

function whenLabel(t: Task, today: string): { text: string; urgent?: boolean } {
  if (t.delivered) return { text: 'entregue' }
  if (!t.due) return { text: '' }
  const d = diffDays(t.due, today)
  if (d < 0) return { text: t.done ? shortDate(t.due) : 'atrasada', urgent: !t.done }
  if (d <= 1) return { text: relDay(t.due, today), urgent: d === 0 && !t.done }
  return { text: shortDate(t.due) }
}

/** One lesson: a lean row; opening it shows description, materials, a private note and the link to the source. */
function TaskRow({ task, today }: { task: Task; today: string }) {
  const note = useStore().data.study.notes[task.id] ?? ''
  const [open, setOpen] = useState(false)
  const when = whenLabel(task, today)
  const where = sourceLabel[task.source]
  return (
    <li className="px-4">
      <div className="flex items-start gap-1">
        <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center" title={task.delivered ? `Entregue no ${where}` : 'Marca só aqui no Lernpilot; não entrega no Classroom'}>
          <input
            type="checkbox"
            checked={task.done}
            disabled={task.delivered}
            onChange={() => toggleTaskDone(task.id)}
            aria-label={task.delivered ? `"${task.title}" já foi entregue no ${where}` : `Marcar "${task.title}" como feita, só aqui no Lernpilot`}
            className="h-[18px] w-[18px] cursor-pointer accent-blue-600 disabled:cursor-default disabled:opacity-60"
          />
        </label>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-w-0 flex-1 py-2.5 text-left">
          <span className="flex items-baseline gap-3">
            <span className={cn('flex-1 leading-snug', task.done ? 'text-mute line-through' : 'text-navy-950')}>{task.title}</span>
            {when.text && <span className={cn('shrink-0 text-[13px]', when.urgent ? 'font-medium text-flame-600' : 'text-mute')}>{when.text}</span>}
          </span>
          <span className="mt-0.5 block text-[13px] text-mute">
            {task.kind !== 'licao' && `${kindLabel[task.kind]} · `}
            {task.subject}
            {task.teacher && ` · ${task.teacher}`}
          </span>
        </button>
      </div>
      {open && (
        <div className="space-y-3 pb-4 pl-12 text-[14px]">
          {task.due && <p className="text-mute">Prazo: {longDate(task.due)}</p>}
          {task.done && !task.delivered && <p className="text-mute">Marcada como feita só aqui. No {where} ela continua sem entrega.</p>}
          {task.fromNotice && <p className="text-mute">Encontrada num aviso do professor. Confira o texto original.</p>}
          {task.description && <p className="leading-relaxed whitespace-pre-wrap text-navy-900">{task.description}</p>}
          {task.links && task.links.length > 0 && (
            <ul className="space-y-1">
              {task.links.map((m) => (
                <li key={m.url + m.title}>
                  <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2">{m.title}</a>
                </li>
              ))}
            </ul>
          )}
          <textarea
            value={note}
            onChange={(e) => setTaskNote(task.id, e.target.value)}
            rows={2}
            placeholder="Anotação (fica só neste aparelho)"
            aria-label={`Anotação sobre ${task.title}`}
            className="w-full resize-y rounded-xl border border-line bg-white p-2.5 text-navy-950 outline-none placeholder:text-mute/70 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <div className="flex items-center gap-3">
            <SourceChip source={task.source} />
            {task.url && (
              <a href={task.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[13px] font-semibold text-blue-600 hover:text-blue-500">
                Abrir no {where}
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export default function Tarefas() {
  const { data, demo } = useStore()
  const today = todayIso()
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  useEffect(() => {
    document.title = 'Lições — Lernpilot'
  }, [])

  const courses = useMemo(() => [...new Map(data.tasks.map((t) => [courseKey(t), t.subject])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [data.tasks])
  const visible = filterTasks(data.tasks, search, course)
  const done = visible.filter((t) => t.done)
  const pending = visible.filter((t) => !t.done)
  const buckets = bucketize(pending, today)
  const count = (k: string) => buckets.find((b) => b.key === k)?.tasks.length ?? 0
  const late = count('atrasadas')
  const now = count('hoje')
  const events = course || search ? [] : data.events.filter((e) => e.date >= today && e.date <= addDays(today, 30)).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead eyebrow="Lições" title="O que você tem para fazer" action={<TextLink to="/avisos">Ver avisos</TextLink>}>
        Tarefas do Classroom e lições achadas nos avisos dos professores, por prazo.
      </PageHead>

      {!data.tasks.length && !data.events.length ? (
        <Empty title="Nenhuma lição ainda">
          {demo ? 'A demonstração está sem lições.' : 'Entre com o Google para trazer as tarefas e os avisos do Classroom. O Lyceum traz as tarefas lançadas lá.'}
        </Empty>
      ) : (
        <>
          {pending.length > 0 && (
            <p className="mb-5 text-[15px] text-navy-950" role="status">
              {late > 0 && (
                <>
                  <b className="text-flame-600">{late}</b> {late === 1 ? 'atrasada' : 'atrasadas'}
                </>
              )}
              {late > 0 && now > 0 && <span className="text-mute"> · </span>}
              {now > 0 && (
                <>
                  <b>{now}</b> para hoje
                </>
              )}
              {late === 0 && now === 0 && <span className="text-mute">Nada atrasado nem para hoje.</span>}
            </p>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <label className="flex min-h-12 min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
              <Search className="h-4 w-4 text-mute" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lição" aria-label="Buscar lição" className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-mute/70" />
            </label>
            {courses.length > 1 && (
              <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Turma" className="min-h-12 rounded-xl border border-line bg-white px-3 text-[13.5px] text-navy-900">
                <option value="">Todas as turmas</option>
                {courses.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
          </div>

          {buckets.length === 0 && done.length === 0 ? (
            <p className="card p-6 text-mute">Nenhuma lição com esse filtro.</p>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {buckets.map((b) => (
                <Section key={b.key} label={b.label} count={b.tasks.length} urgent={b.urgent} defaultOpen={b.open}>
                  {b.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} />
                  ))}
                </Section>
              ))}
              {done.length > 0 && (
                <Section label="Feitas" count={done.length} defaultOpen={false} muted>
                  {done.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} />
                  ))}
                </Section>
              )}
            </div>
          )}

          {events.length > 0 && (
            <section className="mt-8" aria-label="Agenda dos próximos 30 dias">
              <h2 className="mb-2 font-display text-[17px] font-semibold text-navy-950">Na agenda</h2>
              <ul className="card divide-y divide-line">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-20 shrink-0 text-[13px] text-mute">{shortDate(e.date)}</span>
                    <MaybeLink url={e.url} className="min-w-0 flex-1 text-navy-950">{e.title}</MaybeLink>
                    {e.isExam && <span className="rounded-full bg-flame-100 px-2.5 py-1 text-[11.5px] font-semibold text-flame-600">Prova</span>}
                    <SourceChip source={e.source} className="hidden sm:inline-flex" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
