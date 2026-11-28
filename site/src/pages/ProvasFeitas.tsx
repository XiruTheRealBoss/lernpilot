import { Camera, FolderPlus, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { PageHead, Spinner } from '@/components/ui-bits'
import { longDate, shortDate, todayIso } from '@/lib/dates'
import { deletePhoto, folders, listPhotos, ownerKeys, prepare, savePhoto, titleFromFile, type ExamPhoto } from '@/lib/exam-photos'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const count = (n: number) => (n === 0 ? 'vazia' : n === 1 ? '1 foto' : `${n} fotos`)

/** Shows a stored photo; the address only exists while the picture is on screen. */
function Photo({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url ? <img src={url} alt={alt} className={className} /> : <span className={className} />
}

// how each of the three photos peeking out of a folder moves when it opens
const FAN = [
  'left-[7%] -rotate-3 group-hover:-translate-y-8 group-hover:-rotate-[9deg] group-focus-within:-translate-y-8 group-focus-within:-rotate-[9deg] group-data-[open]:-translate-y-8 group-data-[open]:-rotate-[9deg]',
  'left-[31%] group-hover:-translate-y-11 group-hover:rotate-[2deg] group-focus-within:-translate-y-11 group-focus-within:rotate-[2deg] group-data-[open]:-translate-y-11 group-data-[open]:rotate-[2deg]',
  'left-[55%] rotate-3 group-hover:-translate-y-7 group-hover:rotate-[10deg] group-focus-within:-translate-y-7 group-focus-within:rotate-[10deg] group-data-[open]:-translate-y-7 group-data-[open]:rotate-[10deg]',
]

/** A folder like the reference: the front leans forward and the photos inside rise and fan out. */
function FolderCard({ name, photos, active, onOpen, onAdd }: { name: string; photos: ExamPhoto[]; active: boolean; onOpen: () => void; onAdd: () => void }) {
  return (
    <div className="group relative h-[172px] cursor-pointer" data-open={active || undefined} onClick={onOpen}>
      <span className="absolute top-0 left-0 h-8 w-[46%] rounded-t-[14px] bg-navy-800" />
      <span className="absolute inset-x-0 top-4 bottom-0 rounded-[18px] rounded-tl-none bg-gradient-to-br from-navy-800 via-blue-600 to-flame-500" />
      {photos.slice(0, 3).map((p, i) => (
        <span key={p.id} className={cn('absolute top-7 h-[96px] w-[38%] overflow-hidden rounded-lg border-2 border-white bg-white shadow-md transition-transform duration-300 ease-out motion-reduce:transition-none', FAN[i])}>
          <Photo blob={p.thumb} alt="" className="h-full w-full object-cover" />
        </span>
      ))}
      <div className="absolute inset-x-0 bottom-0 flex h-[62%] origin-bottom items-end justify-between gap-2 rounded-[18px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_30px_-12px_rgba(4,16,43,.45)] backdrop-blur-md transition-transform duration-300 ease-out group-hover:[transform:perspective(700px)_rotateX(-18deg)] group-focus-within:[transform:perspective(700px)_rotateX(-18deg)] group-data-[open]:[transform:perspective(700px)_rotateX(-18deg)] motion-reduce:transition-none">
        <div className="min-w-0">
          <button type="button" aria-expanded={active} className="block max-w-full truncate rounded text-left font-display text-[16px] font-semibold text-navy-950">
            {name}
          </button>
          <p className="text-[12.5px] text-mute">{count(photos.length)}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          aria-label={`Adicionar foto em ${name}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-950 text-white transition hover:bg-navy-800 active:scale-95"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/** Title, date and the two ways in: pick images or take a picture with the camera. */
function AddPhotos({ folder, owners, onSaved }: { folder: string; owners: string[]; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [camera, setCamera] = useState(false)
  const video = useRef<HTMLVideoElement>(null)

  const save = async (source: Blob, fallback: string) => {
    const { image, thumb } = await prepare(source)
    await savePhoto({ id: crypto.randomUUID(), owners, folder, title: title.trim() || fallback, date: date || todayIso(), added: Date.now(), image, thumb })
  }

  const onFiles = async (files: File[]) => {
    if (!files.length) return
    setBusy(true)
    let ok = 0
    for (const f of files)
      try {
        await save(f, titleFromFile(f.name))
        ok++
      } catch {
        // counted below: a format this browser cannot read (HEIC, for one) or no space left
      }
    setBusy(false)
    setMsg(ok === files.length ? (ok === 1 ? 'Foto guardada.' : `${ok} fotos guardadas.`) : `${ok} de ${files.length} guardadas. As outras não puderam ser lidas; tente em JPG ou PNG.`)
    onSaved()
  }

  // the camera stays on only while its preview is open
  useEffect(() => {
    if (!camera) return
    let stream: MediaStream | undefined
    let closed = false
    const fail = () => {
      setMsg('Não consegui abrir a câmera (sem permissão ou sem câmera). Use "Enviar imagens".')
      setCamera(false)
    }
    if (!navigator.mediaDevices) fail()
    else
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }).then((s) => {
        if (closed) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) video.current.srcObject = s
      }, fail)
    return () => {
      closed = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [camera])

  const shoot = async () => {
    const v = video.current
    if (!v?.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.92))
    if (!blob) return
    setBusy(true)
    try {
      await save(blob, 'Prova')
      setMsg('Foto guardada. Pode tirar a próxima.')
      onSaved()
    } catch {
      setMsg('Não consegui guardar a foto (sem espaço no navegador?).')
    }
    setBusy(false)
  }

  const field = 'min-h-11 rounded-xl border border-line bg-white px-3 text-[14px] text-navy-950'
  const action = 'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold transition active:scale-[.98]'
  return (
    <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[180px] flex-1 gap-1 text-[12.5px] font-medium text-navy-800">
          Nome da prova (opcional)
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Prova 1 do 2º semestre" className={field} />
        </label>
        <label className="grid gap-1 text-[12.5px] font-medium text-navy-800">
          Dia da prova
          <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
        <label className={cn(action, 'bg-navy-950 text-white hover:bg-navy-800', busy && 'pointer-events-none opacity-60')}>
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Enviar imagens
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void onFiles([...(e.target.files ?? [])])
              e.target.value = '' // lets the same file be picked again
            }}
          />
        </label>
        <button type="button" onClick={() => setCamera((v) => !v)} aria-pressed={camera} className={cn(action, 'border border-line bg-white text-navy-950 hover:border-blue-300')}>
          <Camera className="h-4 w-4" aria-hidden="true" />
          {camera ? 'Fechar câmera' : 'Tirar foto'}
        </button>
      </div>
      {camera && (
        <div className="mt-4 grid justify-items-start gap-3">
          <video ref={video} autoPlay playsInline muted className="max-h-[60vh] w-full max-w-[640px] rounded-xl bg-navy-950" />
          <button type="button" onClick={shoot} disabled={busy} className={cn(action, 'bg-flame-500 text-white hover:bg-flame-600 disabled:opacity-60')}>
            <Camera className="h-4 w-4" aria-hidden="true" />
            Fotografar a prova
          </button>
        </div>
      )}
      <p role="status" className="mt-3 flex min-h-5 items-center gap-2 text-[13px] text-navy-800">
        {busy && <Spinner />}
        {busy ? 'Guardando…' : msg}
      </p>
    </div>
  )
}

export default function ProvasFeitas() {
  const { data, profile, demo } = useStore()
  const owners = ownerKeys(profile, data.connections, demo).join('\n') // one string: a stable value for the effect below
  const [photos, setPhotos] = useState<ExamPhoto[]>([])
  const [created, setCreated] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ExamPhoto | null>(null)
  const [newName, setNewName] = useState('')
  const [blocked, setBlocked] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const viewer = useRef<HTMLDialogElement>(null)

  const reload = useCallback(() => listPhotos(owners.split('\n')).then(setPhotos, () => setBlocked(true)), [owners])
  useEffect(() => {
    document.title = 'Provas feitas — Lernpilot'
    void reload()
  }, [reload])
  useEffect(() => {
    if (viewing) viewer.current?.showModal()
  }, [viewing])

  const list = folders(data.subjects.map((s) => s.subject), photos, created)
  const current = list.find((f) => f.name === open)
  const show = (name: string) => {
    setOpen(name)
    requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }
  const addFolder = (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreated((c) => [...c, name])
    setNewName('')
    show(name)
  }
  const remove = async (p: ExamPhoto) => {
    if (!window.confirm(`Apagar a foto "${p.title}"? Não dá para desfazer.`)) return
    await deletePhoto(p.id)
    viewer.current?.close()
    void reload()
  }

  return (
    <div>
      <PageHead eyebrow="Provas feitas" title="Seu histórico de provas">
        Guarde a foto de cada prova que você já fez, numa pasta por matéria. As fotos ficam só neste navegador; não vão para nenhum servidor.
      </PageHead>
      {blocked && <p className="card mb-6 border-l-4 border-l-flame-500 p-4 text-[14px] text-navy-900">Este navegador não deixou guardar fotos (armazenamento bloqueado ou janela anônima). Abra numa janela normal para usar o histórico.</p>}

      <div className="grid grid-cols-1 gap-x-5 gap-y-12 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((f) => (
          <FolderCard key={f.name} name={f.name} photos={f.photos} active={open === f.name} onOpen={() => show(f.name)} onAdd={() => show(f.name)} />
        ))}
        <form onSubmit={addFolder} className="flex h-[172px] flex-col justify-end gap-2 rounded-[18px] border-2 border-dashed border-line p-4">
          <label htmlFor="nova-pasta" className="flex items-center gap-2 text-[13.5px] font-medium text-navy-800">
            <FolderPlus className="h-4 w-4" aria-hidden="true" /> Nova pasta
          </label>
          <div className="flex gap-2">
            <input id="nova-pasta" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Simulados" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-[14px] text-navy-950" />
            <button type="submit" className="min-h-11 rounded-xl bg-navy-950 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-800">
              Criar
            </button>
          </div>
        </form>
      </div>

      {current && (
        <section ref={panel} aria-labelledby="pasta-aberta" className="card mt-10 scroll-mt-24 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="pasta-aberta" className="font-display text-[19px] font-semibold text-navy-950">
              {current.name} <span className="ml-2 text-[13px] font-normal text-mute">{count(current.photos.length)}</span>
            </h2>
            <button type="button" onClick={() => setOpen(null)} aria-label="Fechar pasta" className="grid h-10 w-10 place-items-center rounded-xl text-navy-800 hover:bg-blue-50">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <AddPhotos key={current.name} folder={current.name} owners={owners.split('\n')} onSaved={() => void reload()} />
          {current.photos.length === 0 ? (
            <p className="mt-5 text-[14px] text-mute">Nenhuma foto nesta pasta ainda.</p>
          ) : (
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {current.photos.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setViewing(p)} className="group block w-full overflow-hidden rounded-xl border border-line bg-white text-left transition hover:border-blue-300 hover:shadow-md">
                    <Photo blob={p.thumb} alt={`Foto da prova ${p.title}`} className="block aspect-[4/3] w-full bg-paper object-cover" />
                    <span className="block truncate px-3 pt-2 text-[14px] font-medium text-navy-950">{p.title}</span>
                    <span className="block px-3 pb-2.5 text-[12.5px] text-mute">{shortDate(p.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <dialog ref={viewer} onClose={() => setViewing(null)} aria-label={viewing ? `Prova ${viewing.title}` : undefined} className="m-auto max-h-[94vh] w-[min(96vw,1100px)] rounded-2xl p-0 backdrop:bg-navy-950/80">
        {viewing && (
          <div className="flex max-h-[94vh] flex-col">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[16px] font-semibold text-navy-950">{viewing.title}</p>
                <p className="text-[12.5px] text-mute">
                  {viewing.folder} · {longDate(viewing.date)}
                </p>
              </div>
              <button type="button" onClick={() => void remove(viewing)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-flame-600 hover:bg-flame-100">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Apagar
              </button>
              <button type="button" onClick={() => viewer.current?.close()} aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-xl text-navy-800 hover:bg-blue-50">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-auto bg-navy-950">
              <Photo blob={viewing.image} alt={`Foto da prova ${viewing.title}`} className="mx-auto block max-w-full" />
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}
