/**
 * Self-check of the study area (lessons, exams, teachers, grade engine, demo). Synthetic data only.
 * Run: npm test
 */
import assert from 'node:assert/strict'
import { mapBoletim } from '../server/lyceum-map.ts'
import { evalFormula, pending, semesterStatus, withSimulated, yearAverage } from '../src/lib/boletim.ts'
import { demoData } from '../src/lib/demo.ts'
import { tasksInNotice } from '../src/lib/notice-tasks.ts'
import { bucketize, buildTeacherProfiles, examFromTask, examProgress, examSuggestions, filterTasks, topicsFromText } from '../src/lib/study.ts'
import type { BoletimDisc, Task } from '../src/lib/types.ts'

process.env.TZ = 'America/Sao_Paulo'
const today = '2026-11-24' // Tuesday
const near = (a: number | null | undefined, b: number) => assert.ok(a != null && Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`)

// ---------- 5. Grade engine, explicit expected results ----------
const demo = demoData(today)
const [MAT, FIS, HIS] = demo.boletim
// MAT 2nd sem: P1=5, D1=8, rest open; 1st sem closed at 7 → the 2nd must close at 2*6-7 = 5
let st = semesterStatus(MAT, '2', 6)
assert.equal(st.estado, 'precisa')
assert.equal(st.mira, 'ano')
near(st.alvoSem, 5)
near(st.precisa, 4.5) // 2.3 + 0.6x = 5
near(st.media, 6) // partial over what was graded: (0.6*5 + 0.3*8) / 0.9
assert.equal(st.oficial, false)
assert.equal(pending(MAT, '2').length, 5) // P2, D2, D3, SM1, SM2 — spare template slots never counted
// 1st sem: official average wins and is flagged as official
st = semesterStatus(MAT, '1', 6)
assert.deepEqual([st.estado, st.media, st.oficial], ['aprovado', 7, true])
// FIS: even with zeros in what is left, the year is safe
assert.equal(semesterStatus(FIS, '2', 6).estado, 'garantido')
near(yearAverage(FIS, 6).media, (9 + 9.175) / 2)
assert.equal(yearAverage(FIS, 6).oficial, false)
// HIS 1st sem: provas mean 4 < 6, recovery 7 counts as 6 and replaces it: 5.0 → 6.2
st = semesterStatus(HIS, '1', 6)
assert.equal(st.estado, 'recuperado')
near(st.mediaOrig, 5)
near(st.media, 6.2)
// HIS 2nd sem: a ZERO is a real grade (not "missing"): partial (0.6*0 + 0.3*6) / 0.9 = 2, needs 9
st = semesterStatus(HIS, '2', 6)
assert.equal(st.estado, 'precisa')
near(st.media, 2)
near(st.precisa, 9)
assert.equal(st.mira, 'sem') // other semester has no official average yet
// absent grades / incomplete period
const F2 = 'PR2*0.6+DS2*0.3+SMS2*0.1'
const empty: BoletimDisc = { id: 'X', name: 'X', official: {}, provas: [{ code: 'P1_2', name: 'P1', grade: null, sp: '2', formula: F2 }] }
st = semesterStatus(empty, '2', 6)
assert.deepEqual([st.estado, st.media], ['precisa', null])
assert.equal(semesterStatus({ id: 'Y', name: 'Y', official: {}, provas: [{ code: 'P1_2', name: 'P1', grade: 8, sp: '2' }] }, '2', 6).estado, 'sem') // no formula
const lostGrades: [string, number | null][] = [['P1_2', 0], ['P2_2', 0], ['D1_2', 0], ['D2_2', 0], ['D3_2', 0], ['SM1_2', null], ['SM2_2', null]]
const lost: BoletimDisc = { id: 'Z', name: 'Z', official: {}, provas: lostGrades.map(([code, grade], i) => ({ code, name: '', grade, sp: '2', formula: i ? undefined : F2 })) }
st = semesterStatus(lost, '2', 6)
assert.equal(st.estado, 'impossivel')
near(st.max, 1)
// formula functions
near(evalFormula('MIN(10, ISNULL(PE_2, PR2, PR2+PE_2))', MAT.provas, '2'), 5)
near(evalFormula('MAX(2, 3) * (1 + 1) / 4 - 0.5', [], '2'), 1)
// simulations: fill only what the portal has not published, and stay flagged
const sim = withSimulated([MAT], { 'MAT|P2_2': 10, 'MAT|P1_2': 10 })[0]
assert.equal(sim.provas.find((p) => p.code === 'P2_2')!.simulated, true)
assert.equal(sim.provas.find((p) => p.code === 'P1_2')!.grade, 5) // official grade untouched
assert.equal(semesterStatus(sim, '2', 6).estado, 'garantido')
assert.equal(MAT.provas.find((p) => p.code === 'P2_2')!.grade, null) // original not mutated
// portal shape → engine shape
const mb = mapBoletim([
  {
    nomeDisciplina: 'FÍSICA',
    nomeDocente: 'REIS, OTTO',
    codDocente: 7,
    periodo: { subPeriodoCorrente: { codSubPeriodo: 2 } },
    mediaSubperiodos: [{ nota: '9,0', periodo: { subPeriodo: { codSubPeriodo: 1 } } }],
    faltas: [{ percentualPresenca: 98, faltasAcumuladas: 1, faltasPermitidas: 16 }],
    provas: [
      { codigoProva: 'P1_2', nomeProva: '2º Semestre - Prova 1', nota: '0,0', codDisciplina: 'FIS', formulaNota: F2, periodo: { subPeriodo: { codSubPeriodo: 2 } } },
      { codigoProva: 'P2_2', nota: '' },
    ],
  },
])[0]
assert.deepEqual([mb.id, mb.name, mb.teacherId, mb.official['1'], mb.currentSp], ['FIS', 'Física', 'ly:7', 9, '2'])
assert.deepEqual(
  mb.provas.map((p) => [p.name, p.grade, p.sp]),
  [
    ['Prova 1', 0, '2'],
    ['P2_2', null, '2'],
  ],
)

// ---------- Lessons: notice parser, groups, filters ----------
const found = tasksInNotice('Pessoal, trazer o resumo do capítulo 7 na sexta. Quem não entregar perde nota.', today)
assert.deepEqual(
  found.map((x) => [x.title, x.due]),
  [['Trazer o resumo do capítulo 7 na sexta.', '2026-11-27']],
) // the consequence sentence is skipped
assert.equal(tasksInNotice('Bom fim de semana a todos, até segunda!', today).length, 0)
assert.equal(tasksInNotice('Lista de exercícios 3 para amanhã. Lista de exercícios 3 para amanhã.', today).length, 1) // deduplicated
assert.equal(demo.tasks.filter((t) => t.fromNotice).length, 1)
const open = demo.tasks.filter((t) => !t.done)
assert.deepEqual(
  bucketize(open, today).map((b) => [b.key, b.tasks.length, b.open]),
  [
    ['atrasadas', 1, true],
    ['hoje', 1, true],
    ['amanha', 1, true],
    ['semana', 2, true],
    ['depois', 1, false],
    ['semdata', 1, false],
  ],
)
assert.deepEqual(
  filterTasks(demo.tasks, 'funcoes', '').map((t) => t.id),
  ['demo-1', 'demo-4'],
) // accent-insensitive
assert.equal(
  filterTasks(demo.tasks, '', 'demo:c2').every((t) => t.subject === 'Física'),
  true,
)

// ---------- Teachers ----------
const profiles = buildTeacherProfiles(demo)
assert.deepEqual(
  profiles.map((p) => p.name),
  ['Clara Winter', 'Helena Braun', 'Otto Reis'],
)
assert.equal(profiles.find((p) => p.id === 'demo:t3')!.notices.length, 1)
// the same name coming with a different stable id stays a different person
const twin = buildTeacherProfiles({ ...demo, tasks: [...demo.tasks, { ...demo.tasks[0], id: 'q', teacherId: 'gc:other', teacher: 'Helena Braun' }] })
assert.equal(twin.filter((p) => p.name === 'Helena Braun').length, 2)

// ---------- Store: needs browser storage, so shim it before importing ----------
class Mem {
  m = new Map<string, string>()
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
}
const g = globalThis as unknown as { localStorage: Mem; sessionStorage: Mem }
g.localStorage = new Mem()
g.sessionStorage = new Mem()
// data saved by the previous version (no study, no boletim) must still load
const oldTask = { id: 'old', title: 'Antiga', subject: 'Artes', due: null, kind: 'licao', done: true, source: 'classroom' }
g.localStorage.setItem('sb:v2', JSON.stringify({ profile: { name: 'Antigo' }, remember: true, data: { tasks: [oldTask], grades: [], subjects: [], notices: [], materials: [], events: [], connections: {} } }))
const legacy = (await import('../src/lib/store.ts?legacy')).getState()
assert.deepEqual([legacy.profile?.name, legacy.data.tasks[0].done, legacy.data.study.goal, legacy.data.boletim.length], ['Antigo', true, 6, 0])
g.localStorage = new Mem()

const store = await import('../src/lib/store.ts')
const saved = () => JSON.parse(g.localStorage.getItem('sb:v2')!)
const task = (id: string) => store.getState().data.tasks.find((t) => t.id === id)!
const suggestions = () => examSuggestions(store.getState().data.tasks, store.getState().data.study.exams, today)
store.signIn({ name: 'Teste' }, true)
const fresh = (): Task[] => [
  { id: 'a', title: 'Lista 1', subject: 'Física', due: '2026-11-30', kind: 'licao', done: false, delivered: false, source: 'classroom', teacher: 'Otto Reis', teacherId: 'gc:9' },
  { id: 'b', title: 'Lista 0', subject: 'Física', due: '2026-11-10', kind: 'licao', done: true, delivered: true, source: 'classroom' },
  { id: 'c', title: 'Prova de Física', subject: 'Física', due: '2026-12-02', kind: 'prova', done: false, delivered: false, source: 'classroom', teacher: 'Otto Reis', teacherId: 'gc:9' },
]
store.applySync(['classroom'], { tasks: fresh() }, {})

// 2. Ticking a lesson changes local state only
store.toggleTaskDone('a')
assert.deepEqual([task('a').done, task('a').delivered], [true, false]) // done here, NOT delivered at Classroom
assert.deepEqual(store.getState().data.study.doneLocal, ['a'])
store.toggleTaskDone('b') // delivered at the source: cannot be un-ticked here
assert.equal(task('b').done, true)
store.applySync(['classroom'], { tasks: fresh() }, {}) // a new sync says "not delivered" — the local tick survives
assert.deepEqual([task('a').done, task('a').delivered], [true, false])
store.toggleTaskDone('a')
assert.deepEqual([task('a').done, store.getState().data.study.doneLocal], [false, []])

// 3. Accepting an exam suggestion once prevents the duplicate
assert.deepEqual(
  suggestions().map((t) => t.id),
  ['c'],
)
const exam = examFromTask(suggestions()[0], 'x1')
assert.deepEqual([exam.subject, exam.teacherId, exam.date, exam.sourceTaskId], ['Física', 'gc:9', '2026-12-02', 'c'])
store.saveExam({ ...exam, topics: topicsFromText('Queda livre\n\n Vetores ', []) })
assert.equal(suggestions().length, 0)
store.applySync(['classroom'], { tasks: fresh() }, {}) // …also after the next sync
assert.equal(suggestions().length, 0)
assert.equal(examSuggestions([{ ...fresh()[2], due: '2026-11-01' }], [], today).length, 0) // past exams are not suggested

// 4. Checklist, progress and teacher data survive editing and a reload
store.toggleTopic('x1', 1)
let e = store.getState().data.study.exams[0]
assert.deepEqual(examProgress(e), { done: 1, total: 2, pct: 50 })
store.saveExam({ ...e, date: '2026-12-03', topics: topicsFromText('Queda livre\nVetores\nEnergia', e.topics) }) // edit: ticks kept by text
e = store.getState().data.study.exams[0]
assert.deepEqual([store.getState().data.study.exams.length, e.date, e.topics.map((t) => t.done)], [1, '2026-12-03', [false, true, false]])
store.setTeacherStyle('gc:9', { difficulty: 'dificil', questionTypes: 'contas' })
store.setTeacherStyle('gc:9', { notes: 'cobra unidade' })
store.addTeacher('Ana Müller')
store.addTeacher('ana müller') // same person, not added twice
store.setTaskNote('a', 'pág. 40')
store.setGoal(7)
store.setSimulated('FIS|P2_2', 8.5)
const reloaded = (await import('../src/lib/store.ts?reload')).getState().data.study // a fresh module = page reload
assert.deepEqual(reloaded.exams[0].topics, [
  { text: 'Queda livre', done: false },
  { text: 'Vetores', done: true },
  { text: 'Energia', done: false },
])
assert.deepEqual(reloaded.teacherStyles['gc:9'], { questionTypes: 'contas', difficulty: 'dificil', typicalTopics: '', pointsPerSection: '', notes: 'cobra unidade' })
assert.deepEqual([reloaded.extraTeachers.length, reloaded.notes.a, reloaded.goal, reloaded.simulated['FIS|P2_2']], [1, 'pág. 40', 7, 8.5])
store.setSimulated('FIS|P2_2', null)
assert.deepEqual(store.getState().data.study.simulated, {})

// 1. Demo works with no credentials/env, and never touches the saved account
assert.equal(process.env.VITE_GOOGLE_CLIENT_ID, undefined)
const before = g.localStorage.getItem('sb:v2')
store.enterDemo()
assert.deepEqual([store.getState().demo, store.getState().profile?.name, store.getState().data.boletim.length], [true, 'Aluno Demo', 3])
assert.deepEqual(Object.keys(store.getState().data.connections), []) // nothing pretends to be connected
store.toggleTaskDone('demo-2')
store.saveExam(examFromTask(task('demo-4'), 'dx'))
assert.equal(store.getState().data.study.exams.length, 2)
assert.equal(g.localStorage.getItem('sb:v2'), before) // real account untouched while in demo
assert.equal((await import('../src/lib/store.ts?demo-reload')).getState().demo, true) // demo survives a reload of the tab
store.signOut() // leaving the demo returns to the real account instead of wiping it
assert.deepEqual([store.getState().demo, store.getState().profile?.name, saved().data.study.goal], [false, 'Teste', 7])

console.log('selftest-study: ok')
