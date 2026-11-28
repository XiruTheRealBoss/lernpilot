/**
 * Self-check for the logic that turns school data into answers and numbers.
 * Run: npm test   (Node 22+ strips the TypeScript types itself)
 * Fixtures below are synthetic and exist only here — the site never shows sample data.
 */
import assert from 'node:assert/strict'
import { mapLyceum, toDate, toNum } from '../server/lyceum-map.ts'
import { ask } from '../src/lib/assistant.ts'
import { BOOKS, bookSlots, closest, reach } from '../src/lib/book-layout.ts'
import { addDays, nextWeekday, utcDueToLocalDay } from '../src/lib/dates.ts'
import { fit, folders, ownerKeys, titleFromFile, type ExamPhoto } from '../src/lib/exam-photos.ts'
import { deliveries, examsPerWeek, overallAverage, subjectRows, upcomingExams } from '../src/lib/stats.ts'
import { findSubject } from '../src/lib/subjects.ts'
import { EXAM_RE, emptyData, type StudentData } from '../src/lib/types.ts'

process.env.TZ = 'America/Sao_Paulo' // UTC-3, the school's zone; makes date conversions deterministic
const today = '2026-11-24' // a Tuesday

// --- Classroom due dates are UTC: 23:59 in São Paulo arrives as 02:59 next day
assert.equal(utcDueToLocalDay({ year: 2026, month: 11, day: 26 }, { hours: 2, minutes: 59 }), '2026-11-25')
assert.equal(utcDueToLocalDay({ year: 2026, month: 11, day: 26 }), '2026-11-26') // no time → 23:59 UTC → 20:59 local, same day
assert.ok(EXAM_RE.test('Klausur Mathematik') && EXAM_RE.test('Physik Test 2') && EXAM_RE.test('Prüfung Deutsch'))
assert.ok(!EXAM_RE.test('Lista de exercícios 4'))

// --- parsing helpers
assert.equal(toNum('7,5'), 7.5)
assert.equal(toNum(8), 8)
assert.equal(toNum('—'), null)
assert.equal(toDate('25/11/2026 08:00'), '2026-11-25')
assert.equal(toDate('2026-11-30T03:00:00Z'), '2026-11-30')
assert.equal(toDate(''), null)
assert.equal(nextWeekday(today, 5), '2026-11-27') // next Friday
assert.equal(findSubject('Física / Physik 2026 - 848 – Sala'), 'Física')
assert.equal(findSubject('Material de apoio'), null) // "mat" must not match inside "material"
assert.equal(findSubject('Educação Física'), 'Educação Física')

// --- Lyceum mapping (shape taken from the portal's own templates)
const mapped = mapLyceum({
  aluno: { codAluno: 'X1', nomeCurso: 'Ensino Médio', matricula: 'X1' },
  user: { id: 9, login: 'X1', name: 'ANA SOUZA' },
  responses: {
    boletim: {
      content: [
        {
          boletim: { turmaDisciplina: { disciplina: { nome: 'MATEMÁTICA' }, aulasPrevistas: 80, aulasMinistradas: 60 } },
          media: '5,5',
          faltasSubPeriodo: { faltasAcumuladas: 4 },
          aprovado: 'Matriculado',
        },
        { boletim: { turmaDisciplina: { disciplina: { nome: 'Química' } } }, media: 8, faltasSubPeriodo: { faltasAcumuladas: 1 }, aprovado: 'Matriculado' },
      ],
    },
    avisos: [{ aviso: { title: 'Simulado', content: '<p>Sábado às <b>8h</b></p>', data: '20/11/2026' } }],
    eventos: { content: [{ tipoEvento: 'Prova', descricao: 'Prova de Química', start: '2026-11-26T10:00:00' }] },
  },
  provas: [{ subject: 'MATEMÁTICA', items: [{ nomeProva: 'P1', nota: '45', notaMaxima: '100', dataProva: '10/10/2026' }] }],
})
assert.equal(mapped.profile.name, 'Ana Souza')
assert.equal(mapped.subjects.length, 2)
assert.equal(mapped.subjects[0].subject, 'Matemática')
assert.equal(mapped.subjects[0].average, 5.5)
assert.equal(mapped.subjects[0].absences, 4)
assert.equal(mapped.grades[0].value, 4.5) // 45/100 → 4.5 on 0-10
assert.equal(mapped.notices[0].body, 'Sábado às 8h')
assert.equal(mapped.notices[0].date, '2026-11-20')
assert.equal(mapped.events[0].isExam, true)
assert.equal(mapped.events[0].time, '10:00')
assert.equal(mapLyceum({ aluno: {}, user: {}, responses: {}, provas: [] }).problems.length, 1)

