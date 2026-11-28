import { ArrowRight, Check, Eye, EyeOff, KeyRound, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brand, BrandMark } from '@/components/brand'
import { Spinner } from '@/components/ui-bits'
import { preloadGoogle } from '@/lib/google'
import { signOut, useStore } from '@/lib/store'
import { forgetGoogleToken, googleConfigured, googleSignIn, lyceumSignIn, lyceumSignOut } from '@/lib/sync'
import { cn } from '@/lib/utils'

export const LYCEUM_RESET_URL = 'https://colegiohumboldt.lyceum.com.br/aluno/#/resetsenha'

/** Official multi-colour Google "G". */
export const GoogleG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

const Aurora = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <div className="absolute top-[-18%] left-[-12%] h-[620px] w-[620px] rounded-full opacity-70 blur-[4px]" style={{ background: 'radial-gradient(circle at 35% 35%, #dbe7ff 0%, #8fb4ff 22%, #2563eb 48%, #0b2a63 72%, transparent 74%)' }} />
    <div className="absolute top-[8%] right-[-10%] h-[540px] w-[540px] rounded-full opacity-55 blur-[4px]" style={{ background: 'radial-gradient(circle at 60% 40%, #ffe6d5 0%, #ffb27a 20%, #f26b1d 46%, #9a3412 70%, transparent 72%)' }} />
    <div className="absolute bottom-[-24%] left-[28%] h-[640px] w-[640px] rounded-full opacity-60 blur-[4px]" style={{ background: 'radial-gradient(circle at 50% 50%, #38bdf8 0%, #2563eb 32%, #172554 62%, transparent 70%)' }} />
    <div className="absolute bottom-[6%] left-[-6%] h-[300px] w-[300px] rounded-full opacity-40 blur-[4px]" style={{ background: 'radial-gradient(circle, #ffb27a 0%, #f26b1d 40%, transparent 70%)' }} />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: 'linear-gradient(rgba(79,134,247,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(242,107,29,.05) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
      }}
    />
    <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '3px 3px' }} />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,10,28,.35),rgba(2,10,28,.85))]" />
    <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink" />
  </div>
)

// The real state of each school source on this site — never claim one works when it doesn't.
const SOURCES = [
  { name: 'Lyceum (Aluno Online)', what: 'boletim, médias, faltas e avisos', on: true, state: 'Funciona' },
  {
    name: 'Google Classroom, Agenda e Drive',
    what: 'tarefas, notas de atividades, provas, Docs e Slides',
    on: googleConfigured,
    state: googleConfigured ? 'Funciona' : 'Falta ativar',
  },
  { name: 'ClassApp', what: 'comunicados', on: false, state: 'Ainda não conecta' },
]

