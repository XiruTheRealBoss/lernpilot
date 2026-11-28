/**
 * Google sign-in + read-only sync of Classroom, Agenda (Calendar) and Drive (Docs/Slides),
 * straight from the browser with Google Identity Services. Needs VITE_GOOGLE_CLIENT_ID (.env).
 * The access token lives in memory only and is never stored.
 */
import { addDays, iso, todayIso, utcDueToLocalDay } from './dates.ts'
import { tasksInNotice } from './notice-tasks.ts'
import { findSubject } from './subjects.ts'
import {
  EXAM_RE,
  WORK_RE,
  type CalendarEvent,
  type Grade,
  type GoogleConnection,
  type Material,
  type MaterialKind,
  type Notice,
  type SyncResult,
  type Task,
} from './types.ts'

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || ''
export const googleConfigured = GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')

const SCOPE = {
  classroom: [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.announcements.readonly',
    'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  ],
  agenda: ['https://www.googleapis.com/auth/calendar.events.readonly'],
  drive: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
}
const ALL_SCOPES = ['openid', 'email', 'profile', ...SCOPE.classroom, ...SCOPE.agenda, ...SCOPE.drive].join(' ')

type TokenResponse = { access_token?: string; scope?: string; error?: string; error_description?: string }
type Gis = {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string
        scope: string
        include_granted_scopes?: boolean
        callback: (r: TokenResponse) => void
        error_callback?: (e: { type: string; message?: string }) => void
      }) => { requestAccessToken: (o?: { prompt?: string; login_hint?: string }) => void }
      revoke: (token: string, done?: () => void) => void
    }
  }
}
declare global {
  interface Window {
    google?: Gis
  }
}

let gisPromise: Promise<Gis> | null = null
const loadGis = () =>
  (gisPromise ??= new Promise<Gis>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('gis')))
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Não consegui carregar o login do Google. Confira sua internet.'))
    }
    document.head.appendChild(s)
  }))

/** Load the Google script ahead of the click, so the consent popup isn't blocked. */
export const preloadGoogle = () => {
  if (googleConfigured) void loadGis().catch(() => undefined)
}

/** Opens Google's consent popup (must be called from a click). */
export const requestGoogleToken = async (hint?: string) => {
  if (!googleConfigured) throw new Error('O login com Google ainda não foi configurado neste site.')
  const gis = await loadGis()
  return new Promise<{ token: string; scopes: string[] }>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: ALL_SCOPES,
      include_granted_scopes: true,
      callback: (r) =>
        r.access_token
          ? resolve({ token: r.access_token, scopes: (r.scope ?? '').split(' ').filter(Boolean) })
          : reject(new Error(r.error === 'access_denied' ? 'Você cancelou o acesso ao Google.' : (r.error_description ?? 'O Google recusou o acesso.'))),
      error_callback: (e) =>
        reject(
          new Error(
            e.type === 'popup_closed'
              ? 'A janela do Google foi fechada antes de terminar.'
              : e.type === 'popup_failed_to_open'
                ? 'O navegador bloqueou a janela do Google. Libere pop-ups para este site.'
                : 'Não consegui abrir o login do Google.',
          ),
        ),
    })
    client.requestAccessToken({ prompt: '', login_hint: hint })
  })
}

class GoogleApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const api = async <T,>(token: string, url: string): Promise<T> => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) {
    let msg = `${r.status}`
    try {
      msg = ((await r.json()) as { error?: { message?: string } }).error?.message ?? msg
    } catch {
      /* keep status */
    }
    throw new GoogleApiError(r.status, msg)
  }
  return r.json() as Promise<T>
}

const why = (area: string, e: unknown) => {
  const status = e instanceof GoogleApiError ? e.status : 0
  if (status === 403) return `${area}: a escola bloqueou esse acesso para apps externos, ou a API não está ativada no projeto do Google.`
  if (status === 401) return `${area}: o acesso do Google expirou. Sincronize de novo.`
  return `${area}: não consegui ler agora (${e instanceof Error ? e.message : 'erro'}).`
}

