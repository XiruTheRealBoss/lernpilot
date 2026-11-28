import { Check, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, PageHead } from '@/components/ui-bits'
import { deleteAllPhotos, ownerKeys } from '@/lib/exam-photos'
import { setRemember, signOut, useStore } from '@/lib/store'
import { forgetGoogleToken, lyceumSignOut } from '@/lib/sync'
import { cn } from '@/lib/utils'

export default function Perfil() {
  const { profile, data, remember, demo } = useStore()
  const nav = useNavigate()
  useEffect(() => {
    document.title = 'Perfil e privacidade — Lernpilot'
  }, [])

  const wipe = async () => {
    if (!window.confirm('Apagar todos os dados do Lernpilot deste navegador, inclusive as fotos das provas, e sair? Suas contas no Lyceum e no Google não mudam.')) return
    forgetGoogleToken()
    await lyceumSignOut()
    await deleteAllPhotos(ownerKeys(profile, data.connections, demo)).catch(() => undefined) // storage blocked: then nothing was ever saved
    signOut()
    nav('/login', { replace: true })
  }

  const counts: [string, number][] = [
    ['Matérias no boletim', data.subjects.length],
    ['Avaliações com nota', data.grades.length],
    ['Tarefas e provas', data.tasks.length],
    ['Eventos da agenda', data.events.length],
    ['Avisos', data.notices.length],
    ['Materiais', data.materials.length],
  ]

  return (
    <div>
      <PageHead eyebrow="Perfil e privacidade" title={profile?.name ?? 'Perfil'}>
        {profile?.email ?? 'Conta do Lyceum'}
      </PageHead>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="O que está guardado neste navegador">
          <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-[14px]">
            {counts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-mute">{k}</dt>
                <dd className="text-right font-semibold text-navy-950 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-[14px]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
            <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-flame-400', remember ? 'border-blue-500 bg-blue-500 text-white' : 'border-line')}>
              {remember && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <span>
              <span className="block font-medium text-navy-950">Lembrar de mim neste computador</span>
              <span className="block text-[12.5px] text-mute">Desligado, tudo some quando você fecha o navegador.</span>
            </span>
          </label>
          <button onClick={wipe} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-[13.5px] font-semibold text-red-700 transition hover:bg-red-50">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Apagar meus dados e sair
          </button>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden="true" /> Como seus dados são tratados
            </span>
          }
        >
          <ul className="space-y-3 text-[14px] leading-relaxed text-navy-900">
            <li>A senha do Lyceum é usada uma vez para entrar no portal e não é salva em lugar nenhum.</li>
            <li>No Google, o Lernpilot pede só permissões de leitura. O acesso dura uma hora e fica apenas na memória da página.</li>
            <li>Notas, tarefas e avisos ficam guardados só neste navegador. Não existe servidor do Lernpilot com os seus dados.</li>
            <li>As fotos das provas feitas também ficam só neste navegador. Sair da conta não apaga as fotos; o botão de apagar tudo, sim.</li>
            <li>Nada é publicado, entregue ou apagado no Lyceum, no Classroom ou no Drive.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
