import { useEffect, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { useClassroom } from './hooks/useClassroom';
import { useTasksStore } from './hooks/useTasks';
import { mockAnnouncements, mockTasks } from './data/mockTasks';
import { extractAllTasksFromAnnouncements } from './utils/announcementParser';
import { LoginButton } from './components/Auth/LoginButton';
import { Header } from './components/Layout/Header';
import { Toast } from './components/Layout/Toast';
import { Home } from './components/Home/Home';
import { TeacherProfiles } from './components/Teachers/TeacherProfiles';
import { TestPrep } from './components/Tests/TestPrep';
import { ConsentGate, PrivacyPolicy, deleteAllData } from './components/Privacy/Privacy';
import { buildTeacherProfiles, useStudyStore, type AppTab } from './hooks/useStudy';

const TABS: { id: AppTab; label: string }[] = [
  { id: 'licoes', label: 'Lições' },
  { id: 'provas', label: 'Provas' },
  { id: 'professores', label: 'Professores' },
  { id: 'notas', label: 'Notas' },
];

// ?demo abre com os dados de exemplo, sem login do Google (para testar)
const USE_MOCK_DATA = new URLSearchParams(location.search).has('demo');

export default function App() {
  const { accessToken, profile, isSessionExpired, login, logout } = useAuth();
  const { tasks, announcements, courses, loading, error, refresh } = useClassroom(accessToken);
  const darkMode = useTasksStore((state) => state.darkMode);

  const [toast, setToast] = useState<string | null>(null);
  const consent = useStudyStore((state) => state.consent);
  const tab = useStudyStore((state) => state.tab);
  const setTab = useStudyStore((state) => state.setTab);
  const extraTeachers = useStudyStore((state) => state.extraTeachers);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (error) setToast(error);
  }, [error]);

  const handleRefresh = async () => {
    await refresh();
    if (!error) setToast('Tarefas atualizadas.');
  };

  if (!consent) return <ConsentGate />;

  const connected = !!accessToken || USE_MOCK_DATA;
  const mockCourses = [...new Map(mockTasks.map((t) => [t.courseId, { id: t.courseId, name: t.courseName }])).values()];
  const mockExtractedTasks = USE_MOCK_DATA ? extractAllTasksFromAnnouncements(mockAnnouncements, mockCourses) : [];
  const displayedTasks = USE_MOCK_DATA ? [...mockTasks, ...mockExtractedTasks] : tasks;
  const displayedAnnouncements = USE_MOCK_DATA ? mockAnnouncements : announcements;
  const profiles = buildTeacherProfiles(displayedTasks, displayedAnnouncements, extraTeachers);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-fundo dark:bg-texto flex flex-col">
      <Header profile={profile} connected={!!accessToken} onLogout={logout} onRefresh={handleRefresh} loading={loading} />

      <main className="max-w-7xl w-full mx-auto px-4 py-4 space-y-6 flex-1">
        <nav className="flex gap-6 overflow-x-auto overflow-y-hidden border-b border-borda" aria-label="Seções">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`relative py-3 text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primaria ${
                tab === t.id ? 'text-texto' : 'text-texto-suave hover:text-texto'
              }`}
            >
              {/* o traço desliza até a aba clicada (Motion) */}
              {tab === t.id && (
                <motion.span layoutId="tab-line" className="absolute inset-x-0 -bottom-px h-0.5 bg-primaria" transition={{ type: 'spring', bounce: 0, duration: 0.35 }} />
              )}
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'licoes' &&
          (connected ? (
            <Home
              tasks={displayedTasks}
              announcements={displayedAnnouncements}
              loading={loading}
            />
          ) : (
            <LoginButton onLogin={login} />
          ))}
        {tab === 'provas' && <TestPrep tasks={displayedTasks} teachers={profiles.map((p) => p.name)} />}
        {tab === 'professores' && <TeacherProfiles profiles={profiles} />}
        {/* boletim do Lyceum Remastered, mesma origem: usa /api/login e /api/boletim deste projeto */}
        {tab === 'notas' && <iframe src="/notas.html" title="Notas do Lyceum" className="w-full h-[calc(100vh-200px)] min-h-[600px] rounded-card shadow-card bg-card border-0" />}
        {tab === 'privacidade' && <PrivacyPolicy />}
      </main>

      <footer className="max-w-7xl w-full mx-auto px-4 py-6 flex flex-wrap gap-4 text-xs text-texto-suave">
        <button onClick={() => setTab('privacidade')} className="hover:text-primaria">Privacidade</button>
        <button onClick={deleteAllData} className="hover:text-urgente">Apagar meus dados</button>
      </footer>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {isSessionExpired && (
        <Toast message="Sua sessão expirou. Faça login novamente." onClose={() => setToast(null)} />
      )}
    </div>
    </MotionConfig>
  );
}
