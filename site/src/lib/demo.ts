/**
 * Fictional student for the demo mode (/demo). Never mixed with a real account: the store keeps it
 * in memory only. Dates are relative to `today` so it always looks current.
 */
import { subjectsFromBoletim } from './boletim.ts'
import { addDays } from './dates.ts'
import { tasksInNotice } from './notice-tasks.ts'
import { emptyStudy, type BoletimDisc, type BoletimProva, type Notice, type StudentData, type Task } from './types.ts'

type Who = { teacher: string; teacherId: string; subject: string; courseId: string }
const T: Record<'mat' | 'fis' | 'his', Who> = {
  mat: { teacher: 'Helena Braun', teacherId: 'demo:t1', subject: 'Matemática', courseId: 'demo:c1' },
  fis: { teacher: 'Otto Reis', teacherId: 'demo:t2', subject: 'Física', courseId: 'demo:c2' },
  his: { teacher: 'Clara Winter', teacherId: 'demo:t3', subject: 'História', courseId: 'demo:c3' },
}

const F = (sp: string) => `PR${sp}*0.6+DS${sp}*0.3+SMS${sp}*0.1`
const p = (code: string, name: string, grade: number | null, formula?: string): BoletimProva => ({ code, name, grade, sp: code.split('_')[1], formula })
const sem1 = (g: number) => [
  p('P1_1', 'Prova 1', g, F('1')),
  p('P2_1', 'Prova 2', g),
  p('D1_1', 'Diversificada 1', g),
  p('D2_1', 'Diversificada 2', g),
  p('D3_1', 'Diversificada 3', g),
  p('SM1_1', 'Mitarbeit 1', g),
  p('SM2_1', 'Mitarbeit 2', g),
]
const who = (t: Who) => ({ teacher: t.teacher, teacherId: t.teacherId })

