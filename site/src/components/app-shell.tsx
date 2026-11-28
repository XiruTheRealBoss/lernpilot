import { BarChart3, BookOpenCheck, CalendarDays, ClipboardList, Users, FolderOpen, Images, LayoutGrid, LogOut, Megaphone, Menu, PlugZap, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { signOut, useStore } from '@/lib/store'
import { forgetGoogleToken, lyceumSignOut } from '@/lib/sync'
import { cn } from '@/lib/utils'
import { Brand, BrandMark } from './brand'

const NAV = [
  { to: '/central', label: 'Minha central', icon: LayoutGrid },
  { to: '/tarefas', label: 'Lições', icon: CalendarDays },
  { to: '/provas', label: 'Provas', icon: ClipboardList },
  { to: '/provas-feitas', label: 'Provas feitas', icon: Images },
  { to: '/professores', label: 'Professores', icon: Users },
  { to: '/notas', label: 'Boletim', icon: BookOpenCheck },
  { to: '/estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { to: '/materiais', label: 'Docs & Slides', icon: FolderOpen },
  { to: '/avisos', label: 'Mural de avisos', icon: Megaphone },
]
const NAV2 = [
  { to: '/conexoes', label: 'Conexões', icon: PlugZap },
  { to: '/perfil', label: 'Perfil e privacidade', icon: UserRound },
]

const Item = ({ to, label, icon: Icon, onClick }: (typeof NAV)[number] & { onClick?: () => void }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors',
        isActive ? 'bg-white/10 text-white' : 'text-blue-100/75 hover:bg-white/5 hover:text-white',
      )
    }
  >
    {({ isActive }) => (
      <>
        <span className={cn('absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-flame-500 transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {label}
      </>
    )}
  </NavLink>
)

export function AppShell() {
  const { profile, data, demo } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  if (!profile) return <Navigate to="/login" replace state={{ from: loc.pathname }} />

  const leave = async () => {
    forgetGoogleToken()
    await lyceumSignOut()
    signOut()
    nav('/login', { replace: true })
  }

  const connected = [data.connections.lyceum && 'Lyceum', data.connections.google && 'Google'].filter(Boolean).join(' + ')

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-1 pb-6">
        <Brand to="/central" />
      </div>
      <p className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-blue-300/70">Seu espaço</p>
      <nav className="flex flex-col gap-0.5" aria-label="Seções">
        {NAV.map((n) => (
          <Item key={n.to} {...n} onClick={() => setOpen(false)} />
        ))}
      </nav>
      <p className="px-3 pt-6 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-blue-300/70">Conta</p>
      <nav className="flex flex-col gap-0.5" aria-label="Conta">
        {NAV2.map((n) => (
          <Item key={n.to} {...n} onClick={() => setOpen(false)} />
        ))}
      </nav>
      <div className="mt-auto pt-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            {profile.picture ? (
              <img src={profile.picture} alt="" className="h-9 w-9 rounded-full border border-white/20" referrerPolicy="no-referrer" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-flame-500 font-display text-sm font-semibold text-white">{profile.name.slice(0, 1).toUpperCase()}</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-white">{profile.name}</p>
              <p className="truncate text-[12px] text-blue-200/70">{demo ? 'Demonstração' : connected ? `Conectado: ${connected}` : 'Nenhuma conta conectada'}</p>
            </div>
          </div>
          <button onClick={leave} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-[13px] font-medium text-blue-100 transition hover:bg-white/10 hover:text-white active:scale-[.99]">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-paper lg:pl-[272px]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-navy-950">
        Pular para o conteúdo
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] overflow-y-auto bg-navy-950 px-3 py-5 lg:block">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(37,99,235,.35),transparent_70%)]" />
        <div className="relative h-full">{sidebar}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-navy-950 px-4 lg:hidden">
        <Brand to="/central" />
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-xl text-white hover:bg-white/10"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div id="menu-mobile" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-navy-950 px-3 py-4 lg:hidden">
          {sidebar}
        </div>
      )}

      {demo && (
        <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-flame-500/40 bg-flame-100 px-4 py-2 text-center text-[13.5px] text-navy-950">
          <span>
            <b>Demonstração.</b> Aluno, professores e notas daqui são fictícios; nada vem de uma conta de verdade.
          </span>
          <button onClick={leave} className="min-h-9 font-semibold text-flame-600 underline underline-offset-4">
            Sair da demonstração
          </button>
        </div>
      )}
      <main id="conteudo" className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <Outlet />
      </main>
      <footer className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 pb-8 text-[12px] text-mute sm:px-6 lg:px-10">
        <BrandMark className="h-4 w-4" />
        Lernpilot lê suas contas só para mostrar aqui. Não é um app oficial da escola.
      </footer>
    </div>
  )
}
