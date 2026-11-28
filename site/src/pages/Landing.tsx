import { ArrowRight, BarChart3, CalendarClock, Check, ClipboardCheck, FolderOpen, GraduationCap, Megaphone, ShieldCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brand, OrangeLines } from '@/components/brand'
import { ChromebookOpen } from '@/components/ui/chromebook-open'
import { useStore } from '@/lib/store'

const YEAR = new Date().getFullYear()

const PLATFORMS = ['Lyceum', 'Google Classroom', 'Google Agenda', 'Google Docs', 'Google Slides', 'Google Drive']

const FEATURES = [
  { icon: GraduationCap, title: 'Boletim de verdade', text: 'Médias oficiais e faltas do Lyceum, matéria por matéria, com alerta no que está abaixo de 6.' },
  { icon: CalendarClock, title: 'Provas no radar', text: 'Provas do Classroom, da Agenda e do Lyceum numa lista só, com quantos dias faltam.' },
  { icon: ClipboardCheck, title: 'Lição de amanhã', text: 'As entregas do Classroom organizadas por dia, com as atrasadas separadas.' },
  { icon: BarChart3, title: 'Estatísticas', text: 'Média por matéria, evolução no semestre, provas por semana e faltas, em gráficos.' },
  { icon: Megaphone, title: 'Mural de avisos', text: 'Avisos do Lyceum e comunicados das turmas, com os importantes primeiro.' },
  { icon: FolderOpen, title: 'Docs & Slides', text: 'Materiais das turmas e seus arquivos recentes do Drive, filtrados por matéria.' },
]

const READS = [
  { name: 'Lyceum', what: 'boletim, faltas, avisos' },
  { name: 'Classroom', what: 'tarefas, notas, comunicados' },
  { name: 'Agenda', what: 'provas e eventos' },
  { name: 'Drive', what: 'Docs e Slides' },
]

const FACTS = [
  { value: '2', label: 'logins: Lyceum e Google' },
  { value: '6', label: 'serviços da escola numa tela' },
  { value: '0', label: 'senhas guardadas' },
  { value: '100%', label: 'somente leitura' },
]

const Btn = ({ to, children, primary }: { to: string; children: React.ReactNode; primary?: boolean }) =>
  primary ? (
    <Link to={to} className="btn-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white">
      {children}
    </Link>
  ) : (
    <a href={to} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 text-[15px] font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0">
      {children}
    </a>
  )

