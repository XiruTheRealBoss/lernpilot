import type { NormalizedTask } from '../../types';
import { getDaysRemaining, getUrgencyLevel, isWithinNextWeek } from '../../utils/dateUtils';
import { sortByUrgency } from '../../utils/taskUtils';

/** Derived deadline values are never authoritative persisted data. Recompute after hydration and on display. */
export function refreshTaskTimes(tasks: NormalizedTask[], now = new Date()): NormalizedTask[] {
  return tasks.map((task) => {
    const dueDate = task.dueDate && Number.isFinite(task.dueDate.getTime()) ? task.dueDate : null;
    return {
      ...task,
      dueDate,
      urgency: getUrgencyLevel(dueDate, now),
      daysRemaining: getDaysRemaining(dueDate, now),
      status: task.status === 'entregue' ? 'entregue'
        : !dueDate ? 'sem_data' : dueDate < now ? 'atrasado' : 'pendente',
    };
  });
}

export interface TaskGroups {
  urgent: NormalizedTask[];
  week: NormalizedTask[];
  later: NormalizedTask[];
  done: NormalizedTask[];
}

/** Exhaustive, mutually exclusive groups. Undated/distant tasks remain visible. */
export function groupTasks(tasks: NormalizedTask[], completedIds: string[], now = new Date()): TaskGroups {
  const groups: TaskGroups = { urgent: [], week: [], later: [], done: [] };
  const completed = new Set(completedIds);
  for (const task of sortByUrgency(refreshTaskTimes(tasks, now))) {
    if (task.status === 'entregue' || completed.has(task.id)) groups.done.push(task);
    else if (task.urgency === 'today' || task.urgency === 'overdue') groups.urgent.push(task);
    else if (isWithinNextWeek(task.dueDate, now)) groups.week.push(task);
    else groups.later.push(task);
  }
  return groups;
}
