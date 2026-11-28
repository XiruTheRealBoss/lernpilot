import { useEffect, useId, useState, type ReactNode } from 'react';
import type { NormalizedTask } from '../../types';
import { applyFilters, useTasksStore } from '../../hooks/useTasks';
import { groupTasks, refreshTaskTimes } from '../../modules/school-hub/tasks';
import { formatDueDate, formatShortDate, getWeekdayName } from '../../utils/dateUtils';

interface AgendaProps {
  tasks: NormalizedTask[];
  loading: boolean;
}

interface Bucket {
  key: string;
  label: string;
  tasks: NormalizedTask[];
  openByDefault: boolean;
  urgent?: boolean;
}

/** The presentation refines the shared, exhaustive groups; it does not invent deadline rules. */
function agendaBuckets(tasks: NormalizedTask[], completedIds: string[], now: Date): Bucket[] {
  const groups = groupTasks(tasks, completedIds, now);
  return [
    { key: 'atrasadas', label: 'Atrasadas', tasks: groups.urgent.filter((task) => task.urgency === 'overdue'), openByDefault: true, urgent: true },
    { key: 'hoje', label: 'Hoje', tasks: groups.urgent.filter((task) => task.urgency === 'today'), openByDefault: true },
    { key: 'amanha', label: 'Amanhã', tasks: groups.week.filter((task) => task.daysRemaining === 1), openByDefault: true },
    { key: 'semana', label: 'Esta semana', tasks: groups.week.filter((task) => task.daysRemaining !== 1), openByDefault: true },
    { key: 'depois', label: 'Mais tarde', tasks: groups.later.filter((task) => task.dueDate), openByDefault: false },
    { key: 'semdata', label: 'Sem data', tasks: groups.later.filter((task) => !task.dueDate), openByDefault: false },
    { key: 'feitas', label: 'Feitas', tasks: groups.done, openByDefault: false },
  ].filter((bucket) => bucket.tasks.length > 0);
}

/** Editorial agenda from main, backed by the isolated Phase-1 stores and timing rules. */
export function useTaskClock(tasks: NormalizedTask[]): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const nextDeadline = tasks.reduce((next, task) => {
      const deadline = task.dueDate?.getTime();
      return deadline !== undefined && deadline >= now.getTime() ? Math.min(next, deadline + 1) : next;
    }, midnight.getTime());
    const timer = window.setTimeout(refresh, Math.max(1, Math.min(60_000, nextDeadline - Date.now())));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [tasks, now]);

  return now;
}

export function Agenda({ tasks, loading }: AgendaProps) {
  const filters = useTasksStore((state) => state.filters);
  const viewMode = useTasksStore((state) => state.viewMode);
  const completedIds = useTasksStore((state) => state.completedIds);
  const now = useTaskClock(tasks);

  // Recalculate before filtering: a deadline can expire while the overdue filter is selected.
  const visible = applyFilters(refreshTaskTimes(tasks, now), filters);
  const buckets = agendaBuckets(visible, completedIds, now);
  const overdueCount = buckets.find((bucket) => bucket.key === 'atrasadas')?.tasks.length ?? 0;
  const todayCount = buckets.find((bucket) => bucket.key === 'hoje')?.tasks.length ?? 0;

  if (loading) return <p role="status" className="py-10 text-texto-suave">Carregando a agenda…</p>;

  return (
    <section aria-label="Agenda de demonstração" className="mx-auto w-full max-w-4xl rounded-card bg-fundo px-2 py-3 sm:px-4">
      <h1 className="font-display text-3xl font-semibold text-texto">Agenda</h1>
      <p className="mb-5 mt-2 text-sm text-texto-suave">
        {overdueCount} {overdueCount === 1 ? 'atrasada' : 'atrasadas'} · {todayCount} para hoje
        <span className="block mt-1">Somente tarefas fictícias. Abra uma lição para escrever sua anotação.</span>
      </p>
      {viewMode === 'calendario' && <WeekCalendar tasks={visible} now={now} />}
      {buckets.length === 0 ? <p className="py-8 text-texto-suave">Nenhuma tarefa encontrada.</p> : (
        <div className="divide-y divide-borda border-y border-borda">
          {buckets.map((bucket) => (
            <Section key={bucket.key} label={bucket.label} count={bucket.tasks.length} urgent={bucket.urgent} defaultOpen={bucket.openByDefault}>
              {bucket.tasks.map((task) => <TaskRow key={task.id} task={task} done={bucket.key === 'feitas'} />)}
            </Section>
          ))}
        </div>
      )}
    </section>
  );
}

