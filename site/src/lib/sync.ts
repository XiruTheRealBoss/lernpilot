/** Sign-in + sync flows for each platform; the only place pages call to fetch school data. */
import type { LyceumMapped } from '../../server/lyceum-map.ts'
import { googleConfigured, requestGoogleToken, syncGoogle } from './google.ts'
import { applySync, getState, signIn, signOut } from './store.ts'

export class SessionExpired extends Error {}

const noDemo = () => {
  if (getState().demo) throw new Error('Você está na demonstração. Saia dela para conectar uma conta de verdade.')
}

const post = async <T,>(path: string, body?: unknown): Promise<T> => {
  noDemo()
  let r: Response
  try {
    r = await fetch(`/api/lyceum/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new Error('Sem conexão com o servidor do Lernpilot.')
  }
  const json = (await r.json().catch(() => ({}))) as T & { error?: string }
  if (r.status === 401 && path === 'sync') throw new SessionExpired(json.error ?? 'Sessão do Lyceum expirou.')
  if (r.status === 404 && !json.error) throw new Error('O conector do Lyceum não está rodando. Abra o site pelo "npm run dev" ou "npm run preview".')
  if (!r.ok) throw new Error(json.error ?? `Erro ${r.status}`)
  return json
}

const applyLyceum = (m: LyceumMapped) =>
  applySync(
    ['lyceum'],
    { subjects: m.subjects, boletim: m.boletim, grades: m.grades, notices: m.notices, events: m.events, tasks: m.tasks },
    { lyceum: { name: m.profile.name, login: m.profile.login, course: m.profile.course, syncedAt: new Date().toISOString(), problems: m.problems } },
  )

/** Signs in to the school's Lyceum with the student's own login and pulls their data. */
export async function lyceumSignIn(username: string, password: string, remember: boolean) {
  const m = await post<LyceumMapped>('login', { username, password })
  // A different student on this browser: start clean so nobody sees someone else's grades
  const known = getState().data.connections.lyceum?.login
  if (known && known !== m.profile.login) signOut()
  signIn({ name: getState().profile?.name || m.profile.name }, remember)
  applyLyceum(m)
  return m
}

export async function lyceumResync() {
  applyLyceum(await post<LyceumMapped>('sync'))
}

export const lyceumSignOut = () => post('logout').catch(() => undefined)

// Google: token kept in memory for up to 50 min so "Sincronizar" doesn't reopen the popup each time.
let google: { token: string; scopes: string[]; at: number } | null = null

export async function googleSignIn(remember: boolean) {
  noDemo()
  const t = await requestGoogleToken(getState().data.connections.google?.email)
  google = { ...t, at: Date.now() }
  const { result, connection } = await syncGoogle(t.token, t.scopes)
  const known = getState().data.connections.google?.email
  if (known && known !== connection.email) signOut() // another student's Google account: start clean
  signIn({ name: connection.name, email: connection.email, picture: connection.picture }, remember)
  applySync(['classroom', 'agenda', 'drive'], result, { google: connection })
  return connection
}

export async function googleResync() {
  noDemo()
  if (!google || Date.now() - google.at > 50 * 60 * 1000) {
    const t = await requestGoogleToken(getState().data.connections.google?.email)
    google = { ...t, at: Date.now() }
  }
  const { result, connection } = await syncGoogle(google.token, google.scopes)
  applySync(['classroom', 'agenda', 'drive'], result, { google: connection })
}

export const forgetGoogleToken = () => {
  google = null
}

export { googleConfigured }
