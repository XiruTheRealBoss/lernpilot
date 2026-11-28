export type Source = 'classroom' | 'lyceum' | 'agenda' | 'drive'
export type TaskKind = 'licao' | 'prova' | 'trabalho'

export type Task = {
  id: string
  title: string
  subject: string
  due: string | null // YYYY-MM-DD
  kind: TaskKind
  done: boolean
  source: Source
  url?: string
  /** Delivered at the source (Classroom).  = delivered OR ticked locally in Lernpilot. */
  delivered?: boolean
  description?: string
  courseId?: string
  teacher?: string
  teacherId?: string // stable id from the source, e.g. Classroom creatorUserId
  links?: { title: string; url: string }[]
  /** Found inside a teacher's notice by the parser, not a real Classroom assignment. */
  fromNotice?: string
}

/** One graded evaluation (a test, an assignment). */
export type Grade = {
  id: string
  subject: string
  label: string
  value: number
  max: number
  date: string | null
  source: Source
  url?: string
}

/** The school's official line for a subject in the report card (Lyceum). */
export type SubjectSummary = {
  subject: string
  average: number | null // 0-10 scale
  absences: number | null
  status: string | null // "Aprovado", "Matriculado"…
  lessonsPlanned: number | null
  lessonsGiven: number | null
  /** false when the average is a partial computed by Lernpilot, not the school's closed average. */
  official?: boolean
  teacher?: string
  teacherId?: string
}

export type Notice = {
  id: string
  title: string
  body: string
  date: string | null
  important: boolean
  source: Source
  url?: string
  subject?: string
  teacher?: string
  teacherId?: string
}

export type MaterialKind = 'doc' | 'slides' | 'sheet' | 'pdf' | 'link' | 'video' | 'form' | 'file'
export type Material = {
  id: string
  title: string
  subject: string
  kind: MaterialKind
  url?: string
  date: string | null
  source: Source
}

export type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string | null // "14:30"
  isExam: boolean
  source: Source
  url?: string
}

export type GoogleConnection = {
  email: string
  name: string
  picture?: string
  syncedAt: string
  scopes: string[]
  courses: number
  problems: string[]
}

export type LyceumConnection = {
  name: string
  login: string
  course: string | null
  syncedAt: string
  problems: string[]
}

// ---- Lyceum report card, trimmed to what the grade engine reads ----
export type BoletimProva = { code: string; name: string; grade: number | null; sp: string; formula?: string; simulated?: boolean }
export type BoletimDisc = {
  id: string
  name: string
  teacher?: string
  teacherId?: string
  provas: BoletimProva[]
  /** Official closed average per sub-period ('1' | '2'). */
  official: Record<string, number>
  attendance?: { presence: number | null; absences: number | null; allowed: number | null }
  currentSp?: string
}

// ---- Study area (written by the student, kept on this device) ----
export type TeacherStyle = { questionTypes: string; difficulty: '' | 'facil' | 'media' | 'dificil'; typicalTopics: string; pointsPerSection: string; notes: string }
export const EMPTY_STYLE: TeacherStyle = { questionTypes: '', difficulty: '', typicalTopics: '', pointsPerSection: '', notes: '' }
export type Exam = { id: string; subject: string; teacherId: string; teacher: string; date: string; topics: { text: string; done: boolean }[]; sourceTaskId?: string }
export type Study = {
  exams: Exam[]
  teacherStyles: Record<string, TeacherStyle> // by teacher id
  extraTeachers: { id: string; name: string }[]
  notes: Record<string, string> // by task id
  doneLocal: string[] // task ids ticked here (never sent to Classroom)
  goal: number
  simulated: Record<string, number> // 'discId|provaCode' -> grade typed by the student
}
export const emptyStudy = (): Study => ({ exams: [], teacherStyles: {}, extraTeachers: [], notes: {}, doneLocal: [], goal: 6, simulated: {} })

export type StudentData = {
  boletim: BoletimDisc[]
  study: Study
  tasks: Task[]
  grades: Grade[]
  subjects: SubjectSummary[]
  notices: Notice[]
  materials: Material[]
  events: CalendarEvent[]
  connections: { google?: GoogleConnection; lyceum?: LyceumConnection }
}

/** What one source returns from a sync; replaces that source's items. */
export type SyncResult = Partial<Omit<StudentData, 'connections' | 'study'>>

export type Profile = { name: string; email?: string; picture?: string }

export const emptyData = (): StudentData => ({
  tasks: [],
  grades: [],
  subjects: [],
  notices: [],
  materials: [],
  events: [],
  connections: {},
  boletim: [],
  study: emptyStudy(),
})

export const sourceLabel: Record<Source, string> = {
  classroom: 'Google Classroom',
  lyceum: 'Lyceum',
  agenda: 'Google Agenda',
  drive: 'Google Drive',
}

export const kindLabel: Record<TaskKind, string> = { licao: 'Lição', prova: 'Prova', trabalho: 'Trabalho' }

// Includes German terms (bilingual school): Klausur, Klassenarbeit, Prüfung, Test
export const EXAM_RE = /\b(prova|provas|avalia[cç][aã]o|avaliacoes|avaliações|teste|test|simulado|recupera[cç][aã]o|p[1-4]|exame|klausur|klassenarbeit|pr[uü]fung)\b/i
export const WORK_RE = /\b(trabalho|semin[aá]rio|projeto|relat[oó]rio|apresenta[cç][aã]o)\b/i
