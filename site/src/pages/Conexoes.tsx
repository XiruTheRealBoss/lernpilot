import { Check, CircleSlash, Eye, EyeOff, LayoutGrid, MessagesSquare, RefreshCw, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { timeAgo } from '@/components/sync-button'
import { PageHead, Spinner } from '@/components/ui-bits'
import { preloadGoogle } from '@/lib/google'
import { disconnect, getState, useStore } from '@/lib/store'
import { forgetGoogleToken, googleConfigured, googleResync, googleSignIn, lyceumResync, lyceumSignIn, lyceumSignOut, SessionExpired } from '@/lib/sync'
import { cn } from '@/lib/utils'
import { GoogleG, LYCEUM_RESET_URL } from './Login'

const AREAS = [
  { name: 'Classroom', scope: 'classroom.coursework.me.readonly', what: 'tarefas, notas e comunicados' },
  { name: 'Agenda', scope: 'calendar.events.readonly', what: 'provas e eventos' },
  { name: 'Docs, Slides e Drive', scope: 'drive.metadata.readonly', what: 'lista de arquivos' },
]

const Panel = ({ icon, title, sub, status, children }: { icon: ReactNode; title: string; sub: string; status: 'on' | 'off' | 'na'; children: ReactNode }) => (
  <section className="card overflow-hidden">
    <div className="flex items-start gap-4 border-b border-line p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line bg-paper">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[18px] font-semibold text-navy-950">{title}</h2>
        <p className="text-[13.5px] text-mute">{sub}</p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold',
          status === 'on' ? 'bg-emerald-50 text-emerald-700' : status === 'off' ? 'bg-blue-50 text-navy-800' : 'bg-paper text-mute',
        )}
      >
        {status === 'on' ? 'Conectado' : status === 'off' ? 'Não conectado' : 'Indisponível'}
      </span>
    </div>
    <div className="p-5">{children}</div>
  </section>
)

const Btn = ({ children, onClick, busy, tone = 'dark', type = 'button', disabled }: { children: ReactNode; onClick?: () => void; busy?: boolean; tone?: 'dark' | 'line'; type?: 'button' | 'submit'; disabled?: boolean }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={busy || disabled}
    className={cn(
      'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold transition hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
      tone === 'dark' ? 'bg-navy-900 text-white hover:bg-navy-800' : 'border border-line bg-white text-navy-900 hover:border-blue-300',
    )}
  >
    {busy && <Spinner />}
    {children}
  </button>
)

