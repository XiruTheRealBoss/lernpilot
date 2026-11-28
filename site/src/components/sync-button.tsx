import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { googleResync, lyceumResync, SessionExpired } from '@/lib/sync'
import { cn } from '@/lib/utils'

export const timeAgo = (isoStr: string) => {
  const min = Math.round((Date.now() - new Date(isoStr).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}

/** Re-reads every connected platform. Lyceum needs a fresh sign-in once its 30-min session ends. */
export function useSyncAll() {
  const { data, demo } = useStore()
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<{ text: string; relogin?: boolean }[]>([])
  const run = async () => {
    setBusy(true)
    const out: { text: string; relogin?: boolean }[] = []
    const jobs: Promise<void>[] = []
    if (data.connections.lyceum)
      jobs.push(
        lyceumResync().catch((e) => {
          out.push(e instanceof SessionExpired ? { text: 'A sessão do Lyceum terminou. Entre de novo para atualizar as notas.', relogin: true } : { text: `Lyceum: ${(e as Error).message}` })
        }),
      )
    if (data.connections.google)
      jobs.push(
        googleResync().catch((e) => {
          out.push({ text: `Google: ${(e as Error).message}` })
        }),
      )
    await Promise.all(jobs)
    setProblems(out)
    setBusy(false)
  }
  return { run, busy, problems, any: !demo && Boolean(data.connections.lyceum || data.connections.google) }
}

export function SyncButton({ dark = false }: { dark?: boolean }) {
  const { run, busy, problems, any } = useSyncAll()
  if (!any) return null
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={run}
        disabled={busy}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition hover:-translate-y-px active:translate-y-0 disabled:cursor-wait disabled:opacity-80',
          dark ? 'bg-white text-navy-950 hover:bg-blue-50' : 'border border-line bg-white text-navy-900 hover:border-blue-300',
        )}
      >
        <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} aria-hidden="true" />
        {busy ? 'Sincronizando…' : 'Sincronizar agora'}
      </button>
      {problems.map((p) => (
        <p key={p.text} role="status" className={cn('max-w-sm text-[13px]', dark ? 'text-orange-100' : 'text-flame-600')}>
          {p.text}{' '}
          {p.relogin && (
            <Link to="/login" className="font-semibold underline underline-offset-4">
              Entrar de novo
            </Link>
          )}
        </p>
      ))}
    </div>
  )
}
