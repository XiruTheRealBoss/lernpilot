import { useTasksStore } from '../../hooks/useTasks';
import { Logo } from './Logo';

export function Header() {
  const darkMode = useTasksStore((state) => state.darkMode);
  const toggleDarkMode = useTasksStore((state) => state.toggleDarkMode);
  return (
    <header className="border-b border-borda bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="text-xl"><Logo /></h1>
        <button onClick={toggleDarkMode} className="text-sm text-texto-suave hover:text-texto">
          {darkMode ? 'Modo claro' : 'Modo escuro'}
        </button>
      </div>
    </header>
  );
}
