import { File, FileSpreadsheet, FileText, FileType2, Link2, ListChecks, Presentation, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Empty, PageHead, SourceChip } from '@/components/ui-bits'
import { Tabs } from '@/components/ui/vercel-tabs'
import { shortDate } from '@/lib/dates'
import { useStore } from '@/lib/store'
import type { MaterialKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const KIND: Record<MaterialKind, { icon: typeof File; label: string; tone: string }> = {
  doc: { icon: FileText, label: 'Documento', tone: 'bg-blue-50 text-blue-600' },
  slides: { icon: Presentation, label: 'Apresentação', tone: 'bg-flame-100 text-flame-600' },
  sheet: { icon: FileSpreadsheet, label: 'Planilha', tone: 'bg-emerald-50 text-emerald-700' },
  pdf: { icon: FileType2, label: 'PDF', tone: 'bg-red-50 text-red-600' },
  link: { icon: Link2, label: 'Link', tone: 'bg-paper text-navy-800' },
  video: { icon: Video, label: 'Vídeo', tone: 'bg-red-50 text-red-600' },
  form: { icon: ListChecks, label: 'Formulário', tone: 'bg-blue-50 text-navy-800' },
  file: { icon: File, label: 'Arquivo', tone: 'bg-paper text-navy-800' },
}

const KINDS = [
  { id: '', label: 'Tudo' },
  { id: 'doc', label: 'Docs' },
  { id: 'slides', label: 'Slides' },
] as const

export default function Materiais() {
  const { data } = useStore()
  const [subject, setSubject] = useState('')
  const [kind, setKind] = useState<'' | 'doc' | 'slides'>('')
  useEffect(() => {
    document.title = 'Docs & Slides — Lernpilot'
  }, [])
  const subjects = useMemo(() => [...new Set(data.materials.map((m) => m.subject))].sort(), [data.materials])
  const list = data.materials
    .filter((m) => (!subject || m.subject === subject) && (!kind || m.kind === kind))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <div>
      <PageHead eyebrow="Docs & Slides" title="Seus materiais">
        Materiais postados nas turmas do Classroom e os seus Docs, Slides e PDFs mais recentes do Drive.
      </PageHead>
      {!data.materials.length ? (
        <Empty title="Nenhum material ainda">Entre com o Google para ver os materiais do Classroom e os arquivos do Drive.</Empty>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Tabs label="Tipo de material" value={kind} onChange={setKind} tabs={KINDS} />
            <label className="sr-only" htmlFor="mat-materia">Matéria</label>
            <select id="mat-materia" value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-12 rounded-xl border border-line bg-white px-3 text-[13.5px] text-navy-900">
              <option value="">Todas as matérias</option>
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {list.length === 0 ? (
            <p className="card p-6 text-mute">Nenhum material com esse filtro.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((m) => {
                const k = KIND[m.kind]
                const Icon = k.icon
                const body = (
                  <>
                    <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', k.tone)}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block font-medium text-navy-950">{m.title}</span>
                      <span className="mt-1 block text-[12.5px] text-mute">
                        {k.label} · {m.subject}
                        {m.date ? ` · ${shortDate(m.date)}` : ''}
                      </span>
                      <SourceChip source={m.source} className="mt-2" />
                    </span>
                  </>
                )
                return (
                  <li key={m.id}>
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noreferrer" className="card flex h-full items-start gap-3 p-4">
                        {body}
                      </a>
                    ) : (
                      <div className="card flex h-full items-start gap-3 p-4">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
