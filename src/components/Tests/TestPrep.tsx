import { useState } from 'react';
import type { NormalizedTask } from '../../types';
import { getDaysRemaining } from '../../utils/dateUtils';
import { looksLikeTest, useStudyStore, type TestEvent } from '../../hooks/useStudy';
import { styleSummary } from '../Teachers/TeacherProfiles';

const input = 'w-full text-sm rounded-lg border border-borda bg-fundo px-3 py-2 text-texto placeholder:text-texto-suave';
const toDateInput = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');
const parseDate = (s: string) => (s ? new Date(`${s}T23:59`) : null);

/** Provas marcadas: data, contagem regressiva, lista de conteúdos e o estilo do professor. */
export function TestPrep({ tasks, teachers }: { tasks: NormalizedTask[]; teachers: string[] }) {
  const tests = useStudyStore((s) => s.tests);
  const saveTest = useStudyStore((s) => s.saveTest);
  const [editing, setEditing] = useState<TestEvent | null>(null);

  const planned = new Set(tests.map((t) => t.sourceTaskId));
  const suggestions = tasks.filter((t) => looksLikeTest(t) && !planned.has(t.id) && (t.daysRemaining ?? 0) >= 0);
  const sorted = [...tests].sort((a, b) => a.date.localeCompare(b.date));
  const fromTask = (t: NormalizedTask): TestEvent => ({
    id: crypto.randomUUID(),
    subject: t.courseName,
    teacher: t.teacherName,
    date: toDateInput(t.dueDate),
    topics: [],
    sourceTaskId: t.id,
  });

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-texto">Próximas provas</h2>
        <button
          onClick={() => setEditing({ id: crypto.randomUUID(), subject: '', teacher: teachers[0] ?? '', date: '', topics: [] })}
          className="text-sm font-bold text-white bg-primaria hover:bg-primaria/90 rounded-lg px-4 py-2"
        >
          Marcar prova
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-card border border-dashed border-borda p-4 space-y-2">
          <p className="text-sm text-texto-suave">Parecem provas no Classroom:</p>
          {suggestions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-texto min-w-0">{t.title} <span className="text-texto-suave">({t.courseName})</span></span>
              <button onClick={() => setEditing(fromTask(t))} className="text-sm font-bold text-primaria whitespace-nowrap hover:underline">
                Planejar
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && <TestForm test={editing} teachers={teachers} onDone={(t) => { if (t) saveTest(t); setEditing(null); }} />}

      {sorted.length === 0 && !editing ? (
        <p className="text-center text-texto-suave py-8">Nenhuma prova marcada ainda.</p>
      ) : (
        sorted.map((t) => <TestCard key={t.id} test={t} onEdit={() => setEditing(t)} />)
      )}
    </div>
  );
}

function TestForm({ test, teachers, onDone }: { test: TestEvent; teachers: string[]; onDone: (t: TestEvent | null) => void }) {
  const [draft, setDraft] = useState(test);
  const [topics, setTopics] = useState(test.topics.map((t) => t.text).join('\n'));

  return (
    <form
      className="bg-card rounded-card shadow-card p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const done = new Map(test.topics.map((t) => [t.text, t.done]));
        const list = topics.split('\n').map((s) => s.trim()).filter(Boolean);
        onDone({ ...draft, topics: list.map((text) => ({ text, done: done.get(text) ?? false })) });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-texto-suave space-y-1 block">
          <span>Matéria</span>
          <input required value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={input} />
        </label>
        <label className="text-xs text-texto-suave space-y-1 block">
          <span>Professor</span>
          <input list="teachers" value={draft.teacher} onChange={(e) => setDraft({ ...draft, teacher: e.target.value })} className={input} />
          <datalist id="teachers">{teachers.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="text-xs text-texto-suave space-y-1 block">
          <span>Data</span>
          <input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={input} />
        </label>
      </div>
      <label className="text-xs text-texto-suave space-y-1 block">
        <span>Conteúdos (um por linha)</span>
        <textarea value={topics} onChange={(e) => setTopics(e.target.value)} rows={5} placeholder={'Equação do 2º grau\nBhaskara\nGráfico da parábola'} className={`${input} resize-y`} />
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => onDone(null)} className="text-sm text-texto-suave px-4 py-2">Cancelar</button>
        <button className="text-sm font-semibold text-white bg-primaria hover:bg-primaria/90 rounded-lg px-4 py-2">Salvar</button>
      </div>
    </form>
  );
}

