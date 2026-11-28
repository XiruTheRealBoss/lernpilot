import { useEffect, useState } from 'react';
import type { NormalizedTask } from '../../types';
import { sortByUrgency } from '../../utils/taskUtils';
import { UrgentColumn, EmptyState } from './UrgentColumn';
import { WeekColumn } from './WeekColumn';
import { DoneColumn } from './DoneColumn';
import { LaterColumn } from './LaterColumn';
import { formatShortDate, getWeekdayName } from '../../utils/dateUtils';
import { applyFilters, useTasksStore } from '../../hooks/useTasks';
import { refreshTaskTimes } from '../../modules/school-hub/tasks';

interface DashboardProps {
  tasks: NormalizedTask[];
  loading: boolean;
}

/** Keep existing views while retaining every pending task, including undated/distant items. */
export function Dashboard({ tasks, loading }: DashboardProps) {
  const viewMode = useTasksStore((state) => state.viewMode);
  const filters = useTasksStore((state) => state.filters);
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
  const sortedTasks = sortByUrgency(applyFilters(refreshTaskTimes(tasks, now), filters));

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="py-12">
        <EmptyState message="Nenhuma tarefa encontrada." />
      </div>
    );
  }

  if (viewMode === 'calendario') {
    return (
      <div className="space-y-6">
        <WeekCalendar tasks={sortedTasks} />
        <p className="text-sm text-texto-suave">O calendário mostra sete dias. A lista completa abaixo inclui todas as tarefas.</p>
        <TaskColumns tasks={sortedTasks} />
      </div>
    );
  }

  return <TaskColumns tasks={sortedTasks} />;
}

function TaskColumns({ tasks }: { tasks: NormalizedTask[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <UrgentColumn tasks={tasks} />
      <WeekColumn tasks={tasks} />
      <LaterColumn tasks={tasks} />
      <DoneColumn tasks={tasks} />
    </div>
  );
}

/** Visualização em calendário semanal: tarefas agrupadas por dia, dos próximos 7 dias. */
function WeekCalendar({ tasks }: { tasks: NormalizedTask[] }) {
  const days: Date[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {days.map((day) => {
        const dayTasks = tasks.filter((task) => task.dueDate && task.dueDate.toDateString() === day.toDateString());
        return (
          <div key={day.toISOString()} className="bg-card rounded-card shadow-card p-3 min-h-[140px]">
            <h3 className="font-display text-sm font-semibold text-texto">{getWeekdayName(day)}</h3>
            <p className="font-mono text-xs text-texto-suave mb-2">{formatShortDate(day)}</p>
            <div className="space-y-2">
              {dayTasks.length === 0 ? (
                <p className="text-xs text-texto-suave">Sem tarefas</p>
              ) : (
                dayTasks.map((task) => (
                  <div key={task.id} className="text-xs bg-fundo rounded-lg p-2">
                    <p className="font-semibold text-texto">{task.title}</p>
                    <p className="text-texto-suave">{task.courseName}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Estado de carregamento com cards "esqueleto" animados. */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {[0, 1, 2].map((column) => (
        <div key={column} className="flex-1 min-w-0 space-y-3">
          <div className="h-6 w-40 bg-borda rounded-full animate-pulse" />
          {[0, 1, 2].map((card) => (
            <div key={card} className="bg-card rounded-card shadow-card p-4 space-y-3 animate-pulse">
              <div className="h-3 w-1/3 bg-borda rounded-full" />
              <div className="h-4 w-2/3 bg-borda rounded-full" />
              <div className="h-3 w-full bg-borda rounded-full" />
              <div className="h-3 w-1/2 bg-borda rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
