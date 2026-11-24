import type { NormalizedTask } from '../../types';
import { getWeekdayName, isWithinNextWeek } from '../../utils/dateUtils';
import { useTasksStore } from '../../hooks/useTasks';
import { TaskCard } from '../TaskCard/TaskCard';
import { EmptyState } from './UrgentColumn';

interface WeekColumnProps {
  tasks: NormalizedTask[];
}

/** Coluna "Esta Semana": tarefas pendentes com entrega nos próximos 7 dias, agrupadas por dia. */
export function WeekColumn({ tasks }: WeekColumnProps) {
  const completedIds = useTasksStore((state) => state.completedIds);
  const weekTasks = tasks.filter(
    (task) =>
      task.urgency !== 'overdue' &&
      task.urgency !== 'today' &&
      task.dueDate &&
      isWithinNextWeek(task.dueDate) &&
      task.status !== 'entregue' &&
      !completedIds.includes(task.id),
  );

  const groups = new Map<string, NormalizedTask[]>();
  for (const task of weekTasks) {
    const key = task.dueDate ? getWeekdayName(task.dueDate) : 'Sem data';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  return (
    <section className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-texto">Próximos 7 dias</h2>
        <span className="text-sm tabular-nums text-texto-suave">{weekTasks.length}</span>
      </div>
      {weekTasks.length === 0 ? (
        <EmptyState message="Nenhuma tarefa para os próximos 7 dias." />
      ) : (
        <div className="space-y-4">
          {Array.from(groups.entries()).map(([day, dayTasks]) => (
            <div key={day}>
              <h3 className="text-sm text-texto-suave mb-2">{day}</h3>
              <div className="space-y-3">
                {dayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