const subjectFrom = (courseName: string) => findSubject(courseName) ?? courseName.split(/\s[/–-]\s|\s\d{4}/)[0].trim()

type GDate = { year: number; month: number; day: number }
type GTime = { hours?: number; minutes?: number }

type Course = { id: string; name: string; alternateLink?: string }
type CourseWork = { id: string; title: string; description?: string; creatorUserId?: string; materials?: MaterialItem[]; dueDate?: GDate; dueTime?: GTime; alternateLink?: string; maxPoints?: number; workType?: string }
type Submission = { courseWorkId: string; state?: string; assignedGrade?: number; late?: boolean; updateTime?: string }
type Announcement = { id: string; text?: string; creatorUserId?: string; updateTime?: string; alternateLink?: string }
type MaterialItem = {
  driveFile?: { driveFile?: { title?: string; alternateLink?: string } }
  link?: { title?: string; url?: string }
  youtubeVideo?: { title?: string; alternateLink?: string }
  form?: { title?: string; formUrl?: string }
}
type CourseMaterial = { id: string; title: string; updateTime?: string; alternateLink?: string; materials?: MaterialItem[] }

const kindFromName = (name: string): MaterialKind =>
  /\.pdf$/i.test(name)
    ? 'pdf'
    : /slide|apresenta|\.pptx?$/i.test(name)
      ? 'slides'
      : /\.xlsx?$|planilha/i.test(name)
        ? 'sheet'
        : /\.docx?$/i.test(name)
          ? 'doc'
          : 'file'

const linkOf = (it: MaterialItem) => {
  const f = it.driveFile?.driveFile
  const url = f?.alternateLink ?? it.link?.url ?? it.youtubeVideo?.alternateLink ?? it.form?.formUrl
  return url ? { title: f?.title ?? it.link?.title ?? it.youtubeVideo?.title ?? it.form?.title ?? url, url } : null
}

