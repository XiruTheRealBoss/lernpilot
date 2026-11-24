import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NormalizedTask, TaskFilters, ViewMode } from '../types';

interface TasksState {
  filters: TaskFilters;
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;

  completedIds: string[];
  toggleCompleted: (taskId: string) => void;
  isCompleted: (taskId: string) => boolean;

  notes: Record<string, string>;
  setNote: (taskId: string, note: string) => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;
}

const DEFAULT_FILTERS: TaskFilters = { courseId: 'todas', status: 'todos', search: '' };

/** Store global (Zustand) para filtros, conclusão local de tarefas, anotações, modo de visualização e tema. */
export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      filters: DEFAULT_FILTERS,
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      completedIds: [],
      toggleCompleted: (taskId) =>
        set((state) => ({
          completedIds: state.completedIds.includes(taskId)
            ? state.completedIds.filter((id) => id !== taskId)
            : [...state.completedIds, taskId],
        })),
      isCompleted: (taskId) => get().completedIds.includes(taskId),

      notes: {},
      setNote: (taskId, note) => set((state) => ({ notes: { ...state.notes, [taskId]: note } })),

      viewMode: 'lista',
      setViewMode: (mode) => set({ viewMode: mode }),

      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    { name: 'lernpilot_state' },
  ),
);

/** Aplica os filtros de turma, status e busca a uma lista de tarefas. */
export function applyFilters(tasks: NormalizedTask[], filters: TaskFilters): NormalizedTask[] {
  return tasks.filter((task) => {
    if (filters.courseId !== 'todas' && task.courseId !== filters.courseId) return false;
    if (filters.status !== 'todos' && task.status !== filters.status) return false;
    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      if (!task.title.toLowerCase().includes(query)) return false;
    }
    return true;
  });
}
