import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home, pickNextTest } from '../components/Home/Home';
import { CountUp, ProgressRing } from '../components/Home/bits';
import { FilterBar } from '../components/Filters/FilterBar';
import { useTasksStore } from '../hooks/useTasks';
import { useStudyStore, type TestEvent } from '../hooks/useStudy';
import type { NormalizedTask } from '../types';

function task(id: string, dueDate: Date | null, extra: Partial<NormalizedTask> = {}): NormalizedTask {
  return { id, type: 'tarefa', title: id, description: '', courseId: 'demo', courseName: 'Demo',
    teacherName: 'Synthetic teacher', dueDate, alternateLink: 'https://example.invalid/private', materials: [],
    status: 'pendente', urgency: 'none', daysRemaining: 999, creationTime: null, ...extra };
}
const details = (title: string) => screen.getByRole('button', { name: `Detalhes de "${title}"` });
const exam = (id: string, date: string): TestEvent => ({ id, subject: id, teacher: '', date, topics: [] });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 27, 12));
  useTasksStore.setState({ completedIds: [], notes: {}, viewMode: 'lista' });
  useTasksStore.getState().resetFilters();
  useStudyStore.setState({ tests: [], tab: 'licoes' });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('integrated Home dashboard', () => {
  it('keeps every task exactly once across today, overdue, other week days and folded groups', () => {
    render(<Home loading={false} tasks={[
      task('Overdue', new Date(2026, 10, 27, 11)), task('Today', new Date(2026, 10, 27, 15)),
      task('Tomorrow', new Date(2026, 10, 28, 15)), task('Day six', new Date(2026, 11, 3, 15)),
      task('Day seven', new Date(2026, 11, 4, 15)), task('Distant', new Date(2027, 0, 1)),
      task('Undated', null), task('Delivered', null, { status: 'entregue' }),
    ]} />);
    for (const title of ['Overdue', 'Today', 'Tomorrow', 'Day six']) expect(details(title)).toBeVisible();
    for (const name of ['Mais tarde', 'Sem data', 'Feitas']) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name} `) }));
    for (const title of ['Day seven', 'Distant', 'Undated', 'Delivered']) expect(details(title)).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^Detalhes de / })).toHaveLength(8);
    expect(screen.getByRole('checkbox', { name: 'Marcar "Delivered" como feita' })).toBeDisabled();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Dias de estudo' })).getAllByRole('button')[1]);
    expect(within(screen.getByRole('region', { name: 'Lições de Amanhã' })).getByRole('button', { name: 'Detalhes de "Tomorrow"' })).toBeVisible();
    expect(details('Today')).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^Detalhes de / })).toHaveLength(8);
  });

  it('uses the same course/search/status filters and preserves the calendar and notes', () => {
    render(<><FilterBar courses={[{ id: 'demo', name: 'Demo' }, { id: 'other', name: 'Other course' }]} />
      <Home loading={false} tasks={[task('Own undated', null), task('Other undated', null, { courseId: 'other' }), task('Distant', new Date(2027, 0, 1))]} /></>);
    fireEvent.change(screen.getByLabelText('Status da tarefa'), { target: { value: 'sem_data' } });
    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    fireEvent.change(screen.getByLabelText('Buscar tarefa'), { target: { value: 'Own' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sem data / }));
    expect(details('Own undated')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Detalhes de "Other undated"' })).toBeNull();
    fireEvent.click(details('Own undated'));
    fireEvent.change(screen.getByLabelText('Anotação de "Own undated"'), { target: { value: 'Synthetic note' } });
    expect(useTasksStore.getState().notes['Own undated']).toBe('Synthetic note');
    fireEvent.click(screen.getByRole('button', { name: 'Calendário' }));
    expect(screen.getByRole('region', { name: 'Calendário semanal' })).toBeVisible();
    expect(details('Own undated')).toBeVisible();
  });

  it('completion updates the progress and next task, and can be undone in Feitas', () => {
    render(<Home loading={false} tasks={[task('First', new Date(2026, 10, 27, 14)), task('Second', new Date(2026, 10, 27, 15))]} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Concluir "First"' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(within(screen.getByRole('region', { name: 'Foco de hoje' })).getByText('Second')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Feitas / }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar "First" como feita' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(details('First')).toBeVisible();
  });

  it('navigates to the existing exam manager and excludes invalid or past exam dates', () => {
    useStudyStore.setState({ tests: [exam('Invalid', '2026-02-30'), exam('Past', '2026-11-26'), exam('Mathematics', '2026-11-28')] });
    render(<Home loading={false} tasks={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Estudar para Mathematics' }));
    expect(useStudyStore.getState().tab).toBe('provas');
    expect(screen.queryByRole('button', { name: 'Estudar para Invalid' })).toBeNull();
    expect(pickNextTest([exam('Impossible', '2026-13-01')], [], new Date())).toBeNull();
  });

  it('does not offer completed task exams as the next exam', () => {
    useTasksStore.setState({ completedIds: ['Completed exam'] });
    render(<Home loading={false} tasks={[task('Completed exam', new Date(2026, 10, 28), { title: 'Prova de álgebra' })]} />);
    expect(screen.queryByRole('button', { name: /^Estudar para / })).toBeNull();
  });

  it('recalculates deadline status before filtering without a click', () => {
    useTasksStore.getState().setFilters({ status: 'atrasado' });
    render(<Home loading={false} tasks={[task('Transition', new Date(2026, 10, 27, 12, 1))]} />);
    expect(screen.queryByRole('button', { name: 'Detalhes de "Transition"' })).toBeNull();
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => { vi.advanceTimersByTime(1); });
    expect(details('Transition')).toBeVisible();
    expect(screen.getByText('Prazo encerrado hoje')).toBeVisible();
  });

  it('updates the seven-day strip and calendar after midnight', () => {
    vi.setSystemTime(new Date(2026, 10, 27, 23, 59));
    useTasksStore.setState({ viewMode: 'calendario' });
    render(<Home loading={false} tasks={[task('Tomorrow task', new Date(2026, 10, 28, 13))]} />);
    expect(screen.getByRole('navigation', { name: 'Dias de estudo' }).textContent).toContain('27');
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(within(screen.getByRole('region', { name: 'Lições de Hoje' })).getByRole('button', { name: 'Detalhes de "Tomorrow task"' })).toBeVisible();
    expect(within(screen.getByRole('region', { name: 'Calendário semanal' })).queryByText('27/11')).toBeNull();
  });

  it('builds seven distinct local calendar days across a daylight-saving transition', () => {
    vi.stubEnv('TZ', 'America/New_York');
    vi.setSystemTime(new Date(2026, 2, 7, 12));
    render(<Home loading={false} tasks={[task('DST next day', new Date(2026, 2, 8, 12))]} />);
    const buttons = within(screen.getByRole('navigation', { name: 'Dias de estudo' })).getAllByRole('button');
    expect(buttons).toHaveLength(7);
    expect(buttons.map((button) => button.getAttribute('aria-label')?.match(/\d{2}\/\d{2}/)?.[0])).toEqual(['07/03', '08/03', '09/03', '10/03', '11/03', '12/03', '13/03']);
    expect(buttons[1]).toHaveAttribute('aria-label', expect.stringContaining('1 pendentes'));
  });

  it('refreshes a resumed tab and renders untrusted details only as text', () => {
    const title = '<img src=x onerror=alert(1)>';
    render(<Home loading={false} tasks={[task(title, new Date(2026, 10, 27, 13), {
      description: '<script>untrusted</script>', materials: [{ title: 'Synthetic material', url: 'javascript:alert(1)' }],
    })]} />);
    fireEvent.click(details(title));
    expect(screen.getByText('<script>untrusted</script>')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
    expect(document.querySelector('img,script')).toBeNull();
    vi.setSystemTime(new Date(2026, 10, 27, 14));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(screen.getByText('Prazo encerrado hoje')).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retains distinct loading and filtered empty states', () => {
    const { rerender } = render(<Home tasks={[]} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando o painel');
    rerender(<Home tasks={[]} loading={false} />);
    expect(screen.getByText('Nenhuma tarefa encontrada.')).toBeVisible();
  });

  it('exposes final numeric values and clamps the accessible progress range', () => {
    render(<><CountUp value={7} duration={0} /><ProgressRing value={2}><span>100%</span></ProgressRing></>);
    expect(screen.getByLabelText('7')).toHaveTextContent('7');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
