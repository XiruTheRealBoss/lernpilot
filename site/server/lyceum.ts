/**
 * Lyceum relay — signs in to the school's "Aluno Online" portal with the student's own
 * login, reads their data and hands it to the app. Runs inside the Vite dev/preview server.
 *
 * - Talks to ONE host only (LYCEUM_BASE); it is not a generic proxy: every URL is built here.
 * - The password is used for one request and never stored or logged.
 * - The portal session (cookies) lives in memory, keyed by an HttpOnly cookie, for 30 min.
 * shortcut: in-memory sessions on this machine; a public deploy would route classmates'
 * passwords through your server — decide that consciously before hosting it.
 */
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { mapLyceum, type LyceumRaw } from './lyceum-map.ts'

const LYCEUM_BASE = 'https://colegiohumboldt.lyceum.com.br/aluno/'
const ORIGIN = new URL(LYCEUM_BASE).origin
const TTL = 30 * 60 * 1000
const COOKIE = 'sb_lyc'

type Session = { jar: Map<string, string>; user?: Record<string, unknown>; aluno?: Record<string, unknown>; at: number }
const sessions = new Map<string, Session>()
/**
 * Last sign-in/sync's shape (status + key NAMES, never values) so the mapping can be checked after a
 * real sign-in. Also written to .lyceum-diagnostic.json (gitignored) so it survives a server restart.
 */
const DIAG_FILE = path.resolve(process.cwd(), '.lyceum-diagnostic.json')
let lastDiagnostic: unknown = null
const saveDiagnostic = (d: unknown) => {
  lastDiagnostic = d
  try {
    writeFileSync(DIAG_FILE, JSON.stringify(d, null, 2))
  } catch {
    /* diagnostics are best-effort */
  }
}
const readDiagnostic = () => {
  if (lastDiagnostic) return lastDiagnostic
  try {
    return JSON.parse(readFileSync(DIAG_FILE, 'utf8'))
  } catch {
    return null
  }
}

class RelayError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const call = async (s: Session, rel: string, init: { method?: string; body?: string; type?: string } = {}) => {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    Referer: LYCEUM_BASE,
    'User-Agent': 'Mozilla/5.0 (Lernpilot)',
  }
  if (s.jar.size) headers.Cookie = [...s.jar].map(([k, v]) => `${k}=${v}`).join('; ')
  const xsrf = s.jar.get('XSRF-TOKEN')
  if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf)
  if (init.body) {
    headers['Content-Type'] = init.type ?? 'application/x-www-form-urlencoded'
    headers.Origin = ORIGIN
  }
  const res = await fetch(new URL(rel, LYCEUM_BASE), {
    method: init.method ?? 'GET',
    headers,
    body: init.body,
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  })
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    if (i > 0) s.jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
  }
  return res
}

const getJson = async (s: Session, rel: string) => {
  const res = await call(s, rel)
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  return { status: res.status, body }
}

