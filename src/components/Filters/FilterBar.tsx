import type { CourseInfo, SubmissionStatus } from '../../types';
import { useTasksStore } from '../../hooks/useTasks';

interface FilterBarProps {
  courses: CourseInfo[];
}

const STATUS_OPTIONS: { value: SubmissionStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'atrasado', label: 'Atrasado' },
];

/** Barra de filtros: turma, status, busca por título e alternância lista/calendário. */
export function FilterBar({ courses }: FilterBarProps) {
  const filters = useTasksStore((state) => state.filters);
  const setFilters = useTasksStore((state) => state.setFilters);
  const viewMode = useTasksStore((state) => state.viewMode);
  const setViewMode = useTasksStore((state) => state.setViewMode);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilters({ courseId: 'todas' })}
          className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
            filters.courseId === 'todas'
              ? 'bg-texto text-white border-texto'
              : 'border-borda text-texto-suave hover:bg-fundo'
          }`}
        >
          Todas as turmas
        </button>
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => setFilters({ courseId: course.id })}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
              filters.courseId === course.id
                ? 'bg-texto text-white border-texto'
                : 'border-borda text-texto-suave hover:bg-fundo'
            }`}
          >
            {course.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => setFilters({ search: event.target.value })}
          placeholder="Buscar tarefa..."
          className="text-sm rounded-lg border border-borda bg-fundo px-3 py-1.5 text-texto placeholder:text-texto-suave focus:outline-none focus:ring-2 focus:ring-primaria/40"
        />

        <select
          value={filters.status}
          onChange={(event) => setFilters({ status: event.target.value as SubmissionStatus | 'todos' })}
          className="text-sm rounded-lg border border-borda bg-fundo px-3 py-1.5 text-texto focus:outline-none focus:ring-2 focus:ring-primaria/40"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-borda overflow-hidden">
          <button
            onClick={() => setViewMode('lista')}
            className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
              viewMode === 'lista' ? 'bg-texto text-white' : 'text-texto-suave hover:bg-fundo'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setViewMode('calendario')}
            className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
              viewMode === 'calendario' ? 'bg-texto text-white' : 'text-texto-suave hover:bg-fundo'
            }`}
          >
            Calendário
          </button>
        </div>
      </div>
    </div>
  );
}
