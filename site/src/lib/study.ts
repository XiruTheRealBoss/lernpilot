/** Pure rules of the study area (agenda groups, exam suggestions, teacher profiles). No storage here. */
import { diffDays, norm } from './dates.ts'
import type { Exam, Notice, StudentData, Task, TeacherStyle } from './types.ts'

// ---- Agenda ----
export type Bucket = { key: string; label: string; tasks: Task[]; urgent?: boolean; open: boolean }

/** Pending lessons in a few clear groups, most urgent first; the near ones start open. */
export function bucketize(tasks: Task[], today: string): Bucket[] {
  const b: Record<string, Task[]> = { atrasadas: [], hoje: [], amanha: [], semana: [], depois: [], semdata: [] }
  for (const t of tasks) {
    if (!t.due) b.semdata.push(t)
    else {
      const d = diffDays(t.due, today)
      b[d < 0 ? 'atrasadas' : d === 0 ? 'hoje' : d === 1 ? 'amanha' : d <= 7 ? 'semana' : 'depois'].push(t)
    }
  }
  const defs: [string, string, boolean, boolean?][] = [
    ['atrasadas', 'Atrasadas', true, true],
    ['hoje', 'Hoje', true],
    ['amanha', 'Amanhã', true],
    ['semana', 'Esta semana', true],
    ['depois', 'Mais tarde', false],
    ['semdata', 'Sem data', false],
  ]
  return defs
    .filter(([k]) => b[k].length)
    .map(([key, label, open, urgent]) => ({ key, label, open, urgent, tasks: b[key].sort((x, y) => (x.due ?? '').localeCompare(y.due ?? '')) }))
}

export const courseKey = (t: Task) => t.courseId ?? t.subject

export const filterTasks = (tasks: Task[], search: string, course: string) => {
  const q = norm(search.trim())
  return tasks.filter((t) => (!course || courseKey(t) === course) && (!q || norm(t.title).includes(q)))
}

// ---- Teachers ----
/** Stable id from the source when there is one; otherwise the name itself (never merged across sources). */
export const teacherKey = (id: string | undefined, name: string) => id ?? `n:${norm(name.trim())}`

export type TeacherProfile = { id: string; name: string; subjects: string[]; tasks: Task[]; notices: Notice[] }

export function buildTeacherProfiles(d: StudentData): TeacherProfile[] {
  const map = new Map<string, TeacherProfile>()
  const get = (id: string | undefined, name: string, subject?: string) => {
    const key = teacherKey(id, name)
    if (!map.has(key)) map.set(key, { id: key, name, subjects: [], tasks: [], notices: [] })
    const p = map.get(key)!
    if (subject && !p.subjects.includes(subject)) p.subjects.push(subject)
    return p
  }
  for (const t of d.study.extraTeachers) get(t.id, t.name)
  for (const b of d.boletim) if (b.teacher) get(b.teacherId, b.teacher, b.name)
  for (const t of d.tasks) if (t.teacher) get(t.teacherId, t.teacher, t.subject).tasks.push(t)
  for (const n of d.notices) if (n.teacher) get(n.teacherId, n.teacher, n.subject).notices.push(n)
  for (const e of d.study.exams) if (e.teacher && !map.has(e.teacherId)) get(e.teacherId, e.teacher, e.subject)
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Short lines about a teacher's exam style, shown on the exam card. */
export function styleSummary(s: TeacherStyle | undefined): string[] {
  if (!s) return []
  const diff = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', '': '' }[s.difficulty]
  return [
    s.questionTypes && `Questões: ${s.questionTypes}`,
    diff && `Dificuldade: ${diff}`,
    s.typicalTopics && `Sempre cai: ${s.typicalTopics}`,
    s.pointsPerSection && `Pontos: ${s.pointsPerSection}`,
    s.notes && `Dica: ${s.notes}`,
  ].filter((x): x is string => Boolean(x))
}

// ---- Exams ----
const TEST_TITLE = /\b(prova|teste|avalia[çc][ãa]o|simulado|recupera[çc][ãa]o)\b/i

/** Classroom tasks that look like an exam, are not past, and were not planned yet (linked by sourceTaskId). */
export function examSuggestions(tasks: Task[], exams: Exam[], today: string): Task[] {
  const planned = new Set(exams.map((e) => e.sourceTaskId))
  return tasks.filter((t) => TEST_TITLE.test(t.title) && !planned.has(t.id) && (!t.due || t.due >= today))
}

export const examFromTask = (t: Task, id: string): Exam => ({
  id,
  subject: t.subject,
  teacher: t.teacher ?? '',
  teacherId: t.teacher ? teacherKey(t.teacherId, t.teacher) : '',
  date: t.due ?? '',
  topics: [],
  sourceTaskId: t.id,
})

/** Topics typed one per line; a topic that keeps its text keeps its "studied" tick. */
export function topicsFromText(text: string, previous: Exam['topics']): Exam['topics'] {
  const done = new Map(previous.map((t) => [t.text, t.done]))
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t) => ({ text: t, done: done.get(t) ?? false }))
}

export const examProgress = (e: Exam) => {
  const done = e.topics.filter((t) => t.done).length
  return { done, total: e.topics.length, pct: e.topics.length ? Math.round((done / e.topics.length) * 100) : 0 }
}
