/** Numbers derived from the student's synced data. Every function takes `today` so it is testable. */
import { addDays, diffDays, fromIso, iso } from './dates.ts'
import type { CalendarEvent, Grade, StudentData, Task } from './types.ts'

export type SubjectRow = { subject: string; avg: number; official: boolean; count: number; absences: number | null }

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Official report-card average when Lyceum has it, else the mean of graded work. 0-10 scale. */
export const subjectRows = (d: StudentData): SubjectRow[] => {
  const rows = new Map<string, SubjectRow>()
  for (const s of d.subjects)
    if (s.average !== null) rows.set(s.subject, { subject: s.subject, avg: s.average, official: s.official ?? true, count: 0, absences: s.absences })
  const bySubject = new Map<string, Grade[]>()
  for (const g of d.grades) bySubject.set(g.subject, [...(bySubject.get(g.subject) ?? []), g])
  for (const [subject, gs] of bySubject) {
    const row = rows.get(subject)
    if (row) row.count = gs.length
    else rows.set(subject, { subject, avg: mean(gs.map((g) => (g.value / g.max) * 10))!, official: false, count: gs.length, absences: null })
  }
  return [...rows.values()].sort((a, b) => a.avg - b.avg)
}

export const overallAverage = (d: StudentData) => mean(subjectRows(d).map((r) => r.avg))

export type ExamItem = { id: string; title: string; subject: string | null; date: string; time: string | null; source: Task['source']; url?: string }

/** Exams from tasks and calendar events, deduplicated, from today on. */
export const upcomingExams = (d: StudentData, today: string, days = 60): ExamItem[] => {
  const last = addDays(today, days)
  const fromTasks: ExamItem[] = d.tasks
    .filter((t) => t.kind === 'prova' && !t.done && t.due && t.due >= today && t.due <= last)
    .map((t) => ({ id: t.id, title: t.title, subject: t.subject, date: t.due!, time: null, source: t.source, url: t.url }))
  const fromEvents: ExamItem[] = d.events
    .filter((e: CalendarEvent) => e.isExam && e.date >= today && e.date <= last)
    .map((e) => ({ id: e.id, title: e.title, subject: null, date: e.date, time: e.time, source: e.source, url: e.url }))
  const seen = new Set<string>()
  return [...fromTasks, ...fromEvents]
    .filter((x) => {
      const k = `${x.date}|${x.title.toLowerCase().slice(0, 24)}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
}

export const openTasks = (d: StudentData, today: string) =>
  d.tasks
    .filter((t) => !t.done && t.kind !== 'prova' && (t.due === null || t.due >= today))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))

export const lateTasks = (d: StudentData, today: string) => d.tasks.filter((t) => !t.done && t.kind !== 'prova' && t.due !== null && t.due < today)

export const dueOn = (d: StudentData, day: string) => d.tasks.filter((t) => !t.done && t.due === day)

export const eventsOn = (d: StudentData, day: string) => d.events.filter((e) => e.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

/** Monday of the week containing `day`. */
export const weekStart = (day: string) => addDays(day, -((fromIso(day).getDay() + 6) % 7))

export const examsPerWeek = (d: StudentData, today: string, weeks = 8) => {
  const first = weekStart(today)
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: addDays(first, i * 7), count: 0 }))
  for (const e of upcomingExams(d, today, weeks * 7)) {
    const i = Math.floor(diffDays(e.date, first) / 7)
    if (i >= 0 && i < weeks) buckets[i].count++
  }
  return buckets
}

export const gradeTimeline = (d: StudentData) =>
  d.grades
    .filter((g) => g.date)
    .map((g) => ({ date: g.date!, value: (g.value / g.max) * 10, subject: g.subject, label: g.label }))
    .sort((a, b) => a.date.localeCompare(b.date))

export const deliveries = (d: StudentData, today: string) => {
  const work = d.tasks.filter((t) => t.source === 'classroom' && t.kind !== 'prova')
  return {
    done: work.filter((t) => t.done).length,
    open: work.filter((t) => !t.done && (t.due === null || t.due >= today)).length,
    late: work.filter((t) => !t.done && t.due !== null && t.due < today).length,
  }
}

export const recentNotices = (d: StudentData, n = 5) =>
  [...d.notices].sort((a, b) => Number(b.important) - Number(a.important) || (b.date ?? '').localeCompare(a.date ?? '')).slice(0, n)

export const hasAnyData = (d: StudentData) =>
  d.tasks.length + d.grades.length + d.subjects.length + d.notices.length + d.materials.length + d.events.length > 0

export const fmt1 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const isoToday = () => iso(new Date())
