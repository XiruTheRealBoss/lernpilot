import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agenda } from './Agenda';
import { FilterBar } from '../Filters/FilterBar';
import { useTasksStore } from '../../hooks/useTasks';
import type { NormalizedTask } from '../../types';

function task(id: string, dueDate: Date | null, extra: Partial<NormalizedTask> = {}): NormalizedTask {
  return { id, type: 'tarefa', title: id, description: '', courseId: 'demo', courseName: 'Demo',
    teacherName: 'Docente fictício', dueDate, alternateLink: 'https://example.invalid/private', materials: [],
    status: 'pendente', urgency: 'none', daysRemaining: 999, creationTime: null, ...extra };
}
const details = (title: string) => screen.getByRole('button', { name: `Detalhes de "${title}"` });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 27, 12));
  useTasksStore.setState({ completedIds: [], notes: {}, viewMode: 'lista' });
  useTasksStore.getState().resetFilters();
});
afterEach(() => vi.useRealTimers());

describe('integrated editorial agenda', () => {
  it('preserves every pending bucket and the delivered group without duplication', () => {
    render(<Agenda loading={false} tasks={[
      task('Overdue today', new Date(2026, 10, 27, 11)),
      task('Today', new Date(2026, 10, 27, 13)),
      task('Tomorrow', new Date(2026, 10, 28, 13)),
      task('Next week', new Date(2026, 11, 2, 13)),
      task('Distant', new Date(2026, 11, 20)), task('Undated', null),
      task('Delivered', null, { status: 'entregue' }),
    ]} />);
    for (const title of ['Overdue today', 'Today', 'Tomorrow', 'Next week']) expect(details(title)).toBeVisible();
    expect(screen.getByText('Prazo encerrado hoje')).toBeVisible();
    for (const label of ['Mais tarde', 'Sem data', 'Feitas']) {
      const button = screen.getByRole('button', { name: new RegExp(`^${label} `) });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(button);
    }
    for (const title of ['Distant', 'Undated', 'Delivered']) expect(details(title)).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^Detalhes de / })).toHaveLength(7);
    expect(screen.getByRole('checkbox', { name: 'Marcar "Delivered" como feita' })).toBeDisabled();
  });

  it('recalculates expired deadlines before applying the status filter without interaction', () => {
    useTasksStore.getState().setFilters({ status: 'atrasado' });
    render(<Agenda tasks={[task('Deadline transition', new Date(2026, 10, 27, 12, 1))]} loading={false} />);
    expect(screen.queryByRole('button', { name: 'Detalhes de "Deadline transition"' })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { vi.advanceTimersByTime(1); });
    expect(details('Deadline transition')).toBeVisible();
    expect(screen.getByText('Prazo encerrado hoje')).toBeVisible();
  });

  it('updates labels and calendar day across midnight', () => {
    vi.setSystemTime(new Date(2026, 10, 27, 23, 58));
    useTasksStore.setState({ viewMode: 'calendario' });
    render(<Agenda tasks={[task('Midnight task', new Date(2026, 10, 27, 23, 59))]} loading={false} />);
    expect(screen.getByText('Hoje, 23h59')).toBeVisible();
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { vi.advanceTimersByTime(1); });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText('Atrasada')).toBeVisible();
    const calendar = screen.getByRole('region', { name: 'Calendário semanal' });
    expect(within(calendar).queryByText('27/11')).not.toBeInTheDocument();
    expect(within(calendar).getByText('28/11')).toBeVisible();
  });

  it.each(['focus', 'visibilitychange'])('refreshes after %s when returning to a sleeping tab', (event) => {
    render(<Agenda tasks={[task('Resumed task', new Date(2026, 10, 27, 13))]} loading={false} />);
    expect(screen.getByText('Hoje, 13h00')).toBeVisible();
    vi.setSystemTime(new Date(2026, 10, 27, 14));
    act(() => { (event === 'focus' ? window : document).dispatchEvent(new Event(event)); });
    expect(screen.getByText('Prazo encerrado hoje')).toBeVisible();
  });

  it('keeps calendar as a secondary view and retains undated and distant tasks below it', () => {
    useTasksStore.setState({ viewMode: 'calendario' });
    render(<Agenda loading={false} tasks={[task('Calendar task', new Date(2026, 10, 28, 13)),
      task('Distant calendar task', new Date(2026, 11, 20)), task('Undated calendar task', null)]} />);
    expect(within(screen.getByRole('region', { name: 'Calendário semanal' })).getByText('Calendar task')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Mais tarde / }));
    fireEvent.click(screen.getByRole('button', { name: /^Sem data / }));
    expect(details('Distant calendar task')).toBeVisible();
    expect(details('Undated calendar task')).toBeVisible();
  });

  it('retains course, search and status filtering through the shared filter controls', () => {
    render(<><FilterBar courses={[{ id: 'demo', name: 'Demo' }, { id: 'other', name: 'Other course' }]} />
      <Agenda loading={false} tasks={[task('Visible overdue', new Date(2026, 10, 26)),
        task('Other overdue', new Date(2026, 10, 26), { courseId: 'other' }), task('Pending', new Date(2026, 10, 28))]} /></>);
    fireEvent.change(screen.getByLabelText('Status da tarefa'), { target: { value: 'atrasado' } });
    expect(screen.queryByRole('button', { name: 'Detalhes de "Pending"' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Demo$/ }));
    expect(screen.queryByRole('button', { name: 'Detalhes de "Other overdue"' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar tarefa'), { target: { value: 'Visible' } });
    expect(details('Visible overdue')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Calendário$/ }));
    expect(screen.getByRole('region', { name: 'Calendário semanal' })).toBeVisible();
  });

  it('allows a new note on a task without description or materials and keeps local completion reversible', () => {
    render(<Agenda loading={false} tasks={[task('Simple task', new Date(2026, 10, 27, 15))]} />);
    fireEvent.click(details('Simple task'));
    fireEvent.change(screen.getByLabelText('Anotação de "Simple task"'), { target: { value: 'Anotação fictícia' } });
    expect(useTasksStore.getState().notes['Simple task']).toBe('Anotação fictícia');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar "Simple task" como feita' }));
    fireEvent.click(screen.getByRole('button', { name: /^Feitas / }));
    expect(screen.getByLabelText('Anotação de "Simple task"')).toHaveValue('Anotação fictícia');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar "Simple task" como feita' }));
    expect(useTasksStore.getState().completedIds).not.toContain('Simple task');
    expect(details('Simple task')).toBeVisible();
  });

  it('shows external content as text with no active provider or material links', () => {
    const title = '<img src=x onerror=alert(1)>';
    render(<Agenda loading={false} tasks={[task(title, new Date(2026, 10, 27, 15), {
      description: '<script>private-data</script>', materials: [{ title: 'Fictitious material', url: 'https://example.invalid/material' }],
    })]} />);
    fireEvent.click(details(title));
    expect(screen.getByText('<script>private-data</script>')).toBeVisible();
    expect(screen.getByText('Fictitious material')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(document.querySelector('img, script')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('provides loading and filtered empty states', () => {
    const { rerender } = render(<Agenda tasks={[]} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a agenda');
    rerender(<Agenda tasks={[]} loading={false} />);
    expect(screen.getByText('Nenhuma tarefa encontrada.')).toBeVisible();
  });
});
