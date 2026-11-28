/**
 * Turns the Lyceum portal's JSON into StudentData pieces. Field names come from the portal's
 * own templates (boletim-deck, boletim-provas, avisos-list, agenda-list); every read is defensive
 * because the exact shape is only confirmed after a real student signs in (see /diagnostic).
 */
import { iso } from '../src/lib/dates.ts'
import { findSubject } from '../src/lib/subjects.ts'
import { subjectsFromBoletim } from '../src/lib/boletim.ts'
import { EXAM_RE, type BoletimDisc, type CalendarEvent, type Grade, type Notice, type SubjectSummary, type Task } from '../src/lib/types.ts'

export type LyceumRaw = {
  aluno: Record<string, unknown>
  user: Record<string, unknown>
  responses: Record<string, unknown>
  provas: { subject: string; items: Record<string, unknown>[] }[]
}

export type LyceumMapped = {
  profile: { name: string; login: string; course: string | null }
  subjects: SubjectSummary[]
  grades: Grade[]
  notices: Notice[]
  events: CalendarEvent[]
  tasks: Task[]
  boletim: BoletimDisc[]
  problems: string[]
}

type Obj = Record<string, any>

export const toNum = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const m = /-?\d+(?:[.,]\d+)?/.exec(v)
  return m ? Number(m[0].replace(',', '.')) : null
}

/** Accepts epoch ms, ISO strings, "dd/MM/yyyy[ HH:mm]". Returns local YYYY-MM-DD. */
export const toDate = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return iso(new Date(v))
  const s = String(v).trim()
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (br) return iso(new Date(+br[3], +br[2] - 1, +br[1]))
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (isoDay) return `${isoDay[1]}-${isoDay[2]}-${isoDay[3]}`
  if (/^\d{10,13}$/.test(s)) return iso(new Date(+s))
  return null
}