const decodeUserCookie = (raw: string | undefined) => {
  if (!raw) return null
  try {
    const v = decodeURIComponent(raw).replace(/^"|"$/g, '')
    return JSON.parse(Buffer.from(v, 'base64').toString('utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

async function login(username: string, password: string): Promise<Session> {
  const s: Session = { jar: new Map(), at: Date.now() }
  await call(s, '') // session + XSRF cookies
  const captcha = await (await call(s, 'config-properties/recaptcha-sitekey')).text()
  if (captcha.trim())
    throw new RelayError(409, 'O portal da escola ligou a verificação "não sou um robô". Entre uma vez pelo site do Lyceum e tente de novo mais tarde.')

  // The portal itself sends the password base64-encoded (UTF-8 bytes), see its login controller.
  const body = new URLSearchParams({ username, password: Buffer.from(password, 'utf8').toString('base64'), recaptchaResponse: '' })
  const res = await call(s, 'auth', { method: 'POST', body: body.toString() })
  await res.text()
  const user = decodeUserCookie(s.jar.get('user-data'))
  // Shape of the auth answer only — status, redirect path, cookie NAMES; never values or the password
  const location = res.headers.get('location')
  console.log(`[lyceum] login → status ${res.status}, sessão ${user ? 'confirmada' : 'não confirmada'}`)
  saveDiagnostic({
    at: new Date().toISOString(),
    auth: {
      status: res.status,
      redirect: location ? new URL(location, LYCEUM_BASE).pathname : null,
      cookies: [...s.jar.keys()],
      userCookieDecoded: Boolean(user),
      userKeys: user ? Object.keys(user).slice(0, 40) : [],
    },
  })
  if (res.status === 401 || res.status === 403)
    throw new RelayError(401, 'O Lyceum recusou a entrada. Confira o usuário e a senha no Aluno Online; se estiverem certos, a escola pode ter mudado o jeito de entrar.')
  if (res.status >= 400) throw new RelayError(502, `O Lyceum respondeu com erro ${res.status}. Tente de novo em instantes.`)
  if (!user) throw new RelayError(502, 'O Lyceum não confirmou a entrada. Tente de novo mais tarde; se continuar, avise quem cuida do Lernpilot.')
  s.user = user

  const { body: list } = await getJson(s, `apix/api/rest/alunos/user/${encodeURIComponent(String(user.id))}`)
  const content = (list as { content?: Record<string, unknown>[] } | null)?.content ?? []
  s.aluno = content.find((a) => a.codAluno === user.login) ?? content[0]
  if (!s.aluno) throw new RelayError(404, 'Entrei no Lyceum, mas não encontrei matrícula de aluno nessa conta.')
  return s
}

const keysOf = (v: unknown): string[] => {
  const first = Array.isArray(v) ? v[0] : ((v as { content?: unknown[] } | null)?.content?.[0] ?? v)
  return first && typeof first === 'object' ? Object.keys(first as object).slice(0, 40) : []
}

async function sync(s: Session): Promise<LyceumRaw> {
  const a = s.aluno!
  const u = s.user!
  const codAluno = encodeURIComponent(String(a.codAluno))
  const codPessoa = encodeURIComponent(String(u.id))
  const pessoaAluno = encodeURIComponent(String(a.id ?? u.id))
  const q = 'page=0&size=1000'
  const paths: Record<string, string> = {
    boletim: `apix/api/rest/alunos/${codAluno}/pessoa/${pessoaAluno}/disciplinasBoletim?${q}`,
    boletimNovo: `apix/pessoas/${codPessoa}/alunos/${codAluno}/disciplinasBoletim`,
    boletimCompleto: `apix/pessoas/${codPessoa}/alunos/${codAluno}/boletim`,
    ultimasNotas: `apix/pessoas/${codPessoa}/alunos/${codAluno}/qtddNotas/60/ultimasNotas`,
    avisos: `apix/pessoas/${codPessoa}/alunos/${codAluno}/avisos`,
    avisosAntigo: `apix/api/rest/alunos/codPessoa/${codPessoa}/codAluno/${codAluno}/AlunoAvisos?${q}`,
    eventos: `apix/api/rest/alunos/pessoa/${codPessoa}/events?${q}`,
    tarefas: `apix/api/rest/tarefas/listByTarefasAluno/${codAluno}?${q}`,
    frequencia: `apix/api/rest/alunos/codAluno/${codAluno}/codPessoa/${codPessoa}/Frequencias?${q}`,
  }
  const raw: LyceumRaw = { aluno: a, user: u, responses: {}, provas: [] }
  const diag: Record<string, { status: number; keys: string[] }> = {}
  await Promise.all(
    Object.entries(paths).map(async ([k, p]) => {
      try {
        const r = await getJson(s, p)
        diag[k] = { status: r.status, keys: keysOf(r.body) }
        if (r.status < 300) raw.responses[k] = r.body
      } catch {
        diag[k] = { status: 0, keys: [] }
      }
    }),
  )

  // Per-subject evaluations (the "Avaliações" modal of the portal)
  type Row = { boletim?: { turmaDisciplina?: Record<string, any> } }
  const rows = (((raw.responses.boletim as { content?: Row[] } | undefined)?.content ?? []) as Row[]).slice(0, 30)
  await Promise.all(
    rows.map(async (row) => {
      const td = row?.boletim?.turmaDisciplina
      const disc = td?.disciplina?.codDisciplina ?? td?.disciplina?.id ?? td?.codDisciplina
      const turma = td?.turma?.codTurma ?? td?.turma?.id ?? td?.codTurma
      const ano = td?.turma?.periodo?.ano
      const per = td?.turma?.periodo?.semestre ?? td?.turma?.periodo?.periodo
      if ([disc, turma, ano, per].some((x) => x === undefined || x === null)) return
      const p = `apix/api/rest/Prova/aluno/${codAluno}/disciplina/${encodeURIComponent(disc)}/turma/${encodeURIComponent(turma)}/ano/${encodeURIComponent(ano)}/periodo/${encodeURIComponent(per)}/provasBoletim?${q}`
      try {
        const r = await getJson(s, p)
        if (!diag.provas) diag.provas = { status: r.status, keys: keysOf(r.body) }
        const list = (r.body as { content?: unknown[] } | null)?.content
        if (r.status < 300 && Array.isArray(list)) raw.provas.push({ subject: String(td?.disciplina?.nome ?? ''), items: list as Record<string, unknown>[] })
      } catch {
        /* one subject failing must not break the sync */
      }
    }),
  )
  saveDiagnostic({ ...((readDiagnostic() as object | null) ?? {}), at: new Date().toISOString(), aluno: keysOf(a), user: keysOf(u), endpoints: diag })
  console.log(`[lyceum] sync → ${Object.entries(diag).map(([k, v]) => `${k}:${v.status}`).join(' ')}`)
  return raw
}

// ---------- tiny HTTP layer ----------
const send = (res: ServerResponse, status: number, data: unknown, cookie?: string) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (cookie) res.setHeader('Set-Cookie', cookie)
  res.end(JSON.stringify(data))
}

const readBody = (req: IncomingMessage) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > 8192) reject(new RelayError(413, 'Pedido grande demais.'))
      else chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new RelayError(400, 'Pedido inválido.'))
      }
    })
    req.on('error', reject)
  })

