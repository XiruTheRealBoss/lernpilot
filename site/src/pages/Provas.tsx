import { Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { PageHead, TextLink } from '@/components/ui-bits'
import { diffDays, longDate, todayIso } from '@/lib/dates'
import { removeExam, saveExam, toggleTopic, useStore } from '@/lib/store'
import { buildTeacherProfiles, examFromTask, examProgress, examSuggestions, styleSummary, topicsFromText, type TeacherProfile } from '@/lib/study'
import type { Exam } from '@/lib/types'
import { cn } from '@/lib/utils'

const field = 'min-h-12 w-full rounded-xl border border-line bg-white px-3 text-[14.5px] text-navy-950 outline-none placeholder:text-mute/70 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'
const newId = () => crypto.randomUUID()

function ExamForm({ exam, teachers, onDone }: { exam: Exam; teachers: TeacherProfile[]; onDone: (e: Exam | null) => void }) {
  const [draft, setDraft] = useState(exam)
  const [topics, setTopics] = useState(exam.topics.map((t) => t.text).join('\n'))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onDone({ ...draft, subject: draft.subject.trim(), topics: topicsFromText(topics, exam.topics) })
  }
  return (
    <form onSubmit={submit} className="card animate-rise space-y-3 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-[13px] font-medium text-navy-900">
          <span>Matéria</span>
          <input required autoFocus value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={field} />
        </label>
        <label className="block space-y-1 text-[13px] font-medium text-navy-900">
          <span>Professor</span>
          <select
            value={draft.teacherId}
            onChange={(e) => setDraft({ ...draft, teacherId: e.target.value, teacher: teachers.find((t) => t.id === e.target.value)?.name ?? '' })}
            className={field}
          >
            <option value="">Sem professor</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.subjects.length ? ` (${t.subjects.join(', ')})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-[13px] font-medium text-navy-900">
          <span>Data</span>
          <input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={field} />
        </label>
      </div>
      <label className="block space-y-1 text-[13px] font-medium text-navy-900">
        <span>Conteúdos, um por linha</span>
        <textarea value={topics} onChange={(e) => setTopics(e.target.value)} rows={5} placeholder={'Equação do 2º grau\nBhaskara\nGráfico da parábola'} className={cn(field, 'resize-y py-2.5')} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onDone(null)} className="min-h-11 rounded-xl px-4 text-[13.5px] font-medium text-mute hover:text-navy-950">Cancelar</button>
        <button className="min-h-11 rounded-xl bg-navy-900 px-5 text-[13.5px] font-semibold text-white transition hover:bg-navy-800 active:translate-y-px">Salvar prova</button>
      </div>
    </form>
  )
}

/** The exam as a ticket: what to study on the left, the countdown stub on the right. */
function ExamCard({ exam, today, onEdit }: { exam: Exam; today: string; onEdit: () => void }) {
  const style = useStore().data.study.teacherStyles[exam.teacherId]
  const days = exam.date ? diffDays(exam.date, today) : null
  const past = days !== null && days < 0
  const { done, total, pct } = examProgress(exam)
  const tips = styleSummary(style)
  return (
    <article className={cn('card flex flex-col overflow-hidden sm:flex-row', past && 'opacity-60')}>
      <div className="min-w-0 flex-1 space-y-4 p-5">
        <div>
          <h3 className="text-xl font-semibold text-navy-950">{exam.subject}</h3>
          <p className="text-[13.5px] text-mute first-letter:uppercase">
            {exam.date ? longDate(exam.date) : 'Sem data'}
            {exam.teacher && `, com ${exam.teacher}`}
          </p>
        </div>
        {total > 0 ? (
          <div className="space-y-2.5">
            <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {exam.topics.map((t, i) => (
                <li key={i}>
                  <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[14px] text-navy-950">
                    <input type="checkbox" checked={t.done} onChange={() => toggleTopic(exam.id, i)} className="h-4 w-4 accent-blue-600" />
                    <span className={cn(t.done && 'text-mute line-through')}>{t.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Conteúdos estudados">
                <div className="h-full rounded-full bg-blue-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[12.5px] text-mute tabular-nums">
                {done} de {total} estudados
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[13.5px] text-mute">Sem conteúdos ainda. Edite para listar o que cai.</p>
        )}
        {tips.length > 0 && (
          <div className="border-l-2 border-flame-500 pl-3 text-[13.5px] text-navy-800">
            {tips.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        )}
        <div className="flex gap-4 text-[13.5px]">
          <button onClick={onEdit} className="min-h-11 font-semibold text-blue-600 hover:text-blue-500">Editar</button>
          <button onClick={() => window.confirm(`Apagar a prova de ${exam.subject}?`) && removeExam(exam.id)} className="min-h-11 text-mute hover:text-red-700">Apagar</button>
        </div>
      </div>
      <div className={cn('flex items-center justify-center gap-2 border-t border-dashed border-line px-5 py-4 sm:w-32 sm:flex-col sm:gap-0 sm:border-t-0 sm:border-l', days !== null && days >= 0 && days <= 3 ? 'bg-flame-100/60' : 'bg-paper')}>
        {days === null ? (
          <span className="text-[13px] text-mute">sem data</span>
        ) : past ? (
          <span className="text-[13px] text-mute">já foi</span>
        ) : days === 0 ? (
          <span className="font-display text-2xl font-bold text-flame-600">hoje</span>
        ) : (
          <>
            <span className={cn('text-[44px] leading-none font-semibold tabular-nums', days <= 3 ? 'text-flame-600' : 'text-navy-950')}>{days}</span>
            <span className="text-[13px] text-mute">{days === 1 ? 'dia' : 'dias'}</span>
          </>
        )}
      </div>
    </article>
  )
}

export default function Provas() {
  const { data } = useStore()
  const today = todayIso()
  const [editing, setEditing] = useState<Exam | null>(null)
  useEffect(() => {
    document.title = 'Provas — Lernpilot'
  }, [])

  const teachers = buildTeacherProfiles(data)
  const { exams } = data.study
  const suggestions = examSuggestions(data.tasks, exams, today).filter((t) => t.id !== editing?.sourceTaskId)
  const sorted = [...exams].sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))
  const done = (e: Exam | null) => {
    if (e) saveExam(e)
    setEditing(null)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead
        eyebrow="Provas"
        title="Próximas provas"
        action={
          <button onClick={() => setEditing({ id: newId(), subject: '', teacher: '', teacherId: '', date: '', topics: [] })} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-navy-900 px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-navy-800 active:translate-y-0">
            <Plus className="h-4 w-4" aria-hidden="true" /> Marcar prova
          </button>
        }
      >
        Liste o que cai, marque o que já estudou e veja as dicas que você anotou sobre cada professor.
      </PageHead>

      <div className="space-y-4">
        {suggestions.length > 0 && (
          <section className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-4" aria-label="Sugestões das suas tarefas">
            <p className="mb-1 text-[13.5px] text-mute">Parecem provas nas suas tarefas:</p>
            <ul>
              {suggestions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 text-[14.5px]">
                  <span className="min-w-0 text-navy-950">
                    {t.title} <span className="text-mute">({t.subject})</span>
                  </span>
                  <button onClick={() => setEditing(examFromTask(t, newId()))} className="min-h-11 shrink-0 font-semibold text-blue-600 hover:text-blue-500">Planejar</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {editing && <ExamForm key={editing.id} exam={editing} teachers={teachers} onDone={done} />}

        {sorted.length === 0 && !editing ? (
          <p className="card p-6 text-mute">Nenhuma prova marcada. Use “Marcar prova” ou aceite uma sugestão.</p>
        ) : (
          sorted.filter((e) => e.id !== editing?.id).map((e) => <ExamCard key={e.id} exam={e} today={today} onEdit={() => setEditing(e)} />)
        )}
        <TextLink to="/professores">Anotar o estilo de prova dos professores</TextLink>
      </div>
    </div>
  )
}
