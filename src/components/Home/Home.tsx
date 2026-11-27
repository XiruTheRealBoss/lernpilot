import { useMemo, useState } from 'react';
import type { NormalizedAnnouncement, NormalizedTask } from '../../types';
import { useTasksStore } from '../../hooks/useTasks';
import { looksLikeTest, useStudyStore } from '../../hooks/useStudy';
import { formatDueDate } from '../../utils/dateUtils';
import { subjectColor } from './subjectColor';
import { CountUp, ProgressRing } from './bits';

interface HomeProps {
  tasks: NormalizedTask[];
  announcements: NormalizedAnnouncement[];
  loading: boolean;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const hm = (d: Date) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function Home({ tasks, announcements, loading }: HomeProps) {
  const completedIds = useStudyStoreCompleted();
  const tests = useStudyStore((s) => s.tests);
  const setTab = useStudyStore((s) => s.setTab);
  const [offset, setOffset] = useState(0); // dia escolhido na faixa da semana (0 = hoje)

  const today = startOfDay(new Date());
  const { pending, done } = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'entregue' || completedIds.includes(t.id));
    return { pending: tasks.filter((t) => !done.includes(t)), done };
  }, [tasks, completedIds]);

  const overdue = pending.filter((t) => t.dueDate && startOfDay(t.dueDate) < today);
  const dueOn = (d: Date) => pending.filter((t) => t.dueDate && sameDay(t.dueDate, d));
  const noDate = pending.filter((t) => !t.dueDate);
  const later = pending.filter((t) => t.dueDate && dayDiff(t.dueDate, today) > 6);

  // progresso de hoje: entre todas as lições com entrega hoje, quantas estão feitas
  const dueTodayAll = tasks.filter((t) => t.dueDate && sameDay(t.dueDate, today));
  const doneToday = dueTodayAll.filter((t) => t.status === 'entregue' || completedIds.includes(t.id)).length;
  const todayPct = dueTodayAll.length ? doneToday / dueTodayAll.length : 0;

  // próximo a fazer: atrasada mais antiga, senão a de entrega mais próxima
  const nextTask = [...pending].sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))[0];

  const nextTest = useMemo(() => pickNextTest(tests, tasks, today), [tests, tasks, today]);

  // faixa da semana
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = startOfDay(new Date(today.getTime() + i * 86400000));
    return { d, offset: i, count: dueOn(d).length };
  });
  const maxLoad = Math.max(1, ...week.map((w) => w.count));

  const selected = startOfDay(new Date(today.getTime() + offset * 86400000));
  const selectedList = dueOn(selected);
  const selectedLabel = offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : cap(`${WEEKDAY[selected.getDay()]}, ${selected.getDate()}/${selected.getMonth() + 1}`);

  // rodapé: lições desta semana (hoje..+6)
  const weekTasks = tasks.filter((t) => t.dueDate && dayDiff(t.dueDate, today) >= 0 && dayDiff(t.dueDate, today) <= 6);
  const weekDone = weekTasks.filter((t) => t.status === 'entregue' || completedIds.includes(t.id)).length;

  if (loading) return <p className="text-texto-suave py-10 max-w-2xl mx-auto">Carregando…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* 1. cabeçalho + resumo */}
      <header className="flex items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="font-display text-3xl font-semibold text-texto leading-tight">{greeting()}.</h1>
          <p className="text-texto-suave mt-0.5 first-letter:uppercase">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)}
          </p>
        </div>
        {dueTodayAll.length > 0 && (
          <p className="text-sm text-texto-suave shrink-0">
            <CountUp value={doneToday} className="font-bold text-texto" /> de {dueTodayAll.length} hoje
          </p>
        )}
      </header>

      {/* 2. faixa da semana */}
      <div className="flex gap-1.5 mb-8">
        {week.map((w) => {
          const active = w.offset === offset;
          const isToday = w.offset === 0;
          return (
            <button
              key={w.offset}
              onClick={() => setOffset(w.offset)}
              aria-pressed={active}
              className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl py-2 transition-colors ${active ? 'bg-texto text-fundo' : 'hover:bg-borda/50'}`}
            >
              <span className={`text-xs ${active ? 'text-fundo/70' : 'text-texto-suave'}`}>{WEEKDAY[w.d.getDay()]}</span>
              <span className={`text-sm font-bold ${isToday && !active ? 'text-primaria' : ''}`}>{w.d.getDate()}</span>
              <span className="h-1 w-full px-2">
                <span className="block h-1 rounded-full" style={{ width: `${(w.count / maxLoad) * 100}%`, background: active ? '#F6F5F0' : w.count ? '#2A4BA0' : 'transparent', opacity: active ? 0.7 : 1 }} />
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. foco de hoje: progresso + próximo a fazer */}
      {pending.length > 0 ? (
        <section className="flex items-center gap-5 mb-8">
          <ProgressRing value={todayPct} size={64}>
            <span className="text-sm font-bold text-texto"><CountUp value={Math.round(todayPct * 100)} />%</span>
          </ProgressRing>
          {nextTask && (
            <div className="min-w-0 flex-1">
              <p className="text-sm text-texto-suave mb-0.5">Próximo a fazer</p>
              <p className="font-bold text-texto leading-snug truncate">{nextTask.title}</p>
              <p className="text-sm text-texto-suave truncate">
                <Dot name={nextTask.courseName} />{nextTask.courseName}
                {nextTask.dueDate && <span className={startOfDay(nextTask.dueDate) < today ? 'text-urgente' : ''}> · {dueText(nextTask, today)}</span>}
              </p>
            </div>
          )}
          <CompleteButton task={nextTask} />
        </section>
      ) : (
        <p className="text-texto-suave mb-8">Tudo em dia. Nada pendente no Classroom. 🎈</p>
      )}

      {/* 4. próxima prova */}
      {nextTest && (
        <button onClick={() => setTab('provas')} className="w-full text-left flex items-center gap-3 border-y border-borda py-3 mb-8 hover:bg-borda/30 transition-colors -mx-2 px-2 rounded">
          <span className="font-display text-2xl font-semibold text-texto tabular-nums">{nextTest.days}</span>
          <span className="text-sm text-texto-suave leading-tight">
            {nextTest.days === 0 ? 'dia' : nextTest.days === 1 ? 'dia' : 'dias'}<br />para
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-texto truncate"><Dot name={nextTest.subject} />{nextTest.subject}</span>
            <span className="block text-sm text-texto-suave truncate">{nextTest.detail || 'prova'}</span>
          </span>
          <span className="text-sm text-primaria font-bold shrink-0">Estudar →</span>
        </button>
      )}

      {/* 5. lições do dia escolhido (atrasadas no topo se for hoje) */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-texto pb-2 border-b border-borda mb-1">{selectedLabel}</h2>
        {offset === 0 && overdue.length > 0 && (
          <div className="pt-1">
            <p className="text-sm font-bold text-urgente pt-2 pb-1">Atrasadas · {overdue.length}</p>
            <ul>{overdue.map((t, i) => <LessonRow key={t.id} task={t} index={i} />)}</ul>
          </div>
        )}
        {selectedList.length === 0 ? (
          <p className="text-texto-suave py-3">Nenhuma lição para {selectedLabel.toLowerCase()}.</p>
        ) : (
          <ul>{selectedList.map((t, i) => <LessonRow key={t.id} task={t} index={i} />)}</ul>
        )}
      </section>

      {/* 6. recolhíveis: mais tarde, sem data, feitas */}
      <div className="divide-y divide-borda border-y border-borda">
        {later.length > 0 && <Collapsible label="Mais tarde" count={later.length}>{later.map((t, i) => <LessonRow key={t.id} task={t} index={i} showDate />)}</Collapsible>}
        {noDate.length > 0 && <Collapsible label="Sem data" count={noDate.length}>{noDate.map((t, i) => <LessonRow key={t.id} task={t} index={i} />)}</Collapsible>}
        {done.length > 0 && <Collapsible label="Feitas" count={done.length} muted>{done.map((t, i) => <LessonRow key={t.id} task={t} index={i} done />)}</Collapsible>}
      </div>

      {/* 7. rodapé de constância */}
      {weekTasks.length > 0 && (
        <p className="text-sm text-texto-suave mt-8">
          <CountUp value={weekDone} className="font-bold text-texto" /> de {weekTasks.length} lições desta semana feitas.
        </p>
      )}

      {announcements.length > 0 && <Avisos announcements={announcements} />}
    </div>
  );
}

// completedIds via hook separado para memoização estável
function useStudyStoreCompleted() {
  return useTasksStore((s) => s.completedIds);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function dueText(task: NormalizedTask, today: Date): string {
  if (!task.dueDate) return '';
  const d = dayDiff(task.dueDate, today);
  if (d < 0) return 'atrasada';
  if (d === 0) return `hoje, ${hm(task.dueDate)}`;
  if (d === 1) return `amanhã, ${hm(task.dueDate)}`;
  return `${WEEKDAY[task.dueDate.getDay()]}, ${task.dueDate.getDate()}/${task.dueDate.getMonth() + 1}`;
}

function pickNextTest(tests: { subject: string; date: string; topics: { text: string }[] }[], tasks: NormalizedTask[], today: Date) {
  const cands: { subject: string; date: Date; detail?: string }[] = [];
  for (const t of tests) {
    const d = t.date ? new Date(t.date + 'T12:00') : null;
    if (d && dayDiff(d, today) >= 0) cands.push({ subject: t.subject, date: d, detail: t.topics[0]?.text });
  }
  for (const t of tasks) {
    if (looksLikeTest(t) && t.dueDate && dayDiff(t.dueDate, today) >= 0 && t.status !== 'entregue') {
      cands.push({ subject: t.courseName, date: t.dueDate, detail: t.title });
    }
  }
  const next = cands.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  return next ? { ...next, days: dayDiff(next.date, today) } : null;
}

function Dot({ name }: { name: string }) {
  return <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: subjectColor(name) }} aria-hidden="true" />;
}

function CompleteButton({ task }: { task?: NormalizedTask }) {
  const toggle = useTasksStore((s) => s.toggleCompleted);
  if (!task) return null;
  return (
    <button
      onClick={() => toggle(task.id)}
      className="shrink-0 h-10 w-10 rounded-full border border-borda text-texto-suave hover:border-primaria hover:text-primaria transition-colors flex items-center justify-center"
      aria-label={`Concluir "${task.title}"`}
    >
      ✓
    </button>
  );
}

function Collapsible({ label, count, muted, children }: { label: string; count: number; muted?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <h2>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-3 py-3 text-left">
          <span aria-hidden="true" className={`text-texto-suave transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          <span className={`font-display text-lg font-semibold ${muted ? 'text-texto-suave' : 'text-texto'}`}>{label}</span>
          <span className="ml-auto text-sm text-texto-suave tabular-nums">{count}</span>
        </button>
      </h2>
      {open && <ul className="pb-2">{children}</ul>}
    </section>
  );
}

/** Linha de lição: ponto da matéria + título + prazo + check; abre detalhes ao clicar. */
function LessonRow({ task, index, done, showDate }: { task: NormalizedTask; index: number; done?: boolean; showDate?: boolean }) {
  const isCompleted = useTasksStore((s) => s.isCompleted(task.id));
  const toggle = useTasksStore((s) => s.toggleCompleted);
  const note = useTasksStore((s) => s.notes[task.id] ?? '');
  const setNote = useTasksStore((s) => s.setNote);
  const [open, setOpen] = useState(false);
  const hasDetails = !!(task.description || task.materials.length || task.fromAnnouncement);
  const today = startOfDay(new Date());
  const urgent = !done && !!task.dueDate && startOfDay(task.dueDate) < today;
  const trailing = done && task.status === 'entregue' ? 'entregue'
    : showDate && task.dueDate ? `${WEEKDAY[task.dueDate.getDay()]}, ${task.dueDate.getDate()}/${task.dueDate.getMonth() + 1}`
    : task.dueDate && !done ? (urgent ? 'atrasada' : hm(task.dueDate)) : '';

  return (
    <li className="border-b border-borda/50 last:border-0 animate-[fadeIn_.35s_ease-out_both]" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <div className="flex items-start gap-3 py-2.5">
        <input
          type="checkbox"
          checked={isCompleted || task.status === 'entregue'}
          disabled={task.status === 'entregue'}
          onChange={() => toggle(task.id)}
          aria-label={`Marcar "${task.title}" como feita`}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-primaria cursor-pointer disabled:opacity-60"
        />
        <button type="button" onClick={() => hasDetails && setOpen((v) => !v)} aria-expanded={hasDetails ? open : undefined} className={`min-w-0 flex-1 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}>
          <span className="flex items-baseline gap-3">
            <span className={`flex-1 leading-snug ${done ? 'line-through text-texto-suave' : 'text-texto'}`}>{task.title}</span>
            {trailing && <span className={`shrink-0 text-sm ${urgent ? 'text-urgente' : done ? 'text-ok' : 'text-texto-suave'}`}>{trailing}</span>}
          </span>
          <span className="block text-sm text-texto-suave mt-0.5"><Dot name={task.courseName} />{task.courseName}{task.teacherName && ` · ${task.teacherName}`}</span>
        </button>
      </div>
      {open && hasDetails && (
        <div className="pl-7 pb-4 pr-2 space-y-3 text-sm">
          {task.dueDate && <p className="text-texto-suave">Entrega: {formatDueDate(task.dueDate)}</p>}
          {task.fromAnnouncement && <p className="text-texto-suave">Encontrada num aviso do professor.</p>}
          {task.description && <p className="text-texto leading-relaxed whitespace-pre-wrap">{task.description}</p>}
          {task.materials.length > 0 && (
            <ul className="space-y-1">{task.materials.map((m) => <li key={m.url}><a href={m.url} target="_blank" rel="noopener noreferrer" className="text-primaria underline underline-offset-2">{m.title}</a></li>)}</ul>
          )}
          <textarea value={note} onChange={(e) => setNote(task.id, e.target.value)} rows={2} placeholder="Anotação…" aria-label="Anotação" className="w-full bg-transparent border border-borda rounded-lg p-2 text-texto placeholder:text-texto-suave focus:outline-none focus:border-texto resize-y" />
          <a href={task.alternateLink} target="_blank" rel="noopener noreferrer" className="inline-block font-bold text-primaria hover:underline">Abrir no Classroom</a>
        </div>
      )}
    </li>
  );
}

function Avisos({ announcements }: { announcements: NormalizedAnnouncement[] }) {
  const [open, setOpen] = useState(false);
  const sorted = [...announcements].sort((a, b) => (b.creationTime?.getTime() ?? 0) - (a.creationTime?.getTime() ?? 0));
  return (
    <section className="mt-8 border-t border-borda">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-3 py-3 text-left">
        <span aria-hidden="true" className={`text-texto-suave transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="font-display text-lg font-semibold text-texto">Avisos</span>
        <span className="ml-auto text-sm text-texto-suave tabular-nums">{sorted.length}</span>
      </button>
      {open && (
        <ul className="pb-2">
          {sorted.map((a) => (
            <li key={a.id} className="py-3 border-b border-borda/50 last:border-0">
              <p className="text-sm text-texto-suave"><Dot name={a.courseName} />{a.courseName}{a.teacherName && ` · ${a.teacherName}`}</p>
              <p className="text-texto leading-relaxed mt-0.5">{a.text}</p>
              <a href={a.alternateLink} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-primaria hover:underline mt-1">Ver no Classroom</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
