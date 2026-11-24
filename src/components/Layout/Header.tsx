import type { GoogleUserProfile } from '../../types';
import { useTasksStore } from '../../hooks/useTasks';
import { Logo } from './Logo';

interface HeaderProps {
  profile: GoogleUserProfile | null;
  connected: boolean;
  onLogout: () => void;
  onRefresh: () => void;
  loading: boolean;
}

/** Cabeçalho com logo, perfil do aluno, alternância de tema, atualização e logout. */
export function Header({ profile, connected, onLogout, onRefresh, loading }: HeaderProps) {
  const darkMode = useTasksStore((state) => state.darkMode);
  const toggleDarkMode = useTasksStore((state) => state.toggleDarkMode);

  return (
    <header className="border-b border-borda bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <h1 className="text-xl">
        <Logo />
      </h1>

      <div className="flex items-center gap-3">
        {connected && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-sm text-texto-suave hover:text-texto disabled:opacity-50"
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
        )}

        <button
          onClick={toggleDarkMode}
          className="text-sm text-texto-suave hover:text-texto"
        >
          {darkMode ? 'Modo claro' : 'Modo escuro'}
        </button>

        {profile && (
          <div className="flex items-center gap-2">
            {profile.imageUrl ? (
              <img src={profile.imageUrl} alt={profile.name} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secundaria flex items-center justify-center text-white text-sm font-semibold">
                {profile.name.charAt(0)}
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium text-texto">{profile.name}</span>
          </div>
        )}

        {connected && (
        <button
          onClick={onLogout}
          className="text-sm font-medium text-texto-suave hover:text-urgente transition-colors"
        >
          Sair
        </button>
        )}
      </div>
      </div>
    </header>
  );
}