export const toTime = (v: unknown): string | null => {
  const m = /(\d{1,2}):(\d{2})/.exec(String(v ?? ''))
  return m && !(m[1] === '00' && m[2] === '00') ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

const stripHtml = (s: unknown) =>
  String(s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const listOf = (v: unknown): Obj[] => (Array.isArray(v) ? v : Array.isArray((v as Obj)?.content) ? (v as Obj).content : [])

const titleCase = (s: string) =>
  s.length > 3 && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()) : s

const subjectName = (raw: unknown) => {
  const s = titleCase(String(raw ?? '').trim())
  return findSubject(s) ?? s
}

/** Grades on other scales (e.g. 0-100) are brought to 0-10 for comparisons. */
const scale10 = (value: number, max: number) => (max > 0 ? (value / max) * 10 : value)

/** The full report card (apix/pessoas/…/boletim), trimmed to what src/lib/boletim.ts reads. */
export function mapBoletim(raw: unknown): BoletimDisc[] {
  const spOf = (x: Obj | undefined) => (x?.periodo?.subPeriodo?.codSubPeriodo != null ? String(x.periodo.subPeriodo.codSubPeriodo) : null)
  return listOf(raw)
    .filter((d) => d?.nomeDisciplina)
    .map((d): BoletimDisc => {
      const provas = listOf(d.provas).filter((p) => p?.codigoProva)
      const official: Record<string, number> = {}
      for (const m of listOf(d.mediaSubperiodos)) {
        const sp = spOf(m)
        const n = toNum(m.nota)
        if (sp && n !== null) official[sp] = n
      }
      const f = listOf(d.faltas)[0]
      const cur = d.periodo?.subPeriodoCorrente?.codSubPeriodo
      return {
        id: String(provas[0]?.codDisciplina ?? d.codDisciplina ?? d.disciplina ?? d.nomeDisciplina),
        name: subjectName(d.nomeDisciplina),
        teacher: d.nomeDocente ? titleCase(String(d.nomeDocente).trim()) : undefined,
        teacherId: d.codDocente != null ? `ly:${d.codDocente}` : undefined,
        provas: provas.map((p) => ({
          code: String(p.codigoProva),
          name: String(p.nomeProva ?? p.codigoProva).replace(/^\d+º\s*Semestre\s*-\s*/, ''),
          grade: toNum(p.nota),
          sp: spOf(p) ?? /_(\d+)$/.exec(String(p.codigoProva))?.[1] ?? '',
          formula: p.formulaNota ? String(p.formulaNota) : undefined,
        })),
        official,
        attendance: f ? { presence: toNum(f.percentualPresenca), absences: toNum(f.faltasAcumuladas), allowed: toNum(f.faltasPermitidas) } : undefined,
        currentSp: cur != null ? String(cur) : undefined,
      }
    })
}

export function mapLyceum(raw: LyceumRaw): LyceumMapped {
  const problems: string[] = []
  const a = raw.aluno as Obj
  const u = raw.user as Obj

  // Report card: one line per subject
  const rows = listOf(raw.responses.boletim).length ? listOf(raw.responses.boletim) : listOf(raw.responses.boletimNovo)
  const subjects: SubjectSummary[] = rows
    .map((r) => {
      const td = r?.boletim?.turmaDisciplina ?? r?.turmaDisciplina ?? {}
      const name = td?.disciplina?.nome ?? r?.disciplina?.nome ?? r?.nomeDisciplina ?? r?.disciplina
      if (!name) return null
      const avg = toNum(r?.media ?? r?.nota ?? r?.mediaFinal)
      return {
        subject: subjectName(name),
        average: avg,
        absences: toNum(r?.faltasSubPeriodo?.faltasAcumuladas ?? r?.faltas ?? r?.totalFaltas),
        status: r?.aprovado ? String(r.aprovado) : null,
        lessonsPlanned: toNum(td?.aulasPrevistas),
        lessonsGiven: toNum(td?.aulasMinistradas),
      } satisfies SubjectSummary
    })
    .filter((x): x is SubjectSummary => x !== null)
  if (!rows.length) problems.push('O Lyceum não devolveu o boletim por disciplina para esta conta.')

  // Evaluations per subject
  const grades: Grade[] = []
  for (const block of raw.provas) {
    for (const p of block.items) {
      const value = toNum(p.nota)
      if (value === null) continue
      const max = toNum(p.notaMaxima) || 10
      grades.push({
        id: `lyc-${grades.length}-${String(p.codProva ?? p.ordemProva ?? '')}`,
        subject: subjectName(block.subject),
        label: String(p.nomeProva ?? p.descricao ?? 'Avaliação'),
        value: scale10(value, max),
        max: 10,
        date: toDate(p.dataProva),
        source: 'lyceum',
      })
    }
  }
  // Fallback: "últimas notas" list when per-subject evaluations were not available
  if (!grades.length) {
    for (const n of listOf(raw.responses.ultimasNotas)) {
      const value = toNum(n.nota ?? n.valor)
      if (value === null) continue
      const max = toNum(n.notaMaxima) || 10
      grades.push({
        id: `lyc-u${grades.length}`,
        subject: subjectName(n.nomeDisciplina ?? n.disciplina?.nome ?? n.disciplina ?? 'Geral'),
        label: String(n.nomeProva ?? n.descricao ?? 'Avaliação'),
        value: scale10(value, max),
        max: 10,
        date: toDate(n.dataProva ?? n.data),
        source: 'lyceum',
      })
    }
  }

  // Notices
  const avisosSrc = listOf(raw.responses.avisos).length ? listOf(raw.responses.avisos) : listOf(raw.responses.avisosAntigo)
  const notices: Notice[] = avisosSrc.map((x, i) => {
    const av = x?.aviso ?? x
    const body = stripHtml(av?.content ?? av?.conteudo ?? av?.texto ?? av?.mensagem)
    const title = stripHtml(av?.title ?? av?.titulo ?? av?.assunto) || body.split('\n')[0].slice(0, 80) || 'Aviso da escola'
    return {
      id: `lyc-a${i}-${String(av?.codAviso ?? av?.id ?? '')}`,
      title,
      body,
      date: toDate(av?.data ?? av?.dataPublicacao ?? av?.dtInicio),
      important: /urgente|importante|aten[cç][aã]o/i.test(`${title} ${body}`),
      source: 'lyceum',
    }
  })

  // Calendar events (provas marcadas, eventos)
  const events: CalendarEvent[] = listOf(raw.responses.eventos)
    .map((e, i): CalendarEvent | null => {
      const date = toDate(e.start ?? e.dataInicio ?? e.data ?? e.dataHora)
      if (!date) return null
      const title = stripHtml(e.title ?? e.descricao ?? e.tipoEvento ?? 'Evento')
      const kind = `${e.tipoEvento ?? ''} ${title}`
      return {
        id: `lyc-e${i}`,
        title: e.nomeSubdisciplina ? `${title} — ${e.nomeSubdisciplina}` : title,
        date,
        time: toTime(e.start ?? e.dataHora ?? e.horaInicio),
        isExam: EXAM_RE.test(kind),
        source: 'lyceum' as const,
      }
    })
    .filter((x): x is CalendarEvent => x !== null)

  // Tasks (homework assigned through Lyceum)
  const tasks: Task[] = listOf(raw.responses.tarefas)
    .map((t, i) => {
      const title = stripHtml(t.titulo ?? t.descricao ?? t.nome)
      if (!title) return null
      const subject = subjectName(t.disciplina?.nome ?? t.nomeDisciplina ?? findSubject(title) ?? 'Geral')
      return {
        id: `lyc-t${i}-${String(t.idTarefa ?? t.id ?? '')}`,
        title,
        subject,
        due: toDate(t.dataEntrega ?? t.dataFim ?? t.prazo),
        kind: EXAM_RE.test(title) ? ('prova' as const) : ('licao' as const),
        done: /entregue|conclu/i.test(String(t.status ?? t.situacao ?? '')),
        source: 'lyceum' as const,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // With the full report card, averages come from the same engine the Notas page uses (official when closed).
  const boletim = mapBoletim(raw.responses.boletimCompleto)
  const fromBoletim = subjectsFromBoletim(boletim)
  if (fromBoletim.length) {
    const old = new Map(subjects.map((s) => [s.subject, s]))
    subjects.splice(0, subjects.length, ...fromBoletim.map((s) => ({ ...s, status: old.get(s.subject)?.status ?? null, lessonsGiven: old.get(s.subject)?.lessonsGiven ?? null, lessonsPlanned: old.get(s.subject)?.lessonsPlanned ?? null })))
    const i = problems.findIndex((p) => p.includes('boletim por disciplina'))
    if (i >= 0) problems.splice(i, 1)
  }

  return {
    boletim,
    profile: {
      name: titleCase(String(u.name ?? u.nome ?? a.nome ?? a.user?.name ?? 'Aluno')),
      login: String(u.login ?? a.matricula ?? a.codAluno ?? ''),
      course: a.nomeCurso ? String(a.nomeCurso) : null,
    },
    subjects,
    grades,
    notices,
    events,
    tasks,
    problems,
  }
}
