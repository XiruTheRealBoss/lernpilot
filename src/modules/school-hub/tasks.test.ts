import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupTasks, refreshTaskTimes } from './tasks';
import type { NormalizedTask } from '../../types';

function task(id: string, dueDate: Date | null, status: NormalizedTask['status'] = 'pendente'): NormalizedTask {
  return { id, type: 'tarefa', title: id, description: '', courseId: 'demo', courseName: 'Demo',
    teacherName: 'Demo', dueDate, alternateLink: '#', materials: [], status,
    urgency: 'none', daysRemaining: 999, creationTime: null };
}

afterEach(() => vi.useRealTimers());

describe('complete task grouping', () => {
  it('shows every task exactly once, including undated and distant deadlines', () => {
    const now = new Date(2026, 10, 25, 12);
    const tasks = [
      task('overdue', new Date(2026, 10, 24)), task('today', new Date(2026, 10, 25, 20)),
      task('week', new Date(2026, 10, 28)), task('later', new Date(2026, 11, 10)),
      task('undated', null), task('submitted', null, 'entregue'), task('local-done', null),
    ];
    const grouped = groupTasks(tasks, ['local-done'], now);
    expect(grouped.urgent.map((t) => t.id)).toEqual(['overdue', 'today']);
    expect(grouped.week.map((t) => t.id)).toEqual(['week']);
    expect(grouped.later.map((t) => t.id)).toEqual(['later', 'undated']);
    expect(grouped.done.map((t) => t.id)).toEqual(['submitted', 'local-done']);
    const ids = Object.values(grouped).flat().map((t) => t.id);
    expect(ids).toHaveLength(tasks.length);
    expect(new Set(ids).size).toBe(tasks.length);
  });

  it('recalculates stale cached urgency, remaining days and pending state', () => {
    const original = task('stale', new Date(2026, 10, 24), 'pendente');
    const [fresh] = refreshTaskTimes([original], new Date(2026, 10, 25, 12));
    expect(fresh.urgency).toBe('overdue');
    expect(fresh.daysRemaining).toBe(-1);
    expect(fresh.status).toBe('atrasado');
    expect(original.urgency).toBe('none');
  });

  it('recalculates after midnight while preserving submitted state', () => {
    const due = new Date(2026, 10, 25, 23, 59);
    const input = [task('open', due), task('submitted', due, 'entregue')];
    expect(refreshTaskTimes(input, new Date(2026, 10, 25, 20))[0].urgency).toBe('today');
    const fresh = refreshTaskTimes(input, new Date(2026, 10, 26, 0, 1));
    expect(fresh[0].urgency).toBe('overdue');
    expect(fresh[0].daysRemaining).toBe(-1);
    expect(fresh[1].status).toBe('entregue');
  });
});
