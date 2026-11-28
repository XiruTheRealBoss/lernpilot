import type { NormalizedTask } from '../../types';
import { useTasksStore } from '../../hooks/useTasks';
import { TaskCard } from '../TaskCard/TaskCard';
import { groupTasks } from '../../modules/school-hub/tasks';

interface UrgentColumnProps {
  tasks: NormalizedTask[];
}

/** Coluna "Hoje & Urgente": tarefas pendentes atrasadas ou que vencem hoje. */
export function UrgentColumn({ tasks }: UrgentColumnProps) {
  const completedIds = useTasksStore((state) => state.completedIds);
  const urgentTasks = groupTasks(tasks, completedIds).urgent;

  return (
    <section className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-texto">Hoje e atrasadas</h2>
        <span className="text-sm tabular-nums text-urgente">{urgentTasks.length}</span>
      </div>
      <div className="space-y-3">
        {urgentTasks.length === 0 ? (
          <EmptyState message="Nada para hoje." />
        ) : (
          urgentTasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-card border border-dashed border-borda p-6 text-center text-sm text-texto-suave">{message}</p>
  );
}
