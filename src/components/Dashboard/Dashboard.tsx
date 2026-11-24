import type { NormalizedTask } from '../../types';
import { sortByUrgency } from '../../utils/taskUtils';
import { UrgentColumn, EmptyState } from './UrgentColumn';
import { WeekColumn } from './WeekColumn';
import { DoneColumn } from './DoneColumn';
import { formatShortDate, getWeekdayName } from '../../utils/dateUtils';
import { useTasksStore } from '../../hooks/useTasks';

interface DashboardProps {
  tasks: NormalizedTask[];
  loading: boolean;
}

/** Painel principal: três colunas (urgente, esta semana, concluídas) ou visualização em calendário semanal. */
export function Dashboard({ tasks, loading }: DashboardProps) {
  const viewMode = useTasksStore((state) => state.viewMode);
  const sortedTasks = sortByUrgency(tasks);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="py-12">
        <EmptyState message="Nenhuma tarefa nas últimas 2 semanas." />
      </div>
    );
  }

  if (viewMode === 'calendario') {
    return <WeekCalendar tasks={sortedTasks} />;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <UrgentColumn tasks={sortedTasks} />
      <WeekColumn tasks={sortedTasks} />
      <DoneColumn tasks={sortedTasks} />
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
