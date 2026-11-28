import { useState } from 'react';
import type { NormalizedTask } from '../../types';
import { applyFilters, useTasksStore } from '../../hooks/useTasks';
import { looksLikeTest, useStudyStore, type TestEvent } from '../../hooks/useStudy';
import { groupTasks, refreshTaskTimes } from '../../modules/school-hub/tasks';
import { formatShortDate, getDaysRemaining, getWeekdayName } from '../../utils/dateUtils';
import { Section, TaskRow, useTaskClock, WeekCalendar } from '../Agenda/Agenda';
import { CountUp, ProgressRing } from './bits';
import { subjectColor } from './subjectColor';

interface HomeProps { tasks: NormalizedTask[]; loading: boolean }

function calendarDay(now: Date, offset = 0): Date {
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + offset);
  return result;
}

/** Reject normalized impossible dates instead of silently moving an exam to another month. */
function examDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(0);
  result.setFullYear(year, month - 1, day);
  result.setHours(12, 0, 0, 0);
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : null;
}

export function pickNextTest(tests: TestEvent[], pending: NormalizedTask[], now: Date) {
  const candidates: Array<{ key: string; subject: string; date: Date; detail?: string }> = [];
  const representedTasks = new Set<string>();
  for (const test of tests) {
    const date = examDate(test.date);
    if (date && (getDaysRemaining(date, now) ?? -1) >= 0) {
      candidates.push({ key: test.id, subject: test.subject, date, detail: test.topics[0]?.text });
      if (test.sourceTaskId) representedTasks.add(test.sourceTaskId);
    }
  }
  for (const task of pending) {
    if (!representedTasks.has(task.id) && looksLikeTest(task) && task.dueDate && (getDaysRemaining(task.dueDate, now) ?? -1) >= 0) {
      candidates.push({ key: task.id, subject: task.courseName, date: task.dueDate, detail: task.title });
    }
  }
  const next = candidates.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  return next ? { ...next, days: getDaysRemaining(next.date, now)! } : null;
}

