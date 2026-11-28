import type { NormalizedTask } from '../../types';
import { formatDaysRemaining, formatDueDate } from '../../utils/dateUtils';
import { useTasksStore } from '../../hooks/useTasks';

interface TaskCardProps {
  task: NormalizedTask;
}

// A urgência aparece só na cor do prazo, sem faixas nem selos.
const DUE_TONE: Record<NormalizedTask['urgency'], string> = {
  overdue: 'text-urgente',
  today: 'text-urgente',
  soon: 'text-amber-700',
  upcoming: 'text-texto',
  none: 'text-texto-suave',
};

/** Uma lição: marcar como feita, prazo, descrição, materiais, anotação e link para o Classroom. */
export function TaskCard({ task }: TaskCardProps) {
  const isCompleted = useTasksStore((state) => state.isCompleted(task.id));
  const toggleCompleted = useTasksStore((state) => state.toggleCompleted);
  const notes = useTasksStore((state) => state.notes[task.id] ?? '');
  const setNote = useTasksStore((state) => state.setNote);

  const delivered = task.status === 'entregue';
  const isDone = isCompleted || delivered;

  return (
    <article className={`bg-card rounded-card shadow-card p-4 `}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => toggleCompleted(task.id)}
          aria-label={`Marcar "${task.title}" como feita`}
          className="mt-1 h-4 w-4 shrink-0 accent-primaria cursor-pointer"
        />
        <div className="min-w-0 flex-1">
          <h3 className={`font-bold text-texto leading-snug ${isDone ? 'line-through decoration-texto-suave' : ''}`}>{task.title}</h3>
          <p className="text-sm text-texto-suave mt-0.5">
            {task.courseName}, {task.teacherName}
          </p>

          <p className="text-sm mt-2">
            {delivered ? (
              <span className="font-bold text-ok">Entregue</span>
            ) : (
              <span className={`font-bold ${DUE_TONE[task.urgency]}`}>{task.urgency === 'overdue' && task.daysRemaining === 0 ? 'Prazo encerrado hoje' : formatDaysRemaining(task.daysRemaining)}</span>
            )}
            {task.dueDate && <span className="ml-2 text-texto-suave">{formatDueDate(task.dueDate)}</span>}
          </p>

          {task.description && <p className="text-sm text-texto-suave mt-2 leading-relaxed line-clamp-3">{task.description}</p>}
          {task.fromAnnouncement && <p className="text-xs text-texto-suave mt-1">Encontrada num aviso do professor.</p>}

          {task.materials.length > 0 && (
            <ul className="mt-2 space-y-1">
              {task.materials.map((material) => (
                <li key={material.url}>
                  <span className="text-sm text-primaria">
                    {material.title}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-3 group" open={!!notes}>
            <summary className="text-sm text-texto-suave cursor-pointer select-none hover:text-texto">Anotação</summary>
            <textarea
              value={notes}
              onChange={(event) => setNote(task.id, event.target.value)}
              rows={2}
              aria-label="Anotação"
              className="w-full mt-2 text-sm rounded-lg border border-borda bg-fundo p-2 text-texto focus:outline-none focus:ring-2 focus:ring-primaria/30 resize-y"
            />
          </details>

          <p className="mt-2 text-xs text-texto-suave">Acesso ao Classroom desativado na demonstração.</p>
        </div>
      </div>
    </article>
  );
}
