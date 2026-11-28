import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { accountClient, ApiError, type AccountTask, type AccountUser } from './client';

export default function LocalAccountApp() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [tasks, setTasks] = useState<AccountTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const generation = useRef(0);
  const identity = useRef<AccountUser | null>(null);
  const clearAccount = useCallback(() => {
    generation.current += 1; identity.current = null;
    setUser(null); setTasks([]); setPassword(''); setTitle(''); setEmail('');
  }, []);
  const handleError = useCallback((failure: unknown) => {
    if (failure instanceof ApiError && (failure.status === 401 || failure.code === 'SESSION_CHANGED')) clearAccount();
    setError(failure instanceof ApiError ? failure.message : 'Não foi possível concluir a solicitação.');
  }, [clearAccount]);
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const current = await accountClient.me();
        const owned = await accountClient.tasks(current.id);
        if (active) { identity.current = current; setUser(current); setTasks(owned); }
      } catch (failure) {
        if (active && !(failure instanceof ApiError && failure.status === 401)) handleError(failure);
      } finally { if (active) setLoading(false); }
    };
    void initialize();
    return () => { active = false; };
  }, [handleError]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const verify = () => {
      if (document.visibilityState === 'hidden') return;
      const previous = identity.current;
      const expectedGeneration = generation.current;
      void accountClient.me().then((current) => {
        if (!active || expectedGeneration !== generation.current) return;
        if (previous && current.id !== previous.id) {
          clearAccount(); setError('A conta mudou em outra aba. Entre novamente para continuar.');
        }
      }).catch((failure: unknown) => { if (active && expectedGeneration === generation.current) handleError(failure); });
    };
    const timer = window.setInterval(verify, 60_000);
    window.addEventListener('focus', verify);
    document.addEventListener('visibilitychange', verify);
    return () => {
      active = false; window.clearInterval(timer); window.removeEventListener('focus', verify);
      document.removeEventListener('visibilitychange', verify);
    };
  }, [user, handleError, clearAccount]);
  async function action(work: (active: () => boolean, expectedUserId?: string) => Promise<void>, verifyIdentity = true) {
    const expectedGeneration = generation.current;
    const active = () => expectedGeneration === generation.current;
    setBusy(true); setError('');
    try {
      const expected = identity.current;
      if (verifyIdentity && expected) {
        const current = await accountClient.me();
        if (!active()) return;
        if (current.id !== expected.id) {
          clearAccount(); setError('A conta mudou em outra aba. Entre novamente para continuar.'); return;
        }
      }
      if (active()) await work(active, expected?.id);
    } catch (failure) { if (active()) handleError(failure); } finally { setBusy(false); }
  }
  function authenticate(event: FormEvent) {
    event.preventDefault();
    void action(async (active) => {
      const current = await accountClient.authenticate(mode, email, password);
      if (!active()) return;
      identity.current = current; setPassword(''); setUser(current);
      const owned = await accountClient.tasks(current.id);
      if (active()) setTasks(owned);
    });
  }
  function createTask(event: FormEvent) {
    event.preventDefault();
    void action(async (active, expectedUserId) => {
      if (!expectedUserId) return;
      const created = await accountClient.create(title, expectedUserId);
      if (active()) { setTasks((existing) => [created, ...existing]); setTitle(''); }
    });
  }
  const field = 'w-full rounded-lg border border-borda bg-white text-texto px-3 py-2';
  const button = 'rounded-lg bg-primaria text-white px-4 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  return (
    <main className="min-h-screen bg-fundo text-texto p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">LernPilot · ambiente local de teste</h1>
          <p>Somente contas e tarefas fictícias. Este ambiente precisa do servidor e do Supabase local.</p>
          <a href="/?demo" className="text-primaria underline">Abrir demonstração offline separada</a>
        </header>
        {error && <p role="alert" className="rounded-lg border border-urgente p-3 text-urgente">{error}</p>}
        {loading ? <p role="status">Verificando sessão…</p> : user ? (
          <section aria-label="Área protegida" className="space-y-4 rounded-card border border-borda bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>Conta fictícia: <strong>{user.email}</strong></p>
              <button disabled={busy} className={button} onClick={() => {
                const expectedUserId = identity.current?.id;
                clearAccount();
                if (expectedUserId) void action(async () => { await accountClient.logout(expectedUserId); }, false);
              }}>Sair</button>
            </div>
            <h2 className="font-bold text-lg">Minhas tarefas de teste</h2>
            <form onSubmit={createTask} className="space-y-2">
              <label htmlFor="task-title">Título fictício</label>
              <input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className={field} disabled={busy} />
              <button disabled={busy || !title.trim()} className={button}>Criar tarefa</button>
            </form>
            {tasks.length === 0 && <p>Nenhuma tarefa. Crie uma tarefa fictícia para verificar o fluxo.</p>}
            <ul className="space-y-2">
              {tasks.map((task) => <li key={task.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-borda p-3">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input type="checkbox" checked={task.completedAt !== null} disabled={busy} onChange={() => void action(async (active, expectedUserId) => {
                    if (!expectedUserId) return;
                    const updated = await accountClient.complete(task.id, task.completedAt ? null : new Date().toISOString(), expectedUserId);
                    if (active()) setTasks((existing) => existing.map((item) => item.id === updated.id ? updated : item));
                  })} />
                  <span className={`break-words ${task.completedAt ? 'line-through' : ''}`}>{task.title}</span>
                </label>
                <button disabled={busy} className="text-urgente underline" aria-label={`Excluir ${task.title}`} onClick={() => void action(async (active, expectedUserId) => {
                  if (!expectedUserId) return;
                  await accountClient.remove(task.id, expectedUserId); if (active()) setTasks((existing) => existing.filter((item) => item.id !== task.id));
                })}>Excluir</button>
              </li>)}
            </ul>
          </section>
        ) : (
          <section className="rounded-card border border-borda bg-card p-4 space-y-4" aria-label="Autenticação de teste">
            <h2 className="font-bold text-lg">{mode === 'login' ? 'Entrar' : 'Criar conta fictícia'}</h2>
            <form onSubmit={authenticate} className="space-y-3">
              <div><label htmlFor="account-email">E-mail fictício terminado em .test</label>
                <input id="account-email" type="email" autoComplete="username" required maxLength={254} placeholder="aluno-a@example.test" value={email} onChange={(e) => setEmail(e.target.value)} className={field} disabled={busy} /></div>
              <div><label htmlFor="account-password">Senha de teste (mínimo 12 caracteres)</label>
                <input id="account-password" type="password" minLength={12} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)} className={field} disabled={busy} /></div>
              <button disabled={busy} className={button}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Registrar conta fictícia'}</button>
            </form>
            <button disabled={busy} className="text-primaria underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setPassword(''); setError(''); }}>
              {mode === 'login' ? 'Criar uma conta de teste' : 'Já tenho uma conta de teste'}
            </button>
            <p><a href="/account" className="text-primaria underline">Recarregar a sessão atual deste navegador</a></p>
          </section>
        )}
        <p className="text-sm">Google, Lyceum e Apple permanecem desativados. Não use senhas reais.</p>
      </div>
    </main>
  );
}
