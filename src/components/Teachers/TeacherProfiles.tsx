import { useState } from 'react';
import { EMPTY_STYLE, useStudyStore, type TeacherProfile, type TeacherStyle } from '../../hooks/useStudy';

const input = 'w-full text-sm rounded-lg border border-borda bg-fundo px-3 py-2 text-texto placeholder:text-texto-suave';

/** Perfil de estilo de prova de cada professor, preenchido pelo aluno. Fica só neste aparelho. */
export function TeacherProfiles({ profiles }: { profiles: TeacherProfile[] }) {
  const addTeacher = useStudyStore((s) => s.addTeacher);
  const [name, setName] = useState('');

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) addTeacher(name.trim());
          setName('');
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do professor" aria-label="Nome do professor" className={input} />
        <button className="text-sm font-semibold text-white bg-primaria hover:bg-primaria/90 rounded-lg px-4 whitespace-nowrap">Adicionar</button>
      </form>
      {profiles.length === 0 ? (
        <p className="text-center text-texto-suave py-12">Adicione um professor ou conecte o Classroom na aba Lições.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => (
            <TeacherCard key={p.name} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeacherCard({ profile }: { profile: TeacherProfile }) {
  const style = useStudyStore((s) => s.teacherStyles[profile.name]) ?? EMPTY_STYLE;
  const setStyle = useStudyStore((s) => s.setTeacherStyle);
  const update = (patch: Partial<TeacherStyle>) => setStyle(profile.name, patch);
  const pending = profile.tasks.filter((t) => t.status !== 'entregue').length;

  return (
    <div className="bg-card rounded-card shadow-card p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-bold text-texto">{profile.name}</h3>
        {profile.courses.length > 0 && <p className="text-sm text-texto-suave">{profile.courses.join(', ')}</p>}
      </div>
      {profile.tasks.length > 0 && (
        <p className="text-sm text-texto-suave">
          {profile.tasks.length} {profile.tasks.length === 1 ? 'tarefa' : 'tarefas'}, {pending} {pending === 1 ? 'pendente' : 'pendentes'}
        </p>
      )}
      <label className="text-xs text-texto-suave space-y-1 block">
        <span>Tipos de questão</span>
        <input value={style.questionTypes} onChange={(e) => update({ questionTypes: e.target.value })} placeholder="Múltipla escolha, dissertativa, contas..." className={input} />
      </label>
      <label className="text-xs text-texto-suave space-y-1 block">
        <span>Dificuldade</span>
        <select value={style.difficulty} onChange={(e) => update({ difficulty: e.target.value as TeacherStyle['difficulty'] })} className={input}>
          <option value="">Não sei ainda</option>
          <option value="facil">Fácil</option>
          <option value="media">Média</option>
          <option value="dificil">Difícil</option>
        </select>
      </label>
      <label className="text-xs text-texto-suave space-y-1 block">
        <span>Temas que sempre caem</span>
        <input value={style.typicalTopics} onChange={(e) => update({ typicalTopics: e.target.value })} placeholder="Gráficos, interpretação de texto..." className={input} />
      </label>
      <label className="text-xs text-texto-suave space-y-1 block">
        <span>Pontos por parte</span>
        <input value={style.pointsPerSection} onChange={(e) => update({ pointsPerSection: e.target.value })} placeholder="Parte A: 4 pts, Parte B: 6 pts" className={input} />
      </label>
      <label className="text-xs text-texto-suave space-y-1 block">
        <span>Dicas (pegadinhas, o que valoriza na resposta)</span>
        <textarea value={style.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} className={`${input} resize-y`} />
      </label>
    </div>
  );
}

/** Resumo curto do estilo, usado no card da prova. */
export function styleSummary(style: TeacherStyle | undefined): string[] {
  if (!style) return [];
  const diff = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', '': '' }[style.difficulty];
  return [
    style.questionTypes && `Questões: ${style.questionTypes}`,
    diff && `Dificuldade: ${diff}`,
    style.typicalTopics && `Sempre cai: ${style.typicalTopics}`,
    style.pointsPerSection && `Pontos: ${style.pointsPerSection}`,
    style.notes && `Dica: ${style.notes}`,
  ].filter(Boolean) as string[];
}