/** A prova como cartão de embarque: dados à esquerda, canhoto picotado com os dias que faltam à direita. */
function TestCard({ test, onEdit }: { test: TestEvent; onEdit: () => void }) {
  const saveTest = useStudyStore((s) => s.saveTest);
  const removeTest = useStudyStore((s) => s.removeTest);
  const style = useStudyStore((s) => s.teacherStyles[test.teacher]);
  const days = getDaysRemaining(parseDate(test.date));
  const past = days !== null && days < 0;
  const close = days !== null && days >= 0 && days <= 3;
  const done = test.topics.filter((t) => t.done).length;
  const pct = test.topics.length ? Math.round((done / test.topics.length) * 100) : 0;
  const tips = styleSummary(style);
  const when = test.date ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDate(test.date)!) : '';

  return (
    <article className={`flex flex-col sm:flex-row bg-card rounded-card shadow-card ${past ? 'opacity-60' : ''}`}>
      <div className="flex-1 p-5 space-y-4 min-w-0">
        <div>
          <h3 className="text-xl font-bold text-texto">{test.subject}</h3>
          <p className="text-sm text-texto-suave first-letter:uppercase">
            {when}
            {test.teacher && `, com ${test.teacher}`}
          </p>
        </div>

        {test.topics.length > 0 && (
          <div className="space-y-2">
            <ul className="grid gap-1 sm:grid-cols-2">
              {test.topics.map((topic, i) => (
                <li key={i}>
                  <label className="flex gap-2 text-sm text-texto cursor-pointer">
                    <input
                      type="checkbox"
                      checked={topic.done}
                      onChange={() => saveTest({ ...test, topics: test.topics.map((t, j) => (j === i ? { ...t, done: !t.done } : t)) })}
                      className="accent-primaria mt-0.5"
                    />
                    <span className={topic.done ? 'line-through text-texto-suave' : ''}>{topic.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <div className="h-1 flex-1 rounded-full bg-fundo overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Conteúdos estudados">
                <div className="h-full bg-primaria transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-texto-suave tabular-nums">{done} de {test.topics.length}</span>
            </div>
          </div>
        )}

        {tips.length > 0 && (
          <div className="text-sm text-texto-suave space-y-0.5">
            {tips.map((t) => <p key={t}>{t}</p>)}
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <button onClick={onEdit} className="text-primaria font-bold hover:underline">Editar</button>
          <button onClick={() => confirm('Apagar esta prova?') && removeTest(test.id)} className="text-texto-suave hover:text-urgente">Apagar</button>
        </div>
      </div>

      {/* canhoto do cartão de embarque: linha picotada com dois furos */}
      <div className="relative sm:w-32 flex sm:flex-col items-center justify-center gap-1 px-5 py-4 border-t sm:border-t-0 sm:border-l border-dashed border-borda">
        <span aria-hidden="true" className="hidden sm:block absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-fundo" />
        <span aria-hidden="true" className="hidden sm:block absolute -left-2.5 -bottom-2.5 h-5 w-5 rounded-full bg-fundo" />
        {past ? (
          <p className="text-sm text-texto-suave">Já foi</p>
        ) : days === 0 ? (
          <p className="text-2xl font-bold text-urgente">Hoje</p>
        ) : (
          <>
            <span className={`text-5xl font-bold leading-none tabular-nums ${close ? 'text-urgente' : 'text-texto'}`}>{days}</span>
            <span className="text-sm text-texto-suave">{days === 1 ? 'dia' : 'dias'}</span>
          </>
        )}
      </div>
    </article>
  );
}