export function demoData(today: string): StudentData {
  const d = (n: number) => addDays(today, n)
  const url = 'https://classroom.google.com'
  const task = (id: string, t: Who, title: string, due: string | null, extra: Partial<Task> = {}): Task => ({
    id,
    title,
    due,
    kind: 'licao',
    done: false,
    delivered: false,
    source: 'classroom',
    url,
    ...t,
    ...extra,
  })
  const tasks: Task[] = [
    task('demo-1', T.mat, 'Lista 5: funções exponenciais', d(-2), {
      description: 'Exercícios 1 a 12 da apostila, capítulo 4. Mostrar o desenvolvimento das contas.',
      links: [{ title: 'Apostila, capítulo 4', url }],
    }),
    task('demo-2', T.his, 'Leitura do capítulo 8: Era Vargas', d(0), { description: 'Ler e trazer três perguntas para a discussão.' }),
    task('demo-3', T.fis, 'Relatório do experimento de queda livre', d(1), {
      kind: 'trabalho',
      description: 'Em dupla, até 2 páginas, com a tabela de medições.',
      links: [{ title: 'Modelo de relatório', url }],
    }),
    task('demo-4', T.mat, 'Prova de Matemática: funções', d(6), { kind: 'prova', description: 'Funções do 2º grau e exponenciais.' }),
    task('demo-5', T.fis, 'Lista 3: cinemática', d(12)),
    task('demo-6', T.his, 'Mapa mental da República Velha', null),
    task('demo-7', T.fis, 'Lista 2: vetores', d(-9), { done: true, delivered: true }),
  ]

  const notice = (id: string, t: Who, body: string, date: string): Notice => ({
    id,
    title: `${t.subject}: ${body.split('\n')[0].slice(0, 90)}`,
    body,
    date,
    important: /prova|atenção/i.test(body),
    source: 'classroom',
    url,
    subject: t.subject,
    ...who(t),
  })
  const notices = [
    { n: notice('demo-n1', T.his, 'Pessoal, trazer o resumo do capítulo 7 na sexta. Quem não entregar perde nota.', d(-1)), t: T.his },
    { n: notice('demo-n2', T.fis, 'O laboratório estará aberto no contraturno nesta semana.', d(-3)), t: T.fis },
  ]
  for (const { n, t } of notices)
    tasksInNotice(n.body, n.date ?? today).forEach((x, i) =>
      tasks.push(task(`nt-${n.id}-${i}`, t, x.title, x.due, { description: x.description, fromNotice: n.id, delivered: undefined })),
    )

  const open2 = [p('D2_2', 'Diversificada 2', null), p('D3_2', 'Diversificada 3', null), p('SM1_2', 'Mitarbeit 1', null), p('SM2_2', 'Mitarbeit 2', null)]
  const boletim: BoletimDisc[] = [
    {
      id: 'MAT',
      name: 'Matemática',
      ...who(T.mat),
      currentSp: '2',
      official: { '1': 7 },
      attendance: { presence: 94, absences: 4, allowed: 20 },
      provas: [...sem1(7), p('P1_2', 'Prova 1', 5, F('2')), p('P2_2', 'Prova 2', null), p('D1_2', 'Diversificada 1', 8), ...open2],
    },
    {
      id: 'FIS',
      name: 'Física',
      ...who(T.fis),
      currentSp: '2',
      official: { '1': 9 },
      attendance: { presence: 98, absences: 1, allowed: 16 },
      provas: [...sem1(9), p('P1_2', 'Prova 1', 9, F('2')), p('P2_2', 'Prova 2', null), p('D1_2', 'Diversificada 1', 9.5), p('D2_2', 'Diversificada 2', 9), p('D3_2', 'Diversificada 3', null), p('SM1_2', 'Mitarbeit 1', 10), p('SM2_2', 'Mitarbeit 2', null)],
    },
    {
      id: 'HIS',
      name: 'História',
      ...who(T.his),
      currentSp: '2',
      official: {},
      attendance: { presence: 88, absences: 7, allowed: 16 },
      // 1st semester closed below 6 on the provas mean, with a recovery grade; 2nd has a zero
      provas: [
        p('P1_1', 'Prova 1', 4, F('1')),
        p('P2_1', 'Prova 2', 4),
        p('D1_1', 'Diversificada 1', 6),
        p('D2_1', 'Diversificada 2', 6),
        p('D3_1', 'Diversificada 3', 6),
        p('SM1_1', 'Mitarbeit 1', 8),
        p('SM2_1', 'Mitarbeit 2', 8),
        p('R_1', 'Recuperação', 7),
        p('P1_2', 'Prova 1', 0, F('2')),
        p('P2_2', 'Prova 2', null),
        p('D1_2', 'Diversificada 1', 6),
        ...open2,
      ],
    },
  ]

  return {
    tasks,
    notices: notices.map((x) => x.n),
    boletim,
    subjects: subjectsFromBoletim(boletim),
    grades: boletim.flatMap((b) =>
      b.provas
        .filter((x) => x.grade !== null && /^(P|D)\d/.test(x.code))
        .map((x, i) => ({ id: `demo-g-${b.id}-${x.code}`, subject: b.name, label: `${x.sp}º sem · ${x.name}`, value: x.grade!, max: 10, date: d(x.sp === '1' ? -150 + i * 12 : -40 + i * 9), source: 'lyceum' as const })),
    ),
    materials: [
      { id: 'demo-m1', title: 'Resumo: funções exponenciais', subject: 'Matemática', kind: 'pdf', date: d(-3), source: 'classroom', url },
      { id: 'demo-m2', title: 'Slides: movimento uniformemente variado', subject: 'Física', kind: 'slides', date: d(-5), source: 'classroom', url },
    ],
    events: [{ id: 'demo-e1', title: 'Simulado geral', date: d(9), time: '07:30', isExam: true, source: 'agenda' }],
    connections: {},
    study: {
      ...emptyStudy(),
      exams: [
        {
          id: 'demo-x1',
          subject: 'Física',
          ...who(T.fis),
          date: d(20),
          topics: [
            { text: 'Movimento uniforme', done: true },
            { text: 'Queda livre', done: false },
            { text: 'Lançamento oblíquo', done: false },
          ],
        },
      ],
      teacherStyles: {
        [T.fis.teacherId]: { questionTypes: 'contas longas e uma dissertativa', difficulty: 'dificil', typicalTopics: 'gráficos de velocidade', pointsPerSection: 'Parte A 4 pts, Parte B 6 pts', notes: 'cobra a unidade em toda resposta' },
      },
    },
  }
}
