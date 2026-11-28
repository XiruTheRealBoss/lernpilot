import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'
import { BoletimPanel } from '@/components/boletim-panel'
import { Card, Empty, MaybeLink, PageHead, SourceChip, TextLink } from '@/components/ui-bits'
import { shortDate } from '@/lib/dates'
import { fmt1, subjectRows } from '@/lib/stats'
import { useStore } from '@/lib/store'
import type { Grade } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function Notas() {
  const { data } = useStore()
  useEffect(() => {
    document.title = 'Boletim — Lernpilot'
  }, [])
  const rows = subjectRows(data)
  const bySubject = new Map<string, Grade[]>()
  for (const g of [...data.grades].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))) bySubject.set(g.subject, [...(bySubject.get(g.subject) ?? []), g])

  return (
    <div>
      <PageHead eyebrow="Boletim" title="Notas e faltas" action={<TextLink to="/estatisticas">Ver em gráficos</TextLink>}>
        Médias oficiais e faltas vêm do Lyceum. Notas de atividades corrigidas vêm do Classroom.
      </PageHead>

      <BoletimPanel />
      {!rows.length && !data.grades.length ? (
        <Empty title="Seu boletim ainda não chegou">Entre com o Lyceum para trazer médias e faltas, ou com o Google para as notas das atividades do Classroom.</Empty>
      ) : (
        <div className="space-y-6">
          {data.subjects.length > 0 && (
            <Card title="Médias e faltas do semestre" action={<SourceChip source="lyceum" />}>
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-line text-[12px] text-mute">
                      <th className="px-5 py-2 font-medium">Matéria</th>
                      <th className="px-3 py-2 text-right font-medium">Média</th>
                      <th className="px-3 py-2 text-right font-medium">Faltas</th>
                      <th className="px-3 py-2 text-right font-medium">Aulas dadas</th>
                      <th className="px-5 py-2 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {data.subjects.map((s) => {
                      const low = s.average !== null && s.average < 6
                      return (
                        <tr key={s.subject} className="border-b border-line/70 last:border-0">
                          <td className="px-5 py-3 font-medium text-navy-950">{s.subject}</td>
                          <td className={cn('px-3 py-3 text-right font-semibold', low ? 'text-flame-600' : 'text-navy-950')}>
                            <span className="inline-flex items-center gap-1.5">
                              {low && <AlertTriangle className="h-3.5 w-3.5" aria-label="abaixo de 6" />}
                              {s.average === null ? '—' : fmt1(s.average)}
                              {s.average !== null && s.official === false && <span className="text-[10.5px] font-normal uppercase tracking-wide text-mute">parcial</span>}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-navy-800">{s.absences ?? '—'}</td>
                          <td className="px-3 py-3 text-right text-navy-800">{s.lessonsGiven ?? '—'}</td>
                          <td className="px-5 py-3 text-navy-800">{s.status ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {bySubject.size > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[...bySubject.entries()].map(([subject, gs]) => {
                const row = rows.find((r) => r.subject === subject)
                return (
                  <Card key={subject} title={subject} action={row && <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', row.avg < 6 ? 'bg-flame-100 text-flame-600' : 'bg-blue-50 text-navy-800')}>média {fmt1(row.avg)}</span>}>
                    <ul className="divide-y divide-line">
                      {gs.map((g) => (
                        <li key={g.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <MaybeLink url={g.url} className="block truncate text-[14px] text-navy-950">{g.label}</MaybeLink>
                            <p className="mt-0.5 flex items-center gap-2 text-[12px] text-mute">
                              {g.date ? shortDate(g.date) : 'sem data'} <SourceChip source={g.source} />
                            </p>
                          </div>
                          <span className={cn('text-[17px] font-semibold tabular-nums', g.value / g.max < 0.6 ? 'text-flame-600' : 'text-navy-950')}>{fmt1((g.value / g.max) * 10)}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
