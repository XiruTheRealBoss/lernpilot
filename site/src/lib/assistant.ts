/**
 * Answers questions about the student's own synced data — no invention: every answer lists
 * the items it came from and which platform they came from.
 */
import { addDays, longDate, nextWeekday, norm, relDay, shortDate, weekdays } from './dates.ts'
import { fmt1, hasAnyData, recentNotices, subjectRows, upcomingExams } from './stats.ts'
import { findSubject } from './subjects.ts'
import { kindLabel, sourceLabel, type Source, type StudentData } from './types.ts'

export type AnswerItem = { title: string; meta: string; source: Source; url?: string; alert?: boolean }
export type Answer = { text: string; items: AnswerItem[]; link?: { to: string; label: string } }

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w))

const dayRange = (t: string, today: string): { from: string; to: string; label: string } | null => {
  if (has(t, 'depois de amanha')) return { from: addDays(today, 2), to: addDays(today, 2), label: 'depois de amanhã' }
  if (has(t, 'amanha')) return { from: addDays(today, 1), to: addDays(today, 1), label: 'amanhã' }
  if (has(t, 'hoje')) return { from: today, to: today, label: 'hoje' }
  if (has(t, 'semana que vem', 'proxima semana')) return { from: addDays(today, 7), to: addDays(today, 13), label: 'na semana que vem' }
  if (has(t, 'semana')) return { from: today, to: addDays(today, 6), label: 'nos próximos 7 dias' }
  if (/\bmes\b/.test(t)) return { from: today, to: addDays(today, 30), label: 'nos próximos 30 dias' }
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${weekdays[i]}`).test(t)) {
      const d = nextWeekday(today, i)
      return { from: d, to: d, label: `em ${longDate(d)}` }
    }
  }
  return null
}

export const ask = (question: string, data: StudentData, today: string): Answer => {
  const t = norm(question)
  const known = [...new Set([...data.tasks, ...data.grades, ...data.materials, ...data.subjects].map((x) => x.subject))]
  const subject = findSubject(question, known)
  const range = dayRange(t, today)

  if (!hasAnyData(data))
    return {
      text: 'Ainda não tenho nada seu para consultar. Entre com o Lyceum ou com o Google e eu respondo a partir disso.',
      items: [],
      link: { to: '/conexoes', label: 'Conectar contas' },
    }

  // Exams
  if (has(t, 'prova', 'avaliac', 'teste', 'simulado', 'recuperac')) {
    let xs = upcomingExams(data, today, 120)
    if (subject) xs = xs.filter((x) => x.subject === subject || norm(x.title).includes(norm(subject)))
    if (range) xs = xs.filter((x) => x.date >= range.from && x.date <= range.to)
    const where = `${subject ? ` de ${subject}` : ''}${range ? ` ${range.label}` : ''}`
    return {
      text: xs.length
        ? `${xs.length === 1 ? 'Você tem 1 prova marcada' : `Você tem ${xs.length} provas marcadas`}${where}. A mais próxima é ${relDay(xs[0].date, today)}.`
        : `Não encontrei prova marcada${where}.`,
      items: xs.slice(0, 8).map((x) => ({
        title: x.title,
        meta: `${relDay(x.date, today)} · ${shortDate(x.date)}${x.time ? ` às ${x.time}` : ''}`,
        source: x.source,
        url: x.url,
        alert: true,
      })),
      link: { to: '/tarefas', label: 'Abrir agenda' },
    }
  }

  // Grades
  if (has(t, 'nota', 'media', 'boletim', 'passar', 'aprovad', 'como estou', 'desempenho')) {
    let rows = subjectRows(data)
    if (subject) rows = rows.filter((r) => r.subject === subject)
    if (!rows.length)
      return {
        text: subject ? `Ainda não tenho notas de ${subject}.` : 'Ainda não tenho notas suas. Elas vêm do Lyceum e das atividades corrigidas no Classroom.',
        items: [],
        link: { to: '/conexoes', label: 'Conectar contas' },
      }
    const low = rows.filter((r) => r.avg < 6)
    const text = subject
      ? `Sua média em ${subject} é ${fmt1(rows[0].avg)}${rows[0].avg < 6 ? ', abaixo de 6.' : '.'}${rows[0].official ? ' É a média oficial do boletim.' : ' Calculei pelas atividades corrigidas.'}`
      : `${low.length ? `Atenção em ${low.map((r) => r.subject).join(', ')}: ${low.length === 1 ? 'está' : 'estão'} abaixo de 6.` : 'Nenhuma matéria abaixo de 6.'} A mais baixa é ${rows[0].subject} (${fmt1(rows[0].avg)}).`
    return {
      text,
      items: rows.map((r) => ({
        title: r.subject,
        meta: `Média ${fmt1(r.avg)}${r.absences !== null ? ` · ${r.absences} faltas` : ''}`,
        source: r.official ? ('lyceum' as const) : ('classroom' as const),
        alert: r.avg < 6,
      })),
      link: { to: '/estatisticas', label: 'Ver estatísticas' },
    }
  }

  // Absences
  if (has(t, 'falta', 'frequencia', 'presenca')) {
    const rows = data.subjects.filter((s) => s.absences !== null).sort((a, b) => (b.absences ?? 0) - (a.absences ?? 0))
    return {
      text: rows.length
        ? `Você tem ${rows.reduce((s, r) => s + (r.absences ?? 0), 0)} faltas somadas. Mais faltas em ${rows[0].subject} (${rows[0].absences}).`
        : 'Ainda não tenho suas faltas. Elas vêm do boletim do Lyceum.',
      items: rows.slice(0, 8).map((r) => ({
        title: r.subject,
        meta: `${r.absences} faltas${r.lessonsGiven ? ` em ${r.lessonsGiven} aulas dadas` : ''}`,
        source: 'lyceum' as const,
      })),
      link: { to: '/notas', label: 'Abrir boletim' },
    }
  }

  // Notices
  if (has(t, 'aviso', 'recado', 'comunicado', 'mural', 'escola mandou', 'novidade')) {
    const xs = recentNotices(data, 6)
    return {
      text: xs.length ? `Separei ${xs.length === 1 ? 'o último aviso' : `os ${xs.length} avisos mais recentes`}, os importantes primeiro.` : 'Nenhum aviso por enquanto.',
      items: xs.map((n) => ({
        title: n.title,
        meta: `${n.date ? `${shortDate(n.date)} · ` : ''}${n.body.slice(0, 90)}${n.body.length > 90 ? '…' : ''}`,
        source: n.source,
        url: n.url,
        alert: n.important,
      })),
      link: { to: '/avisos', label: 'Abrir mural' },
    }
  }

  // Materials
  if (has(t, 'material', 'slide', 'apostila', 'resumo', 'pdf', 'arquivo', 'doc', 'apresentac')) {
    const xs = (subject ? data.materials.filter((m) => m.subject === subject) : data.materials).slice(0, 8)
    return {
      text: xs.length ? `Encontrei ${xs.length === 1 ? '1 material' : `${xs.length} materiais`}${subject ? ` de ${subject}` : ''}.` : `Nenhum material${subject ? ` de ${subject}` : ''} por enquanto.`,
      items: xs.map((m) => ({ title: m.title, meta: `${m.subject}${m.date ? ` · ${shortDate(m.date)}` : ''}`, source: m.source, url: m.url })),
      link: { to: '/materiais', label: 'Abrir Docs & Slides' },
    }
  }

  // Homework / schedule (default when a day or a subject was named)
  if (has(t, 'licao', 'tarefa', 'dever', 'trabalho', 'entregar', 'entrega', 'atividade', 'fazer', 'pendente', 'tem o que', 'agenda') || range || subject) {
    const from = range?.from ?? today
    const to = range?.to ?? addDays(today, 7)
    let xs = data.tasks.filter((x) => !x.done && x.due && x.due >= from && x.due <= to)
    if (subject) xs = xs.filter((x) => x.subject === subject)
    xs.sort((a, b) => a.due!.localeCompare(b.due!))
    const evs = subject ? [] : data.events.filter((e) => e.date >= from && e.date <= to && !e.isExam)
    const where = `${subject ? ` de ${subject}` : ''} ${range ? range.label : 'nos próximos 7 dias'}`
    const items: AnswerItem[] = [
      ...xs.slice(0, 8).map((x) => ({
        title: x.title,
        meta: `${kindLabel[x.kind]} · ${x.subject} · ${relDay(x.due!, today)}`,
        source: x.source,
        url: x.url,
        alert: x.kind === 'prova',
      })),
      ...evs.slice(0, 4).map((e) => ({ title: e.title, meta: `${relDay(e.date, today)}${e.time ? ` às ${e.time}` : ''}`, source: e.source, url: e.url })),
    ]
    return {
      text: items.length ? `${items.length === 1 ? 'Tem 1 coisa' : `Tem ${items.length} coisas`}${where}.` : `Nada pendente${where}.`,
      items,
      link: { to: '/tarefas', label: 'Abrir agenda' },
    }
  }

  return {
    text: 'Essa eu não sei responder com os seus dados. Pergunte sobre lições, provas, notas, faltas, avisos ou materiais, por exemplo: "o que tem para amanhã?" ou "como estou em química?".',
    items: [],
  }
}

export const sourcesOf = (a: Answer) => [...new Set(a.items.map((i) => sourceLabel[i.source]))]