async function syncClassroom(token: string) {
  // Teacher names by Classroom user id (stable). If the school hides profiles, the teacher is simply left out.
  const names = new Map<string, Promise<string | undefined>>()
  const teacherOf = async (userId?: string) => {
    if (!userId) return {}
    if (!names.has(userId))
      names.set(
        userId,
        api<{ name?: { fullName?: string } }>(token, `https://classroom.googleapis.com/v1/userProfiles/${encodeURIComponent(userId)}`).then(
          (p) => p.name?.fullName,
          () => undefined,
        ),
      )
    const teacher = await names.get(userId)
    return teacher ? { teacher, teacherId: `gc:${userId}` } : {}
  }
  const today = todayIso()
  const { courses = [] } = await api<{ courses?: Course[] }>(token, 'https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE&pageSize=60')
  const tasks: Task[] = []
  const grades: Grade[] = []
  const notices: Notice[] = []
  const materials: Material[] = []
  const C = 'https://classroom.googleapis.com/v1/courses'
  await Promise.all(
    courses.map(async (c) => {
      const subject = subjectFrom(c.name)
      const id = encodeURIComponent(c.id)
      const [work, subs, ann, mats] = await Promise.all([
        api<{ courseWork?: CourseWork[] }>(token, `${C}/${id}/courseWork?pageSize=60&orderBy=updateTime%20desc`).catch(() => ({ courseWork: [] })),
        api<{ studentSubmissions?: Submission[] }>(token, `${C}/${id}/courseWork/-/studentSubmissions?userId=me&pageSize=200`).catch(() => ({ studentSubmissions: [] })),
        api<{ announcements?: Announcement[] }>(token, `${C}/${id}/announcements?pageSize=15&orderBy=updateTime%20desc`).catch(() => ({ announcements: [] })),
        api<{ courseWorkMaterial?: CourseMaterial[] }>(token, `${C}/${id}/courseWorkMaterials?pageSize=40&orderBy=updateTime%20desc`).catch(() => ({ courseWorkMaterial: [] })),
      ])
      const byWork = new Map((subs.studentSubmissions ?? []).map((s) => [s.courseWorkId, s]))
      for (const w of work.courseWork ?? []) {
        const s = byWork.get(w.id)
        const delivered = s?.state === 'TURNED_IN' || s?.state === 'RETURNED'
        tasks.push({
          ...(await teacherOf(w.creatorUserId)),
          delivered,
          description: w.description?.trim() || undefined,
          courseId: c.id,
          links: (w.materials ?? []).map(linkOf).filter((x): x is { title: string; url: string } => x !== null),
          id: `gc-${w.id}`,
          title: w.title,
          subject,
          due: w.dueDate ? utcDueToLocalDay(w.dueDate, w.dueTime) : null,
          kind: EXAM_RE.test(w.title) ? 'prova' : WORK_RE.test(w.title) ? 'trabalho' : 'licao',
          done: delivered,
          source: 'classroom',
          url: w.alternateLink,
        })
        if (typeof s?.assignedGrade === 'number' && w.maxPoints) {
          grades.push({
            id: `gg-${w.id}`,
            subject,
            label: w.title,
            value: (s.assignedGrade / w.maxPoints) * 10,
            max: 10,
            date: s.updateTime ? iso(new Date(s.updateTime)) : null,
            source: 'classroom',
            url: w.alternateLink,
          })
        }
      }
      for (const a of ann.announcements ?? []) {
        const text = (a.text ?? '').trim()
        if (!text) continue
        const who = await teacherOf(a.creatorUserId)
        const date = a.updateTime ? iso(new Date(a.updateTime)) : null
        // homework hidden in the notice text becomes a lesson, linked back to the notice
        tasksInNotice(text, date ?? today).forEach((x, i) =>
          tasks.push({ id: `nt-ga-${a.id}-${i}`, title: x.title, description: x.description, due: x.due, subject, courseId: c.id, kind: EXAM_RE.test(x.title) ? 'prova' : 'licao', done: false, source: 'classroom', url: a.alternateLink, fromNotice: `ga-${a.id}`, ...who }),
        )
        notices.push({
          ...who,
          subject,
          id: `ga-${a.id}`,
          title: `${subject}: ${text.split('\n')[0].slice(0, 90)}`,
          body: text,
          date: a.updateTime ? iso(new Date(a.updateTime)) : null,
          important: /urgente|importante|aten[cç][aã]o|prova/i.test(text),
          source: 'classroom',
          url: a.alternateLink,
        })
      }
      for (const m of mats.courseWorkMaterial ?? []) {
        const date = m.updateTime ? iso(new Date(m.updateTime)) : null
        const items: MaterialItem[] = m.materials?.length ? m.materials : [{ link: { title: m.title, url: m.alternateLink } }]
        items.forEach((it, i) => {
          const f = it.driveFile?.driveFile
          const title = f?.title ?? it.link?.title ?? it.youtubeVideo?.title ?? it.form?.title ?? m.title
          const url = f?.alternateLink ?? it.link?.url ?? it.youtubeVideo?.alternateLink ?? it.form?.formUrl ?? m.alternateLink
          const kind: MaterialKind = f ? kindFromName(title) : it.youtubeVideo ? 'video' : it.form ? 'form' : 'link'
          materials.push({ id: `gm-${m.id}-${i}`, title: title || m.title, subject, kind, url, date, source: 'classroom' })
        })
      }
    }),
  )
  return { courses: courses.length, tasks, grades, notices, materials }
}