export default function Landing() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { profile } = useStore()
  const loc = useLocation()

  useEffect(() => {
    document.title = 'Lernpilot — sua escola inteira num lugar só'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // three.js loads after first paint; the hero copy never waits for it
    let stopPlanet = () => undefined as void
    let alive = true
    void import('@/components/planet-scene').then(({ mountPlanet }) => {
      if (alive && canvas.current) stopPlanet = mountPlanet(canvas.current, { reducedMotion: reduced, variant: new URLSearchParams(window.location.search).get('fundo') })
    })

    // Staggered reveal (hero copy, section heads and cards), once each
    const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    let io: IntersectionObserver | null = null
    if (reduced) els.forEach((el) => el.classList.add('in'))
    else {
      io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in')
              io?.unobserve(e.target)
            }
          }),
        { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
      )
      els.forEach((el) => io!.observe(el))
    }

    // Smooth scroll (Lenis), skipped under reduced motion
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null
    let raf = 0
    if (!reduced)
      void import('lenis').then(({ default: Lenis }) => {
        lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.5 })
        const loop = (t: number) => {
          lenis?.raf(t)
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      })

    return () => {
      alive = false
      stopPlanet()
      io?.disconnect()
      cancelAnimationFrame(raf)
      lenis?.destroy()
    }
  }, [])

  useEffect(() => {
    if (loc.hash) document.querySelector(loc.hash)?.scrollIntoView()
  }, [loc.hash])

  const enter = profile ? '/central' : '/login'
  const enterLabel = profile ? 'Abrir minha central' : 'Entrar com minha conta'

  return (
    <div className="landing relative bg-ink text-white [color-scheme:dark]">
      {/* static backdrop (shows if WebGL is unavailable) + the planet */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(90%_60%_at_50%_110%,#1d4ed8_0%,#0b2a63_35%,#020a1c_70%)]" aria-hidden="true" />
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-0 block h-screen w-screen data-[failed=true]:hidden" aria-hidden="true" />
      {/* phones: the books cannot move aside on a narrow screen, so they are dimmed to keep the text over them readable */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-ink/45 md:hidden" aria-hidden="true" />

      <div className="relative z-[1]">
        <a href="#recursos" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-navy-950">
          Pular para o conteúdo
        </a>
        {/* HERO */}
        <header className="relative flex min-h-dvh flex-col bg-[radial-gradient(125%_62%_at_50%_-10%,rgba(2,10,28,.85)_0%,rgba(2,10,28,.3)_44%,transparent_68%)]">
          <OrangeLines className="absolute inset-x-0 top-0 h-[78vh] w-full opacity-80" />
          <nav className="relative mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5" aria-label="Principal">
            <Brand />
            <div className="hidden items-center gap-8 text-[14.5px] text-blue-100/75 md:flex">
              <a href="#recursos" className="hover:text-white">Recursos</a>
              <a href="#como" className="hover:text-white">Como funciona</a>
              <a href="#privacidade" className="hover:text-white">Privacidade</a>
            </div>
            <Link to={enter} className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/[0.06] px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/[0.12]">
              {profile ? 'Minha central' : 'Entrar'}
            </Link>
          </nav>

          <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center [transform:translateY(-8vh)]">
            <h1 style={{ animationDelay: '60ms' }} className="animate-rise max-w-[16ch] font-display text-[clamp(40px,6vw,76px)] leading-[1.02] font-bold tracking-[-0.03em] [text-shadow:0_2px_50px_rgba(0,0,0,.55)]">
              Toda a sua escola, num lugar <em className="text-flame-gradient not-italic">só</em>.
            </h1>
            <p style={{ animationDelay: '180ms' }} className="animate-rise mt-6 max-w-[580px] text-[clamp(16px,2vw,19px)] leading-relaxed text-blue-100/80">
              O Lernpilot entra no Lyceum e no Google Classroom com a sua conta e junta notas, provas, lições e avisos numa central, com estatísticas e um assistente.
            </p>
            <div style={{ animationDelay: '300ms' }} className="animate-rise mt-10 flex w-full flex-col justify-center gap-3.5 sm:w-auto sm:flex-row">
              <Btn to={enter} primary>
                {enterLabel} <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
              </Btn>
              <Btn to="#como">Ver como funciona</Btn>
            </div>
          </div>

          <div style={{ animationDelay: '420ms' }} className="animate-rise relative bg-[radial-gradient(75%_50%_at_50%_50%,rgb(4_16_43/0.78)_0%,rgb(4_16_43/0.68)_45%,transparent_100%)] px-6 py-16 text-center">{/* soft dark halo so the row stays readable over the book covers; it is transparent at the top and bottom edges, so the hero has no visible end line */}
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-blue-200/60">Lê da sua conta em</p>
            <ul className="mx-auto mt-4 flex max-w-4xl flex-wrap justify-center gap-x-[clamp(20px,4vw,48px)] gap-y-2">
              {PLATFORMS.map((p) => (
                <li key={p} className="font-display text-[16px] font-semibold text-blue-100/55">{p}</li>
              ))}
            </ul>
          </div>
        </header>

        {/* CHROMEBOOK — the school's Chromebook opens as you scroll and its screen shows the real login page */}
        <section id="tela" aria-label="O Lernpilot aberto no Chromebook da escola">
          <ChromebookOpen
            eyebrow="No Chromebook da escola"
            title={
              <>
                Abra o Chromebook. <br /> <span className="text-flame-gradient">A escola inteira já está na tela.</span>
              </>
            }
            note="É um site, feito para abrir no Chrome do Chromebook, sem instalar nada."
            src="/img/login-screen.webp"
            alt="Tela de login do Lernpilot"
          />
        </section>

        {/* FEATURES */}
        <section id="recursos" className="mx-auto max-w-[1180px] px-6 py-[clamp(80px,12vw,150px)]">
          <div className="halo mx-auto mb-[clamp(20px,3vw,40px)] max-w-[760px] px-[clamp(16px,4vw,40px)] py-8 text-center">
            <span data-reveal className="mb-4 inline-block text-[12px] font-semibold uppercase tracking-[0.18em] text-flame-400">Tudo num lugar</span>
            <h2 data-reveal style={{ ['--rd' as string]: '80ms' }} className="font-display text-[clamp(30px,4.4vw,50px)] leading-[1.05] font-bold tracking-tight [text-shadow:0_2px_40px_rgba(0,0,0,.6)]">
              O que aparece na sua central
            </h2>
            <p data-reveal style={{ ['--rd' as string]: '160ms' }} className="mt-4 text-[18px] leading-relaxed text-blue-100/70">
              Chega de abrir cinco sites para saber se tem prova. Cada parte vem da plataforma onde a escola já publica.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <article
                key={title}
                data-reveal="card"
                style={{ ['--rd' as string]: `${i * 110}ms` }}
                className="glass-soft group relative overflow-hidden rounded-[18px] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-300/30"
              >
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(242,107,29,.10),transparent_45%)] opacity-0 transition group-hover:opacity-100" />
                <span className="relative grid h-12 w-12 place-items-center rounded-xl border border-flame-400/25 bg-flame-500/10 text-flame-400">
                  <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                </span>
                <h3 className="relative mt-5 font-display text-[19px] font-semibold">{title}</h3>
                <p className="relative mt-2 text-[15px] leading-relaxed text-blue-100/70">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="como" className="mx-auto max-w-[1180px] px-6 py-[clamp(80px,12vw,150px)]">
          <div className="grid items-center gap-[clamp(36px,6vw,72px)] lg:grid-cols-[1fr_1.05fr]">
            <div className="text-center lg:text-left">
              <span data-reveal className="mb-4 inline-block text-[12px] font-semibold uppercase tracking-[0.18em] text-flame-400">Sem copiar e colar</span>
              <h2 data-reveal style={{ ['--rd' as string]: '90ms' }} className="font-display text-[clamp(30px,4.4vw,50px)] leading-[1.05] font-bold tracking-tight">
                Você entra. O Lernpilot busca.
              </h2>
              <p data-reveal style={{ ['--rd' as string]: '180ms' }} className="mt-5 text-[17px] leading-relaxed text-blue-100/85">
                No Lyceum, use o usuário e a senha do Aluno Online. No Google, escolha a conta da escola e marque as permissões de leitura. Depois disso, um clique em Sincronizar atualiza tudo.
              </p>
              <div data-reveal style={{ ['--rd' as string]: '270ms' }} className="mt-8">
                <Btn to={enter} primary>
                  {enterLabel} <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
                </Btn>
              </div>
            </div>
            <div data-reveal="card" style={{ ['--rd' as string]: '160ms' }} className="glass rounded-[26px] p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <p className="font-display text-[16px] font-semibold">O que é lido em cada conta</p>
                <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-flame-400">
                  <span className="h-2 w-2 rounded-full bg-flame-400 shadow-[0_0_10px_#ff8a3d]" />
                  só leitura
                </span>
              </div>
              <ul className="mt-6 space-y-4">
                {READS.map((r, i) => (
                  <li key={r.name} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-[13.5px] sm:grid-cols-[120px_1fr_auto]">
                    <span className="font-semibold text-white">{r.name}</span>
                    <span className="relative h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <span className="sb-fill absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-flame-400" style={{ animationDelay: `${300 + i * 350}ms` }} />
                    </span>
                    <Check className="sb-check h-4 w-4 text-flame-400" style={{ animationDelay: `${1100 + i * 350}ms` }} aria-hidden="true" />
                    <span className="col-span-3 -mt-2 text-[12.5px] text-blue-100/60 sm:col-span-2 sm:col-start-2">{r.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <dl className="mt-[clamp(56px,8vw,96px)] grid grid-cols-2 gap-4 lg:grid-cols-4">
            {FACTS.map((f, i) => (
              <div key={f.label} data-reveal="card" style={{ ['--rd' as string]: `${i * 110}ms` }} className="glass-soft rounded-[18px] px-4 py-7 text-center">
                <dt className="sr-only">{f.label}</dt>
                <dd className="bg-gradient-to-b from-white to-flame-400 bg-clip-text font-display text-[clamp(30px,4vw,44px)] font-bold text-transparent">{f.value}</dd>
                <dd className="mt-2 text-[14px] text-blue-100/70">{f.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* PRIVACY */}
        <section id="privacidade" className="mx-auto max-w-[1180px] px-6 py-[clamp(60px,9vw,120px)]">
          <div data-reveal="card" className="glass-soft grid gap-8 rounded-[26px] p-8 sm:p-12 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <ShieldCheck className="h-9 w-9 text-flame-400" aria-hidden="true" />
              <h2 data-reveal className="mt-4 font-display text-[clamp(28px,3.6vw,40px)] leading-[1.08] font-bold tracking-tight">Seus dados ficam com você</h2>
            </div>
            <ul className="grid gap-5 text-[15px] leading-relaxed text-blue-100/80 sm:grid-cols-2">
              <li>A senha do Lyceum é usada uma vez para entrar no portal e não é salva em lugar nenhum.</li>
              <li>No Google, só permissões de leitura. O acesso dura uma hora e fica na memória da página.</li>
              <li>Notas, tarefas e avisos ficam guardados no seu navegador, não num servidor nosso.</li>
              <li>Nada é publicado, entregue ou apagado nas suas contas. Um botão apaga tudo daqui.</li>
            </ul>
          </div>
        </section>

        {/* CTA + FOOTER */}
        <section id="cta" className="mx-auto max-w-[1180px] px-6 pt-[clamp(60px,9vw,120px)] pb-10">
          <div data-reveal="card" className="glass relative mx-auto max-w-[760px] overflow-hidden rounded-[26px] px-[clamp(28px,5vw,64px)] py-[clamp(48px,7vw,80px)] text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_50%_0%,rgba(242,107,29,.16),transparent_55%)]" />
            <span data-reveal style={{ ['--rd' as string]: '60ms' }} className="relative mb-4 inline-block text-[12px] font-semibold uppercase tracking-[0.18em] text-flame-400">Pronto quando você estiver</span>
            <h2 data-reveal style={{ ['--rd' as string]: '140ms' }} className="relative font-display text-[clamp(30px,4.4vw,50px)] leading-[1.05] font-bold tracking-tight">
              Amanhã tem prova? Abra a central e confira.
            </h2>
            <p data-reveal style={{ ['--rd' as string]: '220ms' }} className="relative mx-auto mt-5 max-w-lg text-[17px] text-blue-100/70">
              Entrar leva menos de um minuto. Funciona no computador e no celular.
            </p>
            <div data-reveal style={{ ['--rd' as string]: '300ms' }} className="relative mt-9 flex flex-col justify-center gap-3.5 sm:flex-row">
              <Btn to={enter} primary>
                {enterLabel} <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
              </Btn>
              <Btn to="#recursos">Ver os recursos</Btn>
            </div>
          </div>

          <footer className="mt-[clamp(64px,9vw,110px)] flex flex-wrap justify-between gap-12 border-t border-white/10 pt-12">
            <div className="max-w-xs">
              <Brand />
              <p className="mt-3 text-[14px] text-blue-100/60">Central do aluno que junta Lyceum e Google. Não é um app oficial da escola.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-14 gap-y-8 text-[14px] sm:grid-cols-3">
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-200/50">Produto</p>
                <ul className="space-y-1 text-blue-100/75">
                  <li><a href="#recursos" className="inline-flex min-h-11 items-center hover:text-white">Recursos</a></li>
                  <li><a href="#como" className="inline-flex min-h-11 items-center hover:text-white">Como funciona</a></li>
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-200/50">Conta</p>
                <ul className="space-y-1 text-blue-100/75">
                  <li><Link to={enter} className="inline-flex min-h-11 items-center hover:text-white">{profile ? 'Minha central' : 'Entrar'}</Link></li>
                  <li><Link to="/conexoes" className="inline-flex min-h-11 items-center hover:text-white">Conexões</Link></li>
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-200/50">Privacidade</p>
                <ul className="space-y-1 text-blue-100/75">
                  <li><a href="#privacidade" className="inline-flex min-h-11 items-center hover:text-white">Seus dados</a></li>
                </ul>
              </div>
            </div>
          </footer>
          <p className="mt-12 text-center text-[13px] text-blue-200/45">© {YEAR} Lernpilot</p>
        </section>
      </div>
    </div>
  )
}
