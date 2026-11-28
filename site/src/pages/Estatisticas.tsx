import { useEffect } from 'react'
import { C, ChartCard, Columns, LineChart, MeterList, RankedBars, SegmentedBar } from '@/components/charts'
import { Empty, PageHead } from '@/components/ui-bits'
import { diffDays, fromIso, shortDate, todayIso } from '@/lib/dates'
import { deliveries, examsPerWeek, fmt1, gradeTimeline, hasAnyData, overallAverage, subjectRows, upcomingExams } from '@/lib/stats'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

const Tile = ({ label, value, note, alert }: { label: string; value: string; note: string; alert?: boolean }) => (
  <div className="card animate-rise flex flex-col gap-2 p-5">
    <span className="text-[13px] font-medium text-mute">{label}</span>
    <span className="text-[30px] leading-none font-semibold tracking-tight text-navy-950">{value}</span>
    <span className={cn('text-[12.5px]', alert ? 'font-medium text-flame-600' : 'text-mute')}>{note}</span>
  </div>
)

export default function Estatisticas() {
  const { data } = useStore()
  const today = todayIso()
  useEffect(() => {
    document.title = 'Estatísticas — Lernpilot'
  }, [])

  const rows = subjectRows(data)
  const avg = overallAverage(data)
  const low = rows.filter((r) => r.avg < 6)
  const official = rows.some((r) => r.official)
  const exams30 = upcomingExams(data, today, 30)
  const dl = deliveries(data, today)
  const onTime = dl.done + dl.late ? Math.round((dl.done / (dl.done + dl.late)) * 100) : null
  const absRows = data.subjects.filter((s) => s.absences !== null)
  const absTotal = absRows.reduce((s, r) => s + (r.absences ?? 0), 0)

  // Monthly mean of graded work (0-10)
  const byMonth = new Map<string, number[]>()
  for (const g of gradeTimeline(data)) {
    const k = g.date.slice(0, 7)
    byMonth.set(k, [...(byMonth.get(k) ?? []), g.value])
  }
  const timeline = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, vs]) => ({ x: month.format(fromIso(`${k}-01`)).replace('.', ''), y: vs.reduce((s, v) => s + v, 0) / vs.length, detail: `${vs.length} ${vs.length === 1 ? 'nota' : 'notas'}` }))

  const weeks = examsPerWeek(data, today, 8).map((w, i) => ({
    x: i === 0 ? 'esta' : shortDate(w.start).split(', ').pop()!.slice(0, 5),
    value: w.count,
    detail: `semana de ${shortDate(w.start)}`,
    accent: w.count >= 2,
  }))

  return (
    <div>
      <PageHead eyebrow="Estatísticas" title="Seu semestre em números">
        Tudo calculado a partir do que veio do Lyceum e do Google. Passe o mouse ou use Tab nos gráficos para ver cada valor.
      </PageHead>

      {!hasAnyData(data) ? (
        <Empty title="Ainda não há números para mostrar">Entre com o Lyceum para ver médias e faltas, e com o Google para ver entregas e provas.</Empty>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr]" aria-label="Resumo">
            <div className="card animate-rise relative overflow-hidden p-6 sm:col-span-2 lg:col-span-1">
              <span className="pointer-events-none absolute -right-10 -bottom-12 h-40 w-40 rounded-full border-[10px] border-flame-500/15" aria-hidden="true" />
              <span className="text-[13px] font-medium text-mute">Média geral</span>
              <p className="mt-2 text-[56px] leading-none font-semibold tracking-tight text-navy-950">{avg === null ? '—' : fmt1(avg)}</p>
              <p className="mt-2 text-[12.5px] text-mute">{avg === null ? 'Vem do boletim do Lyceum ou das notas do Classroom' : `${rows.length} matérias · ${official ? 'médias oficiais do boletim' : 'calculada pelas atividades corrigidas'}`}</p>
            </div>
            <Tile label="Abaixo de 6" value={String(low.length)} note={low.length ? low.map((r) => r.subject).join(', ') : 'Nenhuma matéria'} alert={low.length > 0} />
            <Tile label="Provas em 30 dias" value={String(exams30.length)} note={exams30[0] ? `Próxima em ${diffDays(exams30[0].date, today)} dias` : 'Nenhuma marcada'} />
            <Tile label="Entregas no prazo" value={onTime === null ? '—' : `${onTime}%`} note={onTime === null ? 'Vem do Classroom' : `${dl.late} ${dl.late === 1 ? 'atrasada' : 'atrasadas'}`} alert={dl.late > 0} />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Média por matéria"
              note={official ? 'Média oficial do boletim; a linha marca 6,0' : 'Média das atividades corrigidas; a linha marca 6,0'}
              table={{ head: ['Matéria', 'Média', 'Origem'], rows: rows.map((r) => [r.subject, fmt1(r.avg), r.official ? 'Boletim (Lyceum)' : `${r.count} atividades`]) }}
            >
              {rows.length ? (
                <RankedBars rows={rows.map((r) => ({ label: r.subject, value: r.avg, low: r.avg < 6, note: r.official ? 'boletim' : `${r.count} atividades` }))} />
              ) : (
                <p className="text-sm text-mute">Sem notas ainda.</p>
              )}
            </ChartCard>

            <ChartCard title="Evolução das notas" note="Média das avaliações de cada mês, de 0 a 10" table={{ head: ['Mês', 'Média', 'Notas'], rows: timeline.map((p) => [p.x, fmt1(p.y), p.detail]) }}>
              {timeline.length ? <LineChart points={timeline} label="Média mensal das avaliações" /> : <p className="text-sm text-mute">As avaliações com data aparecem aqui assim que forem lançadas.</p>}
            </ChartCard>

            <ChartCard title="Provas por semana" note="Próximas 8 semanas; em laranja, semanas com 2 ou mais" table={{ head: ['Semana', 'Provas'], rows: weeks.map((w) => [w.detail, w.value]) }}>
              {weeks.some((w) => w.value) ? <Columns cols={weeks} label="Provas por semana" /> : <p className="text-sm text-mute">Nenhuma prova marcada nas próximas 8 semanas.</p>}
            </ChartCard>

            <ChartCard
              title="Entregas do Classroom"
              note="Tarefas e trabalhos, sem contar provas"
              table={{ head: ['Situação', 'Quantidade'], rows: [['Entregues', dl.done], ['Pendentes no prazo', dl.open], ['Atrasadas', dl.late]] }}
            >
              {dl.done + dl.open + dl.late ? (
                <SegmentedBar
                  parts={[
                    { label: 'Entregues', value: dl.done, color: C.good },
                    { label: 'Pendentes', value: dl.open, color: C.series },
                    { label: 'Atrasadas', value: dl.late, color: C.bad },
                  ]}
                />
              ) : (
                <p className="text-sm text-mute">Conecte o Google para ver suas entregas.</p>
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Faltas por matéria"
            note={absRows.length ? `${absTotal} faltas no total. Em laranja, matérias acima de 25% das aulas dadas.` : 'Vem do boletim do Lyceum'}
            table={{ head: ['Matéria', 'Faltas', 'Aulas dadas'], rows: absRows.map((r) => [r.subject, r.absences ?? 0, r.lessonsGiven ?? '—']) }}
          >
            {absRows.length ? (
              <MeterList
                rows={[...absRows]
                  .sort((a, b) => (b.absences ?? 0) - (a.absences ?? 0))
                  .map((r) => ({
                    label: r.subject,
                    value: r.absences ?? 0,
                    max: r.lessonsGiven,
                    figure: r.lessonsGiven ? `${r.absences} de ${r.lessonsGiven}` : `${r.absences}`,
                    alert: r.lessonsGiven ? (r.absences ?? 0) / r.lessonsGiven > 0.25 : false,
                  }))}
              />
            ) : (
              <p className="text-sm text-mute">Sem faltas registradas ainda.</p>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  )
}