export default function Conexoes() {
  const { data, remember, demo } = useStore()
  const { lyceum, google } = data.connections
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ where: 'lyceum' | 'google'; text: string; relogin?: boolean } | null>(null)
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    document.title = 'Conexões — Lernpilot'
    preloadGoogle()
  }, [])

  const act = async (key: string, where: 'lyceum' | 'google', fn: () => Promise<unknown>) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg({ where, text: (e as Error).message, relogin: e instanceof SessionExpired })
    } finally {
      setBusy(null)
    }
  }

  const connectLyceum = (e: FormEvent) => {
    e.preventDefault()
    if (!user.trim() || !pw) return setMsg({ where: 'lyceum', text: 'Preencha o usuário e a senha do Lyceum.' })
    void act('lyc-in', 'lyceum', async () => {
      try {
        await lyceumSignIn(user.trim(), pw, getState().remember)
      } finally {
        setPw('')
      }
    })
  }

  return (
    <div>
      <PageHead eyebrow="Conexões" title="Suas contas da escola">
        O Lernpilot entra com a sua conta, lê o que precisa e mostra aqui. Ele nunca publica, entrega ou apaga nada nessas plataformas.
      </PageHead>

      {demo && (
        <p role="status" className="mb-6 rounded-xl border border-flame-500/40 bg-flame-100 px-4 py-3 text-[14px] text-navy-950">
          Você está na demonstração, com dados fictícios. Para conectar uma conta de verdade, saia da demonstração primeiro.
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel icon={<LayoutGrid className="h-6 w-6 text-flame-500" />} title="Lyceum" sub="Aluno Online: boletim, médias, faltas, avisos e eventos" status={lyceum ? 'on' : 'off'}>
          {lyceum ? (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[14px]">
                <dt className="text-mute">Aluno</dt>
                <dd className="font-medium text-navy-950">{lyceum.name}</dd>
                {lyceum.course && (
                  <>
                    <dt className="text-mute">Curso</dt>
                    <dd className="text-navy-950">{lyceum.course}</dd>
                  </>
                )}
                <dt className="text-mute">Atualizado</dt>
                <dd className="text-navy-950">{timeAgo(lyceum.syncedAt)}</dd>
                <dt className="text-mute">Trouxe</dt>
                <dd className="text-navy-950">
                  {data.subjects.length} matérias, {data.grades.filter((g) => g.source === 'lyceum').length} avaliações, {data.notices.filter((n) => n.source === 'lyceum').length} avisos
                </dd>
              </dl>
              {lyceum.problems.map((p) => (
                <p key={p} className="mt-3 rounded-xl bg-flame-100/60 px-3 py-2 text-[13px] text-flame-600">{p}</p>
              ))}
              <div className="mt-5 flex flex-wrap gap-2">
                <Btn busy={busy === 'lyc-sync'} onClick={() => act('lyc-sync', 'lyceum', lyceumResync)}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Sincronizar
                </Btn>
                <Btn
                  tone="line"
                  onClick={() => {
                    void lyceumSignOut()
                    disconnect('lyceum')
                  }}
                >
                  Desconectar
                </Btn>
              </div>
            </>
          ) : (
            <form onSubmit={connectLyceum} className="space-y-3" noValidate>
              <p className="text-[14px] text-mute">Use o mesmo usuário e senha do Aluno Online. A senha vai direto para o Lyceum e não fica salva.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-user" className="mb-1 block text-[13px] font-medium text-navy-900">Usuário</label>
                  <input id="c-user" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" className="min-h-12 w-full rounded-xl border border-line bg-white px-3 text-[14.5px] outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <label htmlFor="c-pw" className="text-[13px] font-medium text-navy-900">Senha</label>
                    <a href={LYCEUM_RESET_URL} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-blue-600">Esqueceu?</a>
                  </div>
                  <div className="flex min-h-12 items-center rounded-xl border border-line bg-white focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <input id="c-pw" type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className="min-w-0 flex-1 bg-transparent px-3 text-[14.5px] outline-none" />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="grid h-11 w-11 place-items-center text-mute" aria-label={showPw ? 'Esconder senha' : 'Mostrar senha'}>
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <Btn type="submit" busy={busy === 'lyc-in'}>
                Conectar o Lyceum
              </Btn>
            </form>
          )}
          {msg?.where === 'lyceum' && (
            <p role="alert" className="mt-3 text-[13.5px] text-flame-600">
              {msg.text}{' '}
              {msg.relogin && (
                <Link to="/login" className="font-semibold underline underline-offset-4">Entrar de novo</Link>
              )}
            </p>
          )}
        </Panel>

        <Panel icon={<GoogleG className="h-6 w-6" />} title="Google" sub="Classroom, Agenda, Docs, Slides e Drive" status={google ? 'on' : googleConfigured ? 'off' : 'na'}>
          {google ? (
            <>
              <p className="text-[14px] text-navy-950">
                <span className="font-medium">{google.email}</span> · atualizado {timeAgo(google.syncedAt)} · {google.courses} {google.courses === 1 ? 'turma' : 'turmas'}
              </p>
              <ul className="mt-4 space-y-2">
                {AREAS.map((a) => {
                  const ok = google.scopes.some((s) => s.endsWith(a.scope))
                  return (
                    <li key={a.name} className="flex items-center gap-2.5 text-[14px]">
                      <span className={cn('grid h-6 w-6 place-items-center rounded-full', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-paper text-mute')}>
                        {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" />}
                      </span>
                      <span className="text-navy-950">{a.name}</span>
                      <span className="text-mute">— {ok ? a.what : 'sem permissão'}</span>
                    </li>
                  )
                })}
              </ul>
              {google.problems.map((p) => (
                <p key={p} className="mt-3 rounded-xl bg-flame-100/60 px-3 py-2 text-[13px] text-flame-600">{p}</p>
              ))}
              <div className="mt-5 flex flex-wrap gap-2">
                <Btn busy={busy === 'g-sync'} onClick={() => act('g-sync', 'google', googleResync)}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Sincronizar
                </Btn>
                <Btn busy={busy === 'g-in'} tone="line" onClick={() => act('g-in', 'google', () => googleSignIn(remember))}>
                  Rever permissões
                </Btn>
                <Btn
                  tone="line"
                  onClick={() => {
                    forgetGoogleToken()
                    disconnect('google')
                  }}
                >
                  Desconectar
                </Btn>
              </div>
            </>
          ) : googleConfigured ? (
            <>
              <p className="text-[14px] text-mute">Escolha a sua conta da escola e marque as permissões de leitura na tela do Google. Dá para desmarcar alguma; o resto continua funcionando.</p>
              <div className="mt-4">
                <Btn busy={busy === 'g-in'} onClick={() => act('g-in', 'google', () => googleSignIn(remember))}>
                  <GoogleG className="h-4 w-4" /> Conectar o Google
                </Btn>
              </div>
            </>
          ) : (
            <div className="text-[14px] text-navy-900">
              <p className="text-mute">O login com Google precisa de um ID de cliente criado por quem cuida deste site. Leva uns 10 minutos:</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13.5px]">
                <li>
                  Em <a className="font-medium text-blue-600 underline-offset-4 hover:underline" href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">console.cloud.google.com</a>, crie um projeto.
                </li>
                <li>Ative as APIs Google Classroom, Google Calendar e Google Drive.</li>
                <li>Na tela de consentimento OAuth, escolha “Externo” e adicione o seu e-mail da escola como usuário de teste.</li>
                <li>
                  Em Credenciais, crie um “ID do cliente OAuth” do tipo Aplicativo da Web, com a origem <code className="rounded bg-paper px-1.5 py-0.5 text-[12.5px]">{window.location.origin}</code>.
                </li>
                <li>
                  Cole o ID no arquivo <code className="rounded bg-paper px-1.5 py-0.5 text-[12.5px]">.env</code> como <code className="rounded bg-paper px-1.5 py-0.5 text-[12.5px]">VITE_GOOGLE_CLIENT_ID=…</code> e reinicie o site.
                </li>
              </ol>
              <p className="mt-3 text-[12.5px] text-mute">Se a escola bloquear apps externos na conta Google dela, o Classroom vai recusar o acesso; aí só o administrador da escola libera.</p>
            </div>
          )}
          {msg?.where === 'google' && (
            <p role="alert" className="mt-3 text-[13.5px] text-flame-600">{msg.text}</p>
          )}
        </Panel>

        <Panel icon={<MessagesSquare className="h-6 w-6 text-blue-500" />} title="ClassApp" sub="Comunicados da escola" status="na">
          <p className="flex items-start gap-2.5 text-[14px] text-mute">
            <CircleSlash className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Ainda não conecta. Por enquanto, confira os comunicados direto no ClassApp.
          </p>
        </Panel>
      </div>
    </div>
  )
}
