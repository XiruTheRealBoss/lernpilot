import type { NormalizedTask } from '../../types';
import { isWithinNextWeek } from '../../utils/dateUtils';
import { useTasksStore } from '../../hooks/useTasks';
import { TaskCard } from '../TaskCard/TaskCard';
import { EmptyState } from './UrgentColumn';

interface DoneColumnProps {
  tasks: NormalizedTask[];
}

/** Coluna "Semana Passada / Concluídas": tarefas da semana anterior e/ou já entregues. */
export function DoneColumn({ tasks }: DoneColumnProps) {
  const completedIds = useTasksStore((state) => state.completedIds);

  const pastOrDone = tasks.filter((task) => {
    const isCompletedLocally = completedIds.includes(task.id) || task.status === 'entregue';
    const isPastDue = task.dueDate !== null && task.dueDate < new Date() && !isWithinNextWeek(task.dueDate);
    return isCompletedLocally || isPastDue;
  });

  return (
    <section className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-texto">Feitas e passadas</h2>
        <span className="text-sm tabular-nums text-texto-suave">{pastOrDone.length}</span>
      </div>
      {pastOrDone.length === 0 ? (
        <EmptyState message="Nada por aqui ainda." />
      ) : (
        <div className="space-y-3">
          {pastOrDone.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </section>
  );
}
