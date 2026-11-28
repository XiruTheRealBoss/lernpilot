import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../components/Dashboard/Dashboard';
import { useTasksStore } from '../../hooks/useTasks';
import type { NormalizedTask } from '../../types';

function task(id: string, dueDate: Date | null): NormalizedTask {
  return { id, type: 'tarefa', title: id, description: '', courseId: 'demo', courseName: 'Demo',
    teacherName: 'Demo', dueDate, alternateLink: '#', materials: [], status: 'pendente',
    urgency: 'none', daysRemaining: 999, creationTime: null };
}

beforeEach(() => {
  useTasksStore.setState({ completedIds: [], notes: {}, viewMode: 'lista' });
  useTasksStore.getState().resetFilters();
});
afterEach(() => vi.useRealTimers());

describe('complete dashboard', () => {
  it('applies status filters after recalculation and responds to deadline changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 12));
    useTasksStore.getState().setFilters({ status: 'atrasado' });
    render(<Dashboard tasks={[task('Transitions into overdue', new Date(2026, 10, 25, 12, 1))]} loading={false} />);
    expect(screen.queryByRole('heading', { name: 'Transitions into overdue' })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(screen.getByRole('heading', { name: 'Transitions into overdue' })).toBeInTheDocument();
  });
  it.each(['lista', 'calendario'] as const)('keeps distant and undated tasks accessible in %s view', (viewMode) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 12));
    useTasksStore.setState({ viewMode });
    render(<Dashboard tasks={[task('Undated synthetic task', null), task('Distant synthetic task', new Date(2026, 11, 20))]} loading={false} />);
    expect(screen.getByRole('heading', { name: 'Undated synthetic task' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Distant synthetic task' })).toBeInTheDocument();
  });

  it('updates stale values across midnight without a network refresh', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 23, 58));
    render(<Dashboard tasks={[task('Midnight synthetic task', new Date(2026, 10, 25, 23, 59))]} loading={false} />);
    expect(screen.getByText('Hoje!')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(120_001); });
    expect(screen.getByText('Atrasado há 1 dia')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Midnight synthetic task' })).toHaveLength(1);
  });
});
