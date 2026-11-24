interface LoginButtonProps {
  onLogin: () => void;
}

/** Botão de entrada com a conta Google, exibido na tela inicial. */
export function LoginButton({ onLogin }: LoginButtonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="bg-card rounded-card shadow-card p-10 max-w-md w-full">
        <h2 className="text-xl font-bold text-texto mb-2">Conectar o Classroom</h2>
        <p className="text-texto-suave mb-8">
          Conecte sua conta do Google Classroom para ver todas as lições e avisos por prioridade. É opcional: provas, professores e notas funcionam sem isso.
        </p>
        <button
          onClick={onLogin}
          className="inline-flex items-center justify-center gap-3 w-full bg-primaria hover:bg-primaria/90 text-white font-semibold rounded-lg py-3 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20.5H24V27.5H35.3C33.7 32 29.6 35 24 35C16.8 35 11 29.2 11 22S16.8 9 24 9C27.1 9 29.9 10.1 32.1 12L37.1 7C33.7 3.9 29.1 2 24 2C12.4 2 3 11.4 3 23S12.4 44 24 44C35.6 44 45 34.6 45 23C45 21.8 44.9 21.1 43.6 20.5Z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7L12.9 19.5C14.7 15.1 19 12 24 12C27.1 12 29.9 13.1 32.1 15L37.1 10C33.7 6.9 29.1 5 24 5C16.3 5 9.7 9.3 6.3 14.7Z"
            />
            <path
              fill="#4CAF50"
              d="M24 44C29 44 33.6 42.2 37 39L31.5 34.4C29.6 35.8 27 36.7 24 36.7C18.4 36.7 13.7 33.1 12 28.1L5.5 33.1C8.9 39.6 16 44 24 44Z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20.5H24V27.5H35.3C34.6 29.8 33.2 31.8 31.5 33.2L31.5 33.2L37 38.8C40.7 35.4 43 30.6 43 23C43 21.8 43.5 21.1 43.6 20.5Z"
            />
          </svg>
          Entrar com o Google
        </button>
        <p className="text-xs text-texto-suave mt-4">
          Usamos os escopos de leitura do Google Classroom apenas para buscar suas turmas, tarefas e avisos.
        </p>
      </div>
    </div>
  );
}
