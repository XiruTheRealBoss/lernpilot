import { ChevronDown, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Empty, PageHead, SourceChip } from '@/components/ui-bits'
import { Tabs } from '@/components/ui/vercel-tabs'
import { longDate } from '@/lib/dates'
import { useStore } from '@/lib/store'
import { sourceLabel, type Source } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function Avisos() {
  const { data } = useStore()
  const [src, setSrc] = useState<Source | ''>('')
  useEffect(() => {
    document.title = 'Mural de avisos — Lernpilot'
  }, [])
  const sources = [...new Set(data.notices.map((n) => n.source))]
  const list = data.notices
    .filter((n) => !src || n.source === src)
    .sort((a, b) => Number(b.important) - Number(a.important) || (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <div>
      <PageHead eyebrow="Mural de avisos" title="O que a escola mandou">
        Avisos do Lyceum e comunicados das turmas do Classroom. Os marcados como importantes vêm primeiro.
      </PageHead>
      {!data.notices.length ? (
        <Empty title="Nenhum aviso por aqui">Os avisos chegam quando você entra com o Lyceum ou com o Google.</Empty>
      ) : (
        <>
          {sources.length > 1 && (
            <Tabs<Source | ''> label="Origem" className="mb-5" value={src} onChange={setSrc} tabs={[{ id: '', label: 'Todos' }, ...sources.map((s) => ({ id: s, label: sourceLabel[s] }))]} />
          )}
          <ul className="space-y-3">
            {list.map((n) => (
              <li key={n.id}>
                <details className={cn('card group p-0 [&_summary::-webkit-details-marker]:hidden', n.important && 'border-l-4 border-l-flame-500')}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy-950">{n.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-mute">
                        {n.date ? longDate(n.date) : 'sem data'}
                        <SourceChip source={n.source} />
                        {n.important && <span className="rounded-full bg-flame-100 px-2 py-0.5 text-[11px] font-semibold text-flame-600">Importante</span>}
                      </p>
                    </div>
                    <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-mute transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="border-t border-line px-4 py-4">
                    <p className="text-[14.5px] leading-relaxed whitespace-pre-line text-navy-900">{n.body || 'Sem texto.'}</p>
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-500">
                        Abrir no {sourceLabel[n.source]} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