// --- stats + assistant over a synthetic student
const d: StudentData = {
  ...emptyData(),
  subjects: mapped.subjects,
  grades: [...mapped.grades, { id: 'g1', subject: 'Física', label: 'Lista 3', value: 9, max: 10, date: '2026-11-01', source: 'classroom' }],
  events: mapped.events,
  tasks: [
    { id: 't1', title: 'Lista de exercícios 4', subject: 'Física', due: addDays(today, 1), kind: 'licao', done: false, source: 'classroom' },
    { id: 't2', title: 'Prova de Matemática', subject: 'Matemática', due: addDays(today, 8), kind: 'prova', done: false, source: 'classroom' },
    { id: 't3', title: 'Relatório de laboratório', subject: 'Química', due: addDays(today, -2), kind: 'trabalho', done: false, source: 'classroom' },
    { id: 't4', title: 'Resumo cap. 2', subject: 'História', due: addDays(today, -5), kind: 'licao', done: true, source: 'classroom' },
  ],
  notices: mapped.notices,
}
const rows = subjectRows(d)
assert.equal(rows[0].subject, 'Matemática') // lowest first; the official average wins over the single P1
assert.equal(rows[0].official, true)
assert.equal(rows.find((r) => r.subject === 'Física')?.official, false)
assert.ok(Math.abs(overallAverage(d)! - (5.5 + 8 + 9) / 3) < 1e-9)
assert.equal(upcomingExams(d, today).length, 2)
assert.deepEqual(deliveries(d, today), { done: 1, open: 1, late: 1 })
assert.equal(
  examsPerWeek(d, today).reduce((s, w) => s + w.count, 0),
  2,
)

assert.match(ask('o que tem para amanhã?', d, today).text, /1 coisa/)
assert.match(ask('quando é a prova de química?', d, today).text, /1 prova/)
assert.match(ask('como estão minhas notas?', d, today).text, /Matemática/)
assert.match(ask('quantas faltas eu tenho?', d, today).text, /5 faltas/)
assert.match(ask('qual a cor do céu?', d, today).text, /não sei responder/)
assert.match(ask('notas', emptyData(), today).text, /Ainda não tenho nada/)

// landing page: no two floating books can ever touch, however each one is turned, has drifted or has slid sideways
const slots = bookSlots()
assert.equal(slots.length, BOOKS.length)
for (let i = 0; i < slots.length; i++)
  for (let j = i + 1; j < slots.length; j++) {
    const gap = closest(slots[i], slots[j], 80).d // every pair of positions along the two side tracks
    assert.ok(gap >= reach(BOOKS[i]) + reach(BOOKS[j]), `${BOOKS[i].title} e ${BOOKS[j].title} se cruzam`)
  }

// history of exam photos: stored size, default title, folder order, whose photos they are
assert.deepEqual(fit(4000, 3000, 2000), { w: 2000, h: 1500 })
assert.deepEqual(fit(800, 600, 2000), { w: 800, h: 600 }) // never enlarged
assert.equal(titleFromFile('IMG_2041.jpg'), 'Prova')
assert.equal(titleFromFile('prova-2_fisica.png'), 'prova 2 fisica')
const shot = (folder: string, date: string): ExamPhoto => ({ id: folder + date, owners: ['a'], folder, title: 't', date, added: 0, image: new Blob(), thumb: new Blob() })
assert.deepEqual(
  folders(['Matemática', 'Física'], [shot('Física', '2026-05-02'), shot('Simulados', '2026-06-01'), shot('Física', '2026-06-10')], ['Artes']).map((f) => [f.name, f.photos.length, f.photos[0]?.date]),
  [['Física', 2, '2026-06-10'], ['Simulados', 1, '2026-06-01'], ['Artes', 0, undefined], ['Matemática', 0, undefined]],
)
// the owner is the account, not the display name: connecting Google later must not hide the history
assert.deepEqual(ownerKeys({ name: 'Ana' }, { lyceum: { login: ' RA123 ' } }), ['lyceum:ra123'])
assert.deepEqual(ownerKeys({ name: 'Ana G.', email: 'a@x.org' }, { lyceum: { login: 'RA123' }, google: { email: 'A@x.org' } }), ['lyceum:ra123', 'google:a@x.org'])
assert.deepEqual(ownerKeys({ name: ' Ana ' }, {}), ['name:ana'])
assert.deepEqual(ownerKeys({ name: 'Ana' }, { lyceum: { login: 'RA123' } }, true), ['demo']) // the demonstration never mixes with a real account

console.log('selftest: ok')
