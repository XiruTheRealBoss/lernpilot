import { useEffect, useState, type FormEvent } from 'react'
import { PageHead } from '@/components/ui-bits'
import { addTeacher, setTeacherStyle, useStore } from '@/lib/store'
import { buildTeacherProfiles, type TeacherProfile } from '@/lib/study'
import { EMPTY_STYLE, type TeacherStyle } from '@/lib/types'
import { cn } from '@/lib/utils'

const field = 'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-navy-950 outline-none placeholder:text-mute/70 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'

function TeacherCard({ profile }: { profile: TeacherProfile }) {
  const { data } = useStore()
  const style = data.study.teacherStyles[profile.id] ?? EMPTY_STYLE
  const set = (patch: Partial<TeacherStyle>) => setTeacherStyle(profile.id, patch)
  const pending = profile.tasks.filter((t) => !t.done).length
  const exams = data.study.exams.filter((e) => e.teacherId === profile.id).length
  const facts = [
    profile.tasks.length && `${profile.tasks.length} ${profile.tasks.length === 1 ? 'tarefa' : 'tarefas'}, ${pending} ${pending === 1 ? 'pendente' : 'pendentes'}`,
    profile.notices.length && `${profile.notices.length} ${profile.notices.length === 1 ? 'aviso' : 'avisos'}`,
    exams && `${exams} ${exams === 1 ? 'prova marcada' : 'provas marcadas'}`,
  ].filter(Boolean)
  const text = (label: string, key: 'questionTypes' | 'typicalTopics' | 'pointsPerSection', placeholder: string) => (
    <label className="block space-y-1 text-[12.5px] font-medium text-mute">
      <span>{label}</span>
      <input value={style[key]} onChange={(e) => set({ [key]: e.target.value })} placeholder={placeholder} className={field} />
    </label>
  )
  return (
    <section className="card flex flex-col gap-3 p-5" aria-label={profile.name}>
      <div>
        <h2 className="text-[17px] font-semibold text-navy-950">{profile.name}</h2>
        {profile.subjects.length > 0 && <p className="text-[13.5px] text-mute">{profile.subjects.join(', ')}</p>}
        {facts.length > 0 && <p className="mt-1 text-[13px] text-navy-800">{facts.join(' · ')}</p>}
      </div>
      {text('Tipos de questão', 'questionTypes', 'Múltipla escolha, dissertativa, contas')}
      <label className="block space-y-1 text-[12.5px] font-medium text-mute">
        <span>Dificuldade</span>
        <select value={style.difficulty} onChange={(e) => set({ difficulty: e.target.value as TeacherStyle['difficulty'] })} className={field}>
          <option value="">Não sei ainda</option>
          <option value="facil">Fácil</option>
          <option value="media">Média</option>
          <option value="dificil">Difícil</option>
        </select>
      </label>
      {text('Assuntos que sempre caem', 'typicalTopics', 'Gráficos, interpretação de texto')}
      {text('Pontos por parte', 'pointsPerSection', 'Parte A: 4 pts, Parte B: 6 pts')}
      <label className="block space-y-1 text-[12.5px] font-medium text-mute">
        <span>Observações (pegadinhas, o que valoriza na resposta)</span>
        <textarea value={style.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} className={cn(field, 'resize-y py-2')} />
      </label>
    </section>
  )
}

export default function Professores() {
  const { data } = useStore()
  const [name, setName] = useState('')
  useEffect(() => {
    document.title = 'Professores — Lernpilot'
  }, [])
  const profiles = buildTeacherProfiles(data)
  const add = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) addTeacher(name)
    setName('')
  }
  return (
    <div>
      <PageHead eyebrow="Professores" title="Como cada professor faz prova">
        Suas anotações sobre o estilo de cada um. Elas aparecem na prova daquele professor e ficam só neste aparelho.
      </PageHead>
      <form onSubmit={add} className="mb-6 flex max-w-xl gap-2">
        <label className="sr-only" htmlFor="novo-prof">Nome do professor</label>
        <input id="novo-prof" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do professor" className={field} />
        <button className="min-h-11 shrink-0 rounded-xl bg-navy-900 px-4 text-[13.5px] font-semibold text-white transition hover:bg-navy-800 active:translate-y-px">Adicionar professor</button>
      </form>
      {profiles.length === 0 ? (
        <p className="card p-6 text-mute">Nenhum professor ainda. Adicione um acima; os do Lyceum e do Classroom aparecem sozinhos depois de sincronizar.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => (
            <TeacherCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  )
}