type GEvent = { id: string; summary?: string; htmlLink?: string; start?: { date?: string; dateTime?: string }; status?: string }
async function syncAgenda(token: string): Promise<CalendarEvent[]> {
  const today = todayIso()
  const min = new Date(addDays(today, -14) + 'T00:00:00').toISOString()
  const max = new Date(addDays(today, 90) + 'T00:00:00').toISOString()
  const r = await api<{ items?: GEvent[] }>(
    token,
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(min)}&timeMax=${encodeURIComponent(max)}`,
  )
  return (r.items ?? [])
    .filter((e) => e.status !== 'cancelled' && (e.start?.date || e.start?.dateTime))
    .map((e) => {
      const dt = e.start?.dateTime ? new Date(e.start.dateTime) : null
      const title = e.summary?.trim() || '(sem título)'
      return {
        id: `ge-${e.id}`,
        title,
        date: e.start?.date ?? iso(dt!),
        time: dt ? `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}` : null,
        isExam: EXAM_RE.test(title),
        source: 'agenda' as const,
        url: e.htmlLink,
      }
    })
}

type GFile = { id: string; name: string; mimeType: string; webViewLink?: string; modifiedTime?: string }
async function syncDrive(token: string): Promise<Material[]> {
  const q = encodeURIComponent(
    "(mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/pdf') and trashed=false",
  )
  const r = await api<{ files?: GFile[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime%20desc&pageSize=60&fields=files(id,name,mimeType,webViewLink,modifiedTime)`,
  )
  return (r.files ?? []).map((f) => ({
    id: `gd-${f.id}`,
    title: f.name,
    subject: findSubject(f.name) ?? 'Geral',
    kind: f.mimeType.endsWith('document') ? 'doc' : f.mimeType.endsWith('presentation') ? 'slides' : f.mimeType.endsWith('spreadsheet') ? 'sheet' : 'pdf',
    url: f.webViewLink,
    date: f.modifiedTime ? iso(new Date(f.modifiedTime)) : null,
    source: 'drive' as const,
  }))
}

/** Reads everything the student allowed on Google's consent screen. */
export async function syncGoogle(token: string, scopes: string[]): Promise<{ result: SyncResult; connection: GoogleConnection }> {
  const me = await api<{ name?: string; email?: string; picture?: string }>(token, 'https://www.googleapis.com/oauth2/v3/userinfo')
  const has = (list: string[]) => list.every((s) => scopes.includes(s))
  const problems: string[] = []
  const result = { tasks: [] as Task[], grades: [] as Grade[], notices: [] as Notice[], materials: [] as Material[], events: [] as CalendarEvent[] }
  let courses = 0

  const jobs: Promise<void>[] = []
  if (has(SCOPE.classroom))
    jobs.push(
      syncClassroom(token).then(
        (c) => {
          courses = c.courses
          result.tasks.push(...c.tasks)
          result.grades.push(...c.grades)
          result.notices.push(...c.notices)
          result.materials.push(...c.materials)
        },
        (e) => void problems.push(why('Classroom', e)),
      ),
    )
  else problems.push('Classroom: a permissão do Classroom não foi marcada na tela do Google.')
  if (has(SCOPE.agenda))
    jobs.push(
      syncAgenda(token).then(
        (ev) => void result.events.push(...ev),
        (e) => void problems.push(why('Agenda', e)),
      ),
    )
  else problems.push('Agenda: a permissão da Agenda não foi marcada na tela do Google.')
  if (has(SCOPE.drive))
    jobs.push(
      syncDrive(token).then(
        (m) => void result.materials.push(...m),
        (e) => void problems.push(why('Drive', e)),
      ),
    )
  else problems.push('Docs e Slides: a permissão do Drive não foi marcada na tela do Google.')
  await Promise.all(jobs)

  return {
    result,
    connection: {
      email: me.email ?? '',
      name: me.name ?? me.email ?? 'Aluno',
      picture: me.picture,
      syncedAt: new Date().toISOString(),
      scopes,
      courses,
      problems,
    },
  }
}
