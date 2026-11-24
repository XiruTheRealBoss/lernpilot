interface ToastProps {
  message: string;
  onClose: () => void;
}

/** Notificação flutuante simples, exibida ao atualizar dados ou em caso de erro. */
export function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-20 bg-texto text-white text-sm font-medium rounded-lg shadow-card px-4 py-3 flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
      <span>{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Fechar notificação">
        ✕
      </button>
    </div>
  );
}