export function Section({ label, count, urgent, defaultOpen, children }: {
  label: string; count: number; urgent?: boolean; defaultOpen: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section>
      <h2>
        <button type="button" aria-label={`${label} ${count}`} aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 py-3 text-left">
          <span aria-hidden="true" className={`text-texto-suave transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          <span className={`font-display text-xl font-semibold ${urgent ? 'text-urgente' : 'text-texto'}`}>{label}</span>
          <span className="ml-auto text-sm text-texto-suave tabular-nums">{count}</span>
        </button>
      </h2>
      <ul id={contentId} hidden={!open} className="pb-2">{children}</ul>
    </section>
  );
}

function whenLabel(task: NormalizedTask): string {
  if (task.status === 'entregue') return 'Entregue';
  if (!task.dueDate) return 'Sem data';
  if (task.urgency === 'overdue') return task.daysRemaining === 0 ? 'Prazo encerrado hoje' : 'Atrasada';
  const time = `${task.dueDate.getHours()}h${String(task.dueDate.getMinutes()).padStart(2, '0')}`;
  if (task.daysRemaining === 0) return `Hoje, ${time}`;
  if (task.daysRemaining === 1) return `Amanhã, ${time}`;
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(task.dueDate);
}

export function TaskRow({ task, done, accent }: { task: NormalizedTask; done: boolean; accent?: string }) {
  const isCompleted = useTasksStore((state) => state.isCompleted(task.id));
  const toggleCompleted = useTasksStore((state) => state.toggleCompleted);
  const note = useTasksStore((state) => state.notes[task.id] ?? '');
  const setNote = useTasksStore((state) => state.setNote);
  const [open, setOpen] = useState(Boolean(note));
  const detailsId = useId();
  return (
    <li className="pl-2 sm:pl-7">
      <div className="flex items-start gap-3 py-2.5">
        <input type="checkbox" checked={isCompleted || task.status === 'entregue'} disabled={task.status === 'entregue'}
          onChange={() => toggleCompleted(task.id)} aria-label={`Marcar "${task.title}" como feita`}
          className="mt-1 h-[18px] w-[18px] shrink-0 cursor-pointer accent-primaria disabled:opacity-60" />
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={detailsId}
          aria-label={`Detalhes de "${task.title}"`} className="min-w-0 flex-1 text-left">
          <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <span className={`min-w-0 flex-1 break-words leading-snug ${done ? 'line-through text-texto-suave' : 'text-texto'}`}>{task.title}</span>
            <span className={`text-sm sm:shrink-0 ${done ? 'text-ok' : task.urgency === 'overdue' || task.urgency === 'today' ? 'text-urgente' : 'text-texto-suave'}`}>{whenLabel(task)}</span>
          </span>
          <span className="mt-0.5 block break-words text-sm text-texto-suave">{accent && <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: accent }} />}{task.courseName}{task.teacherName && ` · ${task.teacherName}`}</span>
        </button>
      </div>
      <div id={detailsId} hidden={!open} className="space-y-3 pb-4 pr-2 text-sm">
        {task.dueDate && <p className="text-texto-suave">Entrega: {formatDueDate(task.dueDate)}</p>}
        {task.fromAnnouncement && <p className="text-texto-suave">Encontrada num aviso do professor.</p>}
        {task.description && <p className="whitespace-pre-wrap break-words leading-relaxed text-texto">{task.description}</p>}
        {task.materials.length > 0 && <ul className="space-y-1">{task.materials.map((material, index) => (
          <li key={`${material.url}-${index}`} className="break-words text-primaria">{material.title}</li>
        ))}</ul>}
        <label className="block text-texto-suave">Anotação
          <textarea value={note} onChange={(event) => setNote(task.id, event.target.value)} rows={2}
            aria-label={`Anotação de "${task.title}"`} maxLength={10_000}
            className="mt-1 w-full resize-y rounded-lg border border-borda bg-card p-2 text-texto" />
        </label>
        <p className="text-xs text-texto-suave">Acesso ao Classroom desativado na demonstração.</p>
      </div>
    </li>
  );
}

export function WeekCalendar({ tasks, now }: { tasks: NormalizedTask[]; now: Date }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
  return (
    <section aria-label="Calendário semanal" className="mb-6">
      <h2 className="mb-2 font-display text-xl text-texto">Calendário semanal</h2>
      <p className="mb-3 text-sm text-texto-suave">O calendário mostra sete dias. A lista completa abaixo inclui todas as tarefas.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((day) => {
          const dayTasks = tasks.filter((task) => task.dueDate?.toDateString() === day.toDateString());
          return (
            <div key={day.toISOString()} className="min-w-0 rounded-card border border-borda bg-card p-3">
              <h3 className="font-display text-sm font-semibold text-texto">{getWeekdayName(day)}</h3>
              <p className="mb-2 text-xs text-texto-suave">{formatShortDate(day)}</p>
              {dayTasks.length === 0 ? <p className="text-xs text-texto-suave">Sem tarefas</p> : <ul className="space-y-2">{dayTasks.map((task) => (
                <li key={task.id} className="break-words text-xs text-texto">{task.title}<span className="block text-texto-suave">{task.courseName}</span></li>
              ))}</ul>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
