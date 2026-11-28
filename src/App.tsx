import { useEffect } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { useTasksStore } from './hooks/useTasks';
import { mockAnnouncements, mockTasks } from './data/mockTasks';
import { extractAllTasksFromAnnouncements } from './utils/announcementParser';
import { Header } from './components/Layout/Header';
import { FilterBar } from './components/Filters/FilterBar';
import { Home } from './components/Home/Home';
import { AnnouncementsList } from './components/Announcements/AnnouncementsList';
import { TeacherProfiles } from './components/Teachers/TeacherProfiles';
import { TestPrep } from './components/Tests/TestPrep';
import { PrivacyPolicy, deleteAllData } from './components/Privacy/Privacy';
import { buildTeacherProfiles, useStudyStore, type AppTab } from './hooks/useStudy';
import { GradeDemo } from './modules/grades/GradeDemo';
import { getDemoProfileId } from './infrastructure/runtime';

const TABS: { id: AppTab; label: string }[] = [
  { id: 'licoes', label: 'Lições' }, { id: 'provas', label: 'Provas' },
  { id: 'professores', label: 'Professores' }, { id: 'notas', label: 'Notas' },
];
const mockCourses = [...new Map(mockTasks.map((t) => [t.courseId, { id: t.courseId, name: t.courseName }])).values()];

/** Phase 1 always runs offline with synthetic data, including without ?demo. */
export default function App() {
  const darkMode = useTasksStore((state) => state.darkMode);
  const tab = useStudyStore((state) => state.tab);
  const setTab = useStudyStore((state) => state.setTab);
  const extraTeachers = useStudyStore((state) => state.extraTeachers);
  const profile = getDemoProfileId();
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
  const displayedTasks = [...mockTasks, ...extractAllTasksFromAnnouncements(mockAnnouncements, mockCourses)];
  const profiles = buildTeacherProfiles(displayedTasks, mockAnnouncements, extraTeachers);
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-fundo dark:bg-texto flex flex-col">
        <Header />
        <main className="max-w-7xl w-full mx-auto px-4 py-4 space-y-6 flex-1">
          <aside className="rounded-card border border-borda bg-card p-4 space-y-2" aria-label="Modo de desenvolvimento">
            <p className="font-bold">Demonstração isolada — somente dados fictícios</p>
            <p className="text-sm">Google e Lyceum desativados. Não insira dados reais. Perfis de teste não são contas protegidas.</p>
            <label className="text-sm flex flex-wrap gap-2 items-center">
              Perfil fictício
              <select value={profile} onChange={(event) => {
                const url = new URL(window.location.href);
                url.searchParams.set('demo', '');
                url.searchParams.set('profile', event.target.value);
                window.location.assign(url.href);
              }} className="rounded-lg border border-borda bg-card p-2">
                <option value="demo-a">Demo A</option><option value="demo-b">Demo B</option>
              </select>
            </label>
          </aside>
          <nav className="flex gap-6 overflow-x-auto border-b border-borda" aria-label="Seções">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                className={`relative py-3 text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primaria ${tab === t.id ? 'text-texto' : 'text-texto-suave hover:text-texto'}`}>
                {tab === t.id && <motion.span layoutId="tab-line" className="absolute inset-x-0 -bottom-px h-0.5 bg-primaria" transition={{ type: 'spring', bounce: 0, duration: 0.35 }} />}
                {t.label}
              </button>
            ))}
          </nav>
          {tab === 'licoes' && <><FilterBar courses={mockCourses} /><Home tasks={displayedTasks} loading={false} /><AnnouncementsList announcements={mockAnnouncements} /></>}
          {tab === 'provas' && <TestPrep tasks={displayedTasks} teachers={profiles.map((p) => p.name)} />}
          {tab === 'professores' && <TeacherProfiles profiles={profiles} />}
          {tab === 'notas' && <GradeDemo key={profile} />}
          {tab === 'privacidade' && <PrivacyPolicy />}
        </main>
        <footer className="max-w-7xl w-full mx-auto px-4 py-6 flex flex-wrap gap-4 text-xs text-texto-suave">
          <button onClick={() => setTab('privacidade')}>Privacidade</button>
          <button onClick={deleteAllData} className="text-urgente">Apagar dados deste perfil</button>
        </footer>
      </div>
    </MotionConfig>
  );
}
