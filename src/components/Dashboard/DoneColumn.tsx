import type { NormalizedTask } from '../../types';
import { useTasksStore } from '../../hooks/useTasks';
import { TaskCard } from '../TaskCard/TaskCard';
import { EmptyState } from './UrgentColumn';
import { groupTasks } from '../../modules/school-hub/tasks';

interface DoneColumnProps {
  tasks: NormalizedTask[];
}

/** Only completed tasks belong here; an elapsed deadline never implies completion. */
export function DoneColumn({ tasks }: DoneColumnProps) {
  const completedIds = useTasksStore((state) => state.completedIds);

  const pastOrDone = groupTasks(tasks, completedIds).done;

  return (
    <section className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-texto">Concluídas</h2>
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