const sidOf = (req: IncomingMessage) => /(?:^|;\s*)sb_lyc=([\w-]+)/.exec(req.headers.cookie ?? '')?.[1]

const sessionOf = (req: IncomingMessage) => {
  const sid = sidOf(req)
  const s = sid ? sessions.get(sid) : undefined
  if (!s || Date.now() - s.at > TTL) {
    if (sid) sessions.delete(sid)
    throw new RelayError(401, 'Sua sessão do Lyceum expirou. Entre de novo para sincronizar.')
  }
  s.at = Date.now()
  return s
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = (req.url ?? '/').split('?')[0]
  try {
    if (req.method === 'POST' && url === '/login') {
      const b = await readBody(req)
      const username = String(b.username ?? '').trim()
      const password = String(b.password ?? '')
      if (!username || !password || username.length > 80 || password.length > 200)
        throw new RelayError(400, 'Preencha usuário e senha do Lyceum.')
      const s = await login(username, password)
      const sid = randomUUID()
      sessions.set(sid, s)
      const data = mapLyceum(await sync(s))
      return send(res, 200, data, `${COOKIE}=${sid}; Path=/api/lyceum; HttpOnly; SameSite=Lax; Max-Age=1800`)
    }
    if (req.method === 'POST' && url === '/sync') return send(res, 200, mapLyceum(await sync(sessionOf(req))))
    if (req.method === 'POST' && url === '/logout') {
      const sid = sidOf(req)
      const s = sid ? sessions.get(sid) : undefined
      if (s) await call(s, 'logout').catch(() => undefined)
      if (sid) sessions.delete(sid)
      return send(res, 200, { ok: true }, `${COOKIE}=; Path=/api/lyceum; HttpOnly; SameSite=Lax; Max-Age=0`)
    }
    if (req.method === 'GET' && url === '/status') return send(res, 200, { ok: true, portal: ORIGIN })
    if (req.method === 'GET' && url === '/diagnostic') return send(res, 200, readDiagnostic() ?? { empty: true })
    return send(res, 404, { error: 'Rota desconhecida.' })
  } catch (e) {
    const status = e instanceof RelayError ? e.status : 502
    const msg = e instanceof RelayError ? e.message : 'Não consegui falar com o Lyceum agora. Confira sua internet e tente de novo.'
    return send(res, status, { error: msg })
  }
}

export const lyceumRelay = (): Plugin => ({
  name: 'studybrain-lyceum-relay',
  configureServer(server) {
    server.middlewares.use('/api/lyceum', (req, res) => void handle(req, res))
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/lyceum', (req, res) => void handle(req, res))
  },
})