export default function Login() {
  const nav = useNavigate()
  const loc = useLocation()
  const { profile, remember: savedRemember } = useStore()
  const from = (loc.state as { from?: string } | null)?.from ?? '/central'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(savedRemember)
  const [busy, setBusy] = useState<null | 'lyceum' | 'google'>(null)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const timer = useRef<number>(0)

  useEffect(() => {
    document.title = 'Entrar — Lernpilot'
    preloadGoogle()
    return () => window.clearTimeout(timer.current)
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) return setError('Preencha o usuário e a senha do Lyceum.')
    setBusy('lyceum')
    setStep('Entrando no Lyceum…')
    timer.current = window.setTimeout(() => setStep('Lendo boletim, avisos e agenda…'), 1600)
    try {
      await lyceumSignIn(username.trim(), password, remember)
      nav(from, { replace: true })
    } catch (err) {
      setPassword('')
      setError(err instanceof Error ? err.message : 'Não consegui entrar no Lyceum.')
    } finally {
      window.clearTimeout(timer.current)
      setBusy(null)
    }
  }

  const google = async () => {
    setError('')
    setBusy('google')
    try {
      await googleSignIn(remember)
      nav(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui entrar com o Google.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-ink text-slate-200 [color-scheme:dark]">
      <Aurora />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[rgba(2,10,28,.62)] backdrop-blur-[18px] backdrop-saturate-[1.4]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex" aria-label="Site">
            <Link to="/#recursos" className="hover:text-white">Recursos</Link>
            <Link to="/#como" className="hover:text-white">Como funciona</Link>
            <Link to="/#privacidade" className="hover:text-white">Privacidade</Link>
          </nav>
          <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-navy-950 transition hover:-translate-y-px hover:bg-blue-50 active:translate-y-0">
            Página inicial
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex min-h-dvh max-w-7xl flex-col px-6 pt-16 lg:px-8">
        <div className="grid flex-1 items-center gap-14 py-12 lg:grid-cols-2 lg:gap-10">
          <section className="order-2 lg:order-1" aria-labelledby="pitch">
            <h1 id="pitch" className="max-w-xl font-display text-[2.6rem] leading-[1.05] font-bold tracking-tight text-white sm:text-[3.4rem]">
              Notas, provas e lições da escola, <span className="text-flame-400">numa tela só</span>.
            </h1>
            <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-slate-400">
              O Lernpilot entra nas plataformas do colégio com a sua conta e junta o que está espalhado nelas.
            </p>
            <dl className="mt-9 max-w-md divide-y divide-white/[0.08] border-y border-white/[0.08] text-[14.5px]">
              {SOURCES.map((s) => (
                <div key={s.name} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-white">
                    {s.name}
                    <span className="block text-[13px] text-slate-400">{s.what}</span>
                  </dt>
                  <dd className={cn('shrink-0 text-[13px] font-medium', s.on ? 'text-flame-400' : 'text-slate-500')}>{s.state}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="relative order-1 w-full max-w-md justify-self-center lg:order-2 lg:justify-self-end" aria-labelledby="entrar">
            <div className="absolute -top-10 -right-10 -z-10 h-40 w-40 rounded-full bg-flame-500/40 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-12 -left-10 -z-10 h-44 w-44 rounded-full bg-blue-500/40 blur-3xl" aria-hidden="true" />
            <div className="glass rounded-[26px] p-7 sm:p-9">
              <h2 id="entrar" className="font-display text-2xl font-semibold text-white">Entrar</h2>
              <p className="mt-1.5 text-sm text-slate-400">Use o mesmo usuário e senha do Aluno Online.</p>
              {profile && (
                <p className="mt-4 rounded-xl border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-[13px] text-blue-100">
                  Você já está conectado como {profile.name}.{' '}
                  <Link to="/central" className="font-semibold text-white underline decoration-flame-400 underline-offset-4">Ir para a central</Link>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => {
                      forgetGoogleToken()
                      void lyceumSignOut()
                      signOut()
                    }}
                    className="font-semibold text-white underline decoration-white/40 underline-offset-4"
                  >
                    Não é você? Sair
                  </button>
                </p>
              )}

              <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                <div>
                  <label htmlFor="user" className="mb-1.5 block text-[13px] font-medium text-slate-300">Usuário do Aluno Online</label>
                  <div className="field flex h-12 items-center gap-3 rounded-xl px-3.5">
                    <UserRound className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
                    <input
                      id="user"
                      name="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="E-mail ou RA"
                      className="h-full w-full min-w-0 bg-transparent text-[15px] text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="pw" className="text-[13px] font-medium text-slate-300">Senha</label>
                    <a href={LYCEUM_RESET_URL} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-blue-300 hover:text-white">Esqueceu?</a>
                  </div>
                  <div className="field flex h-12 items-center gap-3 rounded-xl px-3.5">
                    <KeyRound className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
                    <input
                      id="pw"
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="h-full w-full min-w-0 bg-transparent text-[15px] text-white placeholder:text-slate-500"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 hover:text-white" aria-label={showPw ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={showPw}>
                      {showPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13.5px] text-slate-300">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border border-white/25 bg-white/5 text-white transition peer-checked:border-blue-400 peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-flame-400">
                    {remember && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  Lembrar de mim neste computador
                </label>

                {error && (
                  <p role="alert" className="rounded-xl border border-flame-400/30 bg-flame-500/10 px-3 py-2.5 text-[13.5px] text-orange-100">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy !== null} className="btn-cta flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-[15px] font-bold text-white disabled:cursor-wait disabled:opacity-80">
                  {busy === 'lyceum' ? (
                    <>
                      <Spinner /> {step}
                    </>
                  ) : (
                    <>
                      Entrar e sincronizar <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
              {/* Matches server/lyceum.ts: the browser sends the password to the Lernpilot server on this
                  computer, which forwards it once to the Lyceum and keeps no copy (not in files, not in logs). */}
              <p className="mt-4 text-[12.5px] leading-relaxed text-slate-400">
                A senha passa pelo servidor do Lernpilot neste computador, segue para o Lyceum e não é gravada.
              </p>

              <p className="mt-3 text-[13px] text-slate-400">
                Só quer conhecer?{' '}
                <Link to="/demo" className="font-medium text-blue-300 underline-offset-4 hover:text-white hover:underline">
                  Abrir a demonstração com dados fictícios
                </Link>
              </p>

              <div className="mt-6 border-t border-white/10 pt-5">
                {googleConfigured ? (
                  <button
                    type="button"
                    onClick={google}
                    disabled={busy !== null}
                    className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] text-[14.5px] font-semibold text-white transition hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.08] active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy === 'google' ? <Spinner /> : <GoogleG className="h-5 w-5" />}
                    Entrar com Google
                  </button>
                ) : (
                  <details className="group text-[13px] text-slate-400">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                      <GoogleG className="h-5 w-5 shrink-0 opacity-70" />
                      <span className="flex-1 text-slate-300">Entrar com Google ainda não está ativo</span>
                      <span className="text-blue-300 group-open:hidden">Por quê?</span>
                    </summary>
                    <div className="mt-2 space-y-2 leading-relaxed">
                      <p>
                        Falta o <strong className="font-semibold text-slate-200">ID de cliente OAuth do Google</strong>. Sem ele o Google não abre a tela de permissão.
                      </p>
                      <ol className="list-decimal space-y-1 pl-5">
                        <li>
                          No{' '}
                          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-300 hover:text-white">
                            Google Cloud Console
                          </a>
                          , ative as APIs Classroom, Calendar e Drive.
                        </li>
                        <li>
                          Crie um ID de cliente do tipo “Aplicativo da Web” com a origem <code className="text-slate-200">{window.location.origin}</code>.
                        </li>
                        <li>
                          Cole o ID em <code className="text-slate-200">VITE_GOOGLE_CLIENT_ID</code> no arquivo <code className="text-slate-200">.env</code> e reinicie o site.
                        </li>
                      </ol>
                      <p>Se a conta Google for da escola, a TI do colégio também pode precisar liberar o app.</p>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>


      <footer className="relative bg-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-7 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="flex items-center gap-2">
            <BrandMark className="h-5 w-5" /> Lernpilot · © 2026 · não é um app oficial da escola
          </span>
          <nav className="flex gap-5" aria-label="Rodapé">
            <Link to="/#privacidade" className="inline-flex min-h-11 items-center hover:text-white">Privacidade</Link>
            <Link to="/" className="inline-flex min-h-11 items-center hover:text-white">Página inicial</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
