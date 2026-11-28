import type { NormalizedTask } from '../../types';
import { useTasksStore } from '../../hooks/useTasks';
import { groupTasks } from '../../modules/school-hub/tasks';
import { TaskCard } from '../TaskCard/TaskCard';
import { EmptyState } from './UrgentColumn';

export function LaterColumn({ tasks }: { tasks: NormalizedTask[] }) {
  const completedIds = useTasksStore((state) => state.completedIds);
  const laterTasks = groupTasks(tasks, completedIds).later;
  return (
    <section className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-texto">Mais tarde e sem data</h2>
        <span className="text-sm tabular-nums text-texto-suave">{laterTasks.length}</span>
      </div>
      <div className="space-y-3">
        {laterTasks.length === 0 ? <EmptyState message="Nenhuma outra tarefa." />
          : laterTasks.map((task) => <TaskCard key={task.id} task={task} />)}
      </div>
    </section>
  );
}