/** Home design from 39e690f; all task state, details and deadlines use the existing foundation. */
export function Home({ tasks, loading }: HomeProps) {
  const filters = useTasksStore((state) => state.filters);
  const completedIds = useTasksStore((state) => state.completedIds);
  const toggleCompleted = useTasksStore((state) => state.toggleCompleted);
  const viewMode = useTasksStore((state) => state.viewMode);
  const tests = useStudyStore((state) => state.tests);
  const setTab = useStudyStore((state) => state.setTab);
  const [offset, setOffset] = useState(0);
  const now = useTaskClock(tasks);
  const visible = applyFilters(refreshTaskTimes(tasks, now), filters);
  const groups = groupTasks(visible, completedIds, now);
  const pending = [...groups.urgent, ...groups.week, ...groups.later];
  const completed = new Set(completedIds);
  const todayTasks = visible.filter((task) => task.daysRemaining === 0);
  const doneToday = todayTasks.filter((task) => task.status === 'entregue' || completed.has(task.id)).length;
  const todayProgress = todayTasks.length ? doneToday / todayTasks.length : 0;
  const weekTasks = visible.filter((task) => task.daysRemaining !== null && task.daysRemaining >= 0 && task.daysRemaining <= 6);
  const weekDone = weekTasks.filter((task) => task.status === 'entregue' || completed.has(task.id)).length;
  const week = Array.from({ length: 7 }, (_, dayOffset) => ({ date: calendarDay(now, dayOffset), offset: dayOffset,
    count: pending.filter((task) => task.daysRemaining === dayOffset).length }));
  const maxLoad = Math.max(1, ...week.map((day) => day.count));
  const overdue = pending.filter((task) => task.urgency === 'overdue');
  const selected = pending.filter((task) => task.daysRemaining === offset && task.urgency !== 'overdue');
  // Every unselected week day stays reachable together; selecting a day never hides a task permanently.
  const otherDays = pending.filter((task) => task.urgency !== 'overdue' && task.daysRemaining !== null
    && task.daysRemaining >= 0 && task.daysRemaining <= 6 && task.daysRemaining !== offset);
  const later = pending.filter((task) => task.daysRemaining !== null && task.daysRemaining > 6);
  const noDate = pending.filter((task) => !task.dueDate);
  const nextTask = pending[0];
  const nextTest = pickNextTest(tests, pending, now);
  const selectedLabel = offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : `${getWeekdayName(week[offset].date)}, ${formatShortDate(week[offset].date)}`;
  const rows = (items: NormalizedTask[], done = false) => items.map((task) => <TaskRow key={task.id} task={task} done={done} accent={subjectColor(task.courseName)} />);

  if (loading) return <p role="status" className="py-10 text-texto-suave">Carregando o painel…</p>;

  return (
    <section aria-label="Painel de estudos de demonstração" className="mx-auto w-full max-w-3xl rounded-card bg-fundo px-2 py-3 text-texto sm:px-4">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'}.</h1>
          <p className="mt-1 text-texto-suave">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</p>
        </div>
        {todayTasks.length > 0 && <p className="text-sm text-texto-suave"><CountUp value={doneToday} className="font-bold text-texto" /> de {todayTasks.length} hoje</p>}
      </header>
      <p className="mb-4 text-sm text-texto-suave">Somente tarefas fictícias. Abra uma lição para escrever sua anotação.</p>
      <nav aria-label="Dias de estudo" className="mb-8 grid grid-cols-7 gap-1">
        {week.map((day) => <button key={day.offset} type="button" onClick={() => setOffset(day.offset)} aria-pressed={day.offset === offset}
          aria-label={`${getWeekdayName(day.date)}, ${formatShortDate(day.date)}: ${day.count} pendentes`}
          className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-2 text-sm ${day.offset === offset ? 'bg-texto text-fundo' : 'hover:bg-borda/50'}`}>
          <span className="text-xs">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day.date)}</span>
          <span className="font-bold">{day.date.getDate()}</span>
          <span aria-hidden="true" className="h-1 w-3/4"><span className="block h-1 rounded-full bg-current" style={{ width: `${day.count / maxLoad * 100}%` }} /></span>
        </button>)}
      </nav>
      {pending.length > 0 && nextTask ? <section aria-label="Foco de hoje" className="mb-8 flex items-center gap-3 sm:gap-5">
        <ProgressRing value={todayProgress}><span className="text-sm font-bold"><CountUp value={Math.round(todayProgress * 100)} />%</span></ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-texto-suave">Próximo a fazer</p>
          <p className="break-words font-bold leading-snug">{nextTask.title}</p>
          <p className="break-words text-sm text-texto-suave"><Dot name={nextTask.courseName} />{nextTask.courseName}</p>
        </div>
        <button type="button" onClick={() => toggleCompleted(nextTask.id)} aria-label={`Concluir "${nextTask.title}"`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-borda text-primaria hover:bg-borda/30">✓</button>
      </section> : <p className="mb-8 text-texto-suave">{visible.length ? 'Tudo em dia. Nenhuma tarefa pendente neste filtro.' : 'Nenhuma tarefa encontrada.'}</p>}
      {nextTest && <button type="button" onClick={() => setTab('provas')} aria-label={`Estudar para ${nextTest.subject}`}
        className="mb-8 flex w-full items-center gap-3 rounded border-y border-borda py-3 text-left hover:bg-borda/30">
        <span className="font-display text-2xl font-semibold tabular-nums">{nextTest.days}</span>
        <span className="text-sm text-texto-suave">{nextTest.days === 1 ? 'dia' : 'dias'}<br />para</span>
        <span className="min-w-0 flex-1"><span className="block break-words font-bold"><Dot name={nextTest.subject} />{nextTest.subject}</span><span className="block break-words text-sm text-texto-suave">{nextTest.detail || 'Prova fictícia'}</span></span>
        <span className="shrink-0 text-sm font-bold text-primaria">Estudar →</span>
      </button>}
      {viewMode === 'calendario' && <WeekCalendar tasks={visible} now={now} />}
      {overdue.length > 0 && <Section label="Atrasadas" count={overdue.length} urgent defaultOpen>{rows(overdue)}</Section>}
      <section aria-label={`Lições de ${selectedLabel}`} className="mb-6">
        <h2 className="mb-1 border-b border-borda pb-2 font-display text-xl font-semibold">{selectedLabel}</h2>
        {selected.length ? <ul>{rows(selected)}</ul> : <p className="py-3 text-texto-suave">Nenhuma lição pendente para este dia.</p>}
      </section>
      <div className="divide-y divide-borda border-y border-borda">
        {otherDays.length > 0 && <Section label="Outros dias desta semana" count={otherDays.length} defaultOpen>{rows(otherDays)}</Section>}
        {later.length > 0 && <Section label="Mais tarde" count={later.length} defaultOpen={false}>{rows(later)}</Section>}
        {noDate.length > 0 && <Section label="Sem data" count={noDate.length} defaultOpen={false}>{rows(noDate)}</Section>}
        {groups.done.length > 0 && <Section label="Feitas" count={groups.done.length} defaultOpen={false}>{rows(groups.done, true)}</Section>}
      </div>
      {weekTasks.length > 0 && <p className="mt-8 text-sm text-texto-suave"><CountUp value={weekDone} className="font-bold text-texto" /> de {weekTasks.length} lições desta semana feitas.</p>}
    </section>
  );
}

function Dot({ name }: { name: string }) {
  return <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: subjectColor(name) }} />;
}
