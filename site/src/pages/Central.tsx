import { ArrowUp, BookOpenCheck, CalendarClock, ClipboardCheck, Megaphone, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { OrangeLines } from '@/components/brand'
import { SyncButton, timeAgo } from '@/components/sync-button'
import { Card, Empty, MaybeLink, SourceChip, TextLink } from '@/components/ui-bits'
import { ask, type Answer } from '@/lib/assistant'
import { addDays, diffDays, longDate, relDay, shortDate, todayIso } from '@/lib/dates'
import { dueOn, eventsOn, fmt1, hasAnyData, lateTasks, openTasks, overallAverage, recentNotices, subjectRows, upcomingExams } from '@/lib/stats'
import { useStore } from '@/lib/store'
import { kindLabel } from '@/lib/types'
import { cn } from '@/lib/utils'

const QUICK = ['O que tem para amanhã?', 'Quando são minhas provas?', 'Como estão minhas notas?', 'Quantas faltas eu tenho?']

const Stat = ({ icon: Icon, label, value, note, to, alert }: { icon: typeof BookOpenCheck; label: string; value: string; note: string; to: string; alert?: boolean }) => (
  <Link to={to} className="card group animate-rise flex flex-col gap-3 p-5">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-medium text-mute">{label}</span>
      <span className={cn('grid h-9 w-9 place-items-center rounded-xl', alert ? 'bg-flame-100 text-flame-600' : 'bg-blue-50 text-blue-600')}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
    </div>
    <span className="font-sans text-[34px] leading-none font-semibold tracking-tight text-navy-950">{value}</span>
    <span className={cn('text-[12.5px]', alert ? 'font-medium text-flame-600' : 'text-mute')}>{note}</span>
  </Link>
)

export default function Central() {
  const { profile, data } = useStore()
  const today = todayIso()
  const tomorrow = addDays(today, 1)
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<(Answer & { q: string }) | null>(null)

  useEffect(() => {
    document.title = 'Minha central — Lernpilot'
  }, [])

  const first = (profile?.name ?? '').split(' ')[0]
  const any = hasAnyData(data)
  const avg = overallAverage(data)
  const rows = subjectRows(data)
  const low = rows.filter((r) => r.avg < 6)
  const exams = upcomingExams(data, today, 60)
  const exams14 = exams.filter((e) => diffDays(e.date, today) <= 14)
  const open = openTasks(data, today)
  const late = lateTasks(data, today)
  const notices = recentNotices(data, 4)
  const newNotices = data.notices.filter((n) => n.date && diffDays(today, n.date) <= 7).length
  const tomorrowTasks = dueOn(data, tomorrow)
  const tomorrowEvents = eventsOn(data, tomorrow).filter((e) => !e.isExam)
  const todayEvents = eventsOn(data, today)
  const { lyceum, google } = data.connections

  const submit = (text: string) => {
    if (!text.trim()) return
    setAnswer({ ...ask(text, data, today), q: text })
    setQ('')
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(q)
  }

  return (
    <div className="space-y-6">
      {/* Banner in the school's colours: blue, orange lines, white type */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 px-6 py-8 text-white shadow-[0_30px_60px_-30px_rgba(7,26,68,.7)] sm:px-9 sm:py-10">
        <OrangeLines className="absolute inset-0 h-full w-full opacity-90" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="animate-rise">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-200">{longDate(today)}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Olá, {first || 'aluno'}.</h1>
            <p className="mt-2 max-w-lg text-[15px] text-blue-100">
              {!any
                ? 'Conecte o Lyceum ou o Google para a sua semana aparecer aqui.'
                : tomorrowTasks.length
                  ? `Amanhã você tem ${tomorrowTasks.length} ${tomorrowTasks.length === 1 ? 'entrega' : 'entregas'}${exams14.length ? ` e ${exams14.length} ${exams14.length === 1 ? 'prova' : 'provas'} nas próximas duas semanas` : ''}.`
                  : exams14.length
                    ? `Nada para amanhã. ${exams14.length} ${exams14.length === 1 ? 'prova' : 'provas'} nas próximas duas semanas.`
                    : 'Nada para amanhã e nenhuma prova nas próximas duas semanas.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              {lyceum && <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">Lyceum · {timeAgo(lyceum.syncedAt)}</span>}
              {google && <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">Google · {timeAgo(google.syncedAt)}</span>}
            </div>
          </div>
          {any ? (
            <SyncButton dark />
          ) : (
            <Link to="/conexoes" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-navy-950 transition hover:-translate-y-px">
              Conectar contas
            </Link>
          )}
        </div>
      </section>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Resumo">
        <Stat
          icon={BookOpenCheck}
          label="Média geral"
          value={avg === null ? '—' : fmt1(avg)}
          note={avg === null ? 'Vem do boletim do Lyceum' : low.length ? `${low.length} ${low.length === 1 ? 'matéria' : 'matérias'} abaixo de 6` : `Em ${rows.length} matérias, nenhuma abaixo de 6`}
          to="/estatisticas"
          alert={low.length > 0}
        />
        <Stat icon={CalendarClock} label="Provas em 14 dias" value={String(exams14.length)} note={exams14[0] ? `A próxima é ${relDay(exams14[0].date, today)}` : 'Nenhuma marcada'} to="/tarefas" />
        <Stat icon={ClipboardCheck} label="Entregas pendentes" value={String(open.length)} note={late.length ? `${late.length} ${late.length === 1 ? 'atrasada' : 'atrasadas'}` : 'Nenhuma atrasada'} to="/tarefas" alert={late.length > 0} />
        <Stat icon={Megaphone} label="Avisos da semana" value={String(newNotices)} note={notices[0]?.important ? 'Tem aviso importante' : 'Últimos 7 dias'} to="/avisos" alert={Boolean(notices[0]?.important)} />
      </section>

      {!any && (
        <Empty title="Sua central está vazia" to="/conexoes">
          Ela se enche sozinha quando você entra com o Lyceum (boletim, faltas, avisos) ou com o Google (Classroom, Agenda, Docs e Slides).
        </Empty>
      )}

      {any && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card title="Amanhã" action={<TextLink to="/tarefas">Abrir agenda</TextLink>}>
              {tomorrowTasks.length + tomorrowEvents.length === 0 ? (
                <p className="text-sm text-mute">Nada marcado para {longDate(tomorrow)}.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {tomorrowTasks.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <MaybeLink url={t.url} className="block font-medium text-navy-950">{t.title}</MaybeLink>
                        <p className="mt-0.5 text-[13px] text-mute">
                          {kindLabel[t.kind]} · {t.subject}
                        </p>
                      </div>
                      <SourceChip source={t.source} />
                    </li>
                  ))}
                  {tomorrowEvents.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <MaybeLink url={e.url} className="block font-medium text-navy-950">{e.title}</MaybeLink>
                        <p className="mt-0.5 text-[13px] text-mute">Evento{e.time ? ` às ${e.time}` : ''}</p>
                      </div>
                      <SourceChip source={e.source} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Próximas provas" action={<TextLink to="/tarefas">Ver todas</TextLink>}>
              {exams.length === 0 ? (
                <p className="text-sm text-mute">Nenhuma prova encontrada no Classroom, na Agenda ou no Lyceum para os próximos 60 dias.</p>
              ) : (
                <ul className="space-y-2.5">
                  {exams.slice(0, 5).map((e) => {
                    const n = diffDays(e.date, today)
                    return (
                      <li key={e.id} className="flex items-center gap-4 rounded-2xl border border-line p-3">
                        <span className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-xl text-center leading-none', n <= 3 ? 'bg-flame-500 text-white' : 'bg-navy-900 text-white')}>
                          <span>
                            <span className="block font-display text-xl font-semibold">{n === 0 ? 'hoje' : n}</span>
                            {n > 0 && <span className="text-[10px] uppercase tracking-wider opacity-80">{n === 1 ? 'dia' : 'dias'}</span>}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <MaybeLink url={e.url} className="block truncate font-medium text-navy-950">{e.title}</MaybeLink>
                          <p className="mt-0.5 text-[13px] text-mute">
                            {shortDate(e.date)}
                            {e.time ? ` às ${e.time}` : ''}
                            {e.subject ? ` · ${e.subject}` : ''}
                          </p>
                        </div>
                        <SourceChip source={e.source} className="hidden sm:inline-flex" />
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            {todayEvents.length > 0 && (
              <Card title="Hoje na agenda">
                <ul className="space-y-2">
                  {todayEvents.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 text-[14px]">
                      <span className="w-12 shrink-0 font-medium text-navy-700 tabular-nums">{e.time ?? 'dia'}</span>
                      <MaybeLink url={e.url} className="min-w-0 flex-1 truncate text-navy-950">{e.title}</MaybeLink>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card
              title={
                <span className="flex items-center gap-2">
                  <Sparkles className="h-[18px] w-[18px] text-flame-500" aria-hidden="true" /> Pergunte
                </span>
              }
            >
              <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-2xl border border-line bg-paper p-1.5 pl-3.5 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                <label htmlFor="pergunta" className="sr-only">Sua pergunta</label>
                <input id="pergunta" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: tem prova de química?" className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-mute/70" />
                <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition hover:bg-blue-600 active:scale-95" aria-label="Perguntar">
                  <ArrowUp className="h-[18px] w-[18px]" />
                </button>
              </form>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {QUICK.map((s) => (
                  <button key={s} onClick={() => submit(s)} className="min-h-9 rounded-full border border-line bg-white px-3 text-[12.5px] text-navy-800 transition hover:-translate-y-px hover:border-blue-300 active:translate-y-0">
                    {s}
                  </button>
                ))}
              </div>
              {answer && (
                <div className="mt-4 rounded-2xl bg-blue-50/70 p-4" aria-live="polite">
                  <p className="text-[12px] font-medium text-mute">“{answer.q}”</p>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-navy-950">{answer.text}</p>
                  {answer.items.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {answer.items.map((it, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 rounded-xl bg-white p-2.5">
                          <div className="min-w-0">
                            <MaybeLink url={it.url} className={cn('block text-[13.5px] font-medium', it.alert ? 'text-flame-600' : 'text-navy-950')}>{it.title}</MaybeLink>
                            <p className="mt-0.5 text-[12px] text-mute">{it.meta}</p>
                          </div>
                          <SourceChip source={it.source} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {answer.link && (
                    <div className="mt-1">
                      <TextLink to={answer.link.to}>{answer.link.label}</TextLink>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card title="Avisos recentes" action={<TextLink to="/avisos">Mural</TextLink>}>
              {notices.length === 0 ? (
                <p className="text-sm text-mute">Nenhum aviso por enquanto.</p>
              ) : (
                <ul className="space-y-3">
                  {notices.map((n) => (
                    <li key={n.id} className="border-l-2 pl-3" style={{ borderColor: n.important ? '#f26b1d' : '#dfe6f2' }}>
                      <MaybeLink url={n.url} className="line-clamp-2 text-[14px] font-medium text-navy-950">{n.title}</MaybeLink>
                      <p className="mt-0.5 flex items-center gap-2 text-[12px] text-mute">
                        {n.date ? shortDate(n.date) : ''} <SourceChip source={n.source} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
