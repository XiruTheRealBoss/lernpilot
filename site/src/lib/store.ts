import { useSyncExternalStore } from 'react'
import { todayIso } from './dates.ts'
import { demoData } from './demo.ts'
import { teacherKey } from './study.ts'
import { EMPTY_STYLE, emptyData, emptyStudy, type Exam, type Profile, type Source, type StudentData, type Study, type SyncResult, type TeacherStyle } from './types.ts'

/**
 * The signed-in student's profile + synced school data + study notes, kept in this browser only.
 * "Lembrar de mim" on → localStorage (survives closing the browser); off → sessionStorage.
 * No password is ever stored here. Demo mode lives in memory and never touches the saved account.
 */
const KEY = 'sb:v2'
const DEMO_KEY = 'sb:demo'

type Saved = { profile: Profile; data: StudentData; remember: boolean }
type State = { profile: Profile | null; data: StudentData; remember: boolean; demo: boolean }

const readFrom = (s: Storage): Saved | null => {
  try {
    const raw = s.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Saved
    // data saved before the study area existed stays readable: missing fields get their defaults
    return { ...v, data: { ...emptyData(), ...v.data, study: { ...emptyStudy(), ...v.data.study } } }
  } catch {
    return null
  }
}

const demoState = (): State => ({ profile: { name: 'Aluno Demo' }, data: demoData(todayIso()), remember: false, demo: true })

const load = (): State => {
  if (sessionStorage.getItem(DEMO_KEY)) return demoState()
  const v = readFrom(localStorage) ?? readFrom(sessionStorage)
  return v ? { ...v, demo: false } : { profile: null, data: emptyData(), remember: true, demo: false }
}

let state = load()
const listeners = new Set<() => void>()

const commit = (next: State) => {
  state = next
  if (!next.demo) {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
    if (next.profile) {
      const target = next.remember ? localStorage : sessionStorage
      target.setItem(KEY, JSON.stringify({ profile: next.profile, data: next.data, remember: next.remember }))
    }
  }
  listeners.forEach((l) => l())
}

export const useStore = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state, // server snapshot: lets the pages be rendered in Node by the smoke test
  )

export const getState = () => state

/** Opens the fictional student. No credentials, no network; the real saved account is left untouched. */
export const enterDemo = () => {
  sessionStorage.setItem(DEMO_KEY, '1')
  commit(demoState())
}
export const exitDemo = () => {
  sessionStorage.removeItem(DEMO_KEY)
  state = load()
  listeners.forEach((l) => l())
}

/** Starts (or refreshes) the session with whoever just signed in. */
export const signIn = (profile: Profile, remember: boolean) => {
  if (state.demo) exitDemo()
  commit({ profile: { ...state.profile, ...profile }, data: state.profile ? state.data : emptyData(), remember, demo: false })
}

export const signOut = () => (state.demo ? exitDemo() : commit({ profile: null, data: emptyData(), remember: true, demo: false }))

export const setRemember = (remember: boolean) => commit({ ...state, remember })

/** Replaces everything that came from `sources` with the fresh result of a sync. Study notes are never touched. */
export const applySync = (sources: Source[], result: SyncResult, connections: Partial<StudentData['connections']>) => {
  const keep = <T extends { source: Source }>(old: T[], fresh: T[] | undefined) =>
    fresh === undefined ? old : [...old.filter((x) => !sources.includes(x.source)), ...fresh]
  const d = state.data
  const local = new Set(d.study.doneLocal)
  const lyceum = sources.includes('lyceum')
  commit({
    ...state,
    data: {
      // a lesson ticked here stays ticked after a sync; "delivered" only ever comes from the source
      tasks: keep(
        d.tasks,
        result.tasks?.map((t) => ({ ...t, done: (t.delivered ?? t.done) || local.has(t.id) })),
      ),
      grades: keep(d.grades, result.grades),
      subjects: lyceum && result.subjects ? result.subjects : d.subjects,
      boletim: lyceum && result.boletim ? result.boletim : d.boletim,
      notices: keep(d.notices, result.notices),
      materials: keep(d.materials, result.materials),
      events: keep(d.events, result.events),
      connections: { ...d.connections, ...connections },
      study: d.study,
    },
  })
}

/** Removes one platform's data and its connection. */
export const disconnect = (which: 'google' | 'lyceum') => {
  const sources: Source[] = which === 'google' ? ['classroom', 'agenda', 'drive'] : ['lyceum']
  const d = state.data
  const drop = <T extends { source: Source }>(xs: T[]) => xs.filter((x) => !sources.includes(x.source))
  const connections = { ...d.connections }
  delete connections[which]
  commit({
    ...state,
    data: {
      ...d,
      tasks: drop(d.tasks),
      grades: drop(d.grades),
      subjects: which === 'lyceum' ? [] : d.subjects,
      boletim: which === 'lyceum' ? [] : d.boletim,
      notices: drop(d.notices),
      materials: drop(d.materials),
      events: drop(d.events),
      connections,
    },
  })
}

// ---- Study area (all local; nothing here is ever sent to Classroom or Lyceum) ----
const study = (fn: (s: Study) => Partial<Study>, data: Partial<StudentData> = {}) =>
  commit({ ...state, data: { ...state.data, ...data, study: { ...state.data.study, ...fn(state.data.study) } } })

/** Ticks a lesson as done in Lernpilot only. A lesson already delivered at the source cannot be un-ticked here. */
export const toggleTaskDone = (id: string) => {
  const t = state.data.tasks.find((x) => x.id === id)
  if (!t || t.delivered) return
  const on = !t.done
  study((s) => ({ doneLocal: on ? [...new Set([...s.doneLocal, id])] : s.doneLocal.filter((x) => x !== id) }), {
    tasks: state.data.tasks.map((x) => (x.id === id ? { ...x, done: on } : x)),
  })
}

export const setTaskNote = (id: string, note: string) => study((s) => ({ notes: { ...s.notes, [id]: note } }))
export const saveExam = (exam: Exam) => study((s) => ({ exams: [...s.exams.filter((e) => e.id !== exam.id), exam] }))
export const removeExam = (id: string) => study((s) => ({ exams: s.exams.filter((e) => e.id !== id) }))
export const toggleTopic = (examId: string, index: number) =>
  study((s) => ({ exams: s.exams.map((e) => (e.id === examId ? { ...e, topics: e.topics.map((t, i) => (i === index ? { ...t, done: !t.done } : t)) } : e)) }))
export const setTeacherStyle = (teacherId: string, patch: Partial<TeacherStyle>) =>
  study((s) => ({ teacherStyles: { ...s.teacherStyles, [teacherId]: { ...EMPTY_STYLE, ...s.teacherStyles[teacherId], ...patch } } }))
export const addTeacher = (name: string) =>
  study((s) => {
    const id = teacherKey(undefined, name)
    return s.extraTeachers.some((t) => t.id === id) ? {} : { extraTeachers: [...s.extraTeachers, { id, name: name.trim() }] }
  })
export const setGoal = (goal: number) => study(() => ({ goal }))
/** A grade the student typed for an evaluation the portal has not published; `null` removes it. */
export const setSimulated = (key: string, grade: number | null) =>
  study((s) => {
    const simulated = { ...s.simulated }
    if (grade === null) delete simulated[key]
    else simulated[key] = grade
    return { simulated }
  })
