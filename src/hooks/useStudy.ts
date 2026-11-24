import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NormalizedAnnouncement, NormalizedTask } from '../types';

export type AppTab = 'licoes' | 'provas' | 'professores' | 'notas' | 'privacidade';

/** Como um professor costuma montar a prova (preenchido pelo próprio aluno). */
export interface TeacherStyle {
  questionTypes: string; // ex.: "múltipla escolha, dissertativa, contas"
  difficulty: 'facil' | 'media' | 'dificil' | '';
  typicalTopics: string;
  pointsPerSection: string; // ex.: "Parte A 4 pts, Parte B 6 pts"
  notes: string;
}
export const EMPTY_STYLE: TeacherStyle = { questionTypes: '', difficulty: '', typicalTopics: '', pointsPerSection: '', notes: '' };

export interface TopicItem {
  text: string;
  done: boolean;
}
/** Prova marcada, com a lista de conteúdos para estudar. */
export interface TestEvent {
  id: string;
  subject: string;
  teacher: string;
  date: string; // yyyy-mm-dd
  topics: TopicItem[];
  sourceTaskId?: string;
}

export interface Consent {
  by: 'adulto' | 'responsavel';
  at: string;
}

interface StudyState {
  consent: Consent | null;
  giveConsent: (by: Consent['by']) => void;

  teacherStyles: Record<string, TeacherStyle>;
  setTeacherStyle: (teacher: string, style: Partial<TeacherStyle>) => void;
  extraTeachers: string[]; // professores criados à mão (sem Classroom)
  addTeacher: (name: string) => void;

  tests: TestEvent[];
  saveTest: (test: TestEvent) => void;
  removeTest: (id: string) => void;

  // navegação (não persiste)
  tab: AppTab;
  setTab: (tab: AppTab) => void;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      consent: null,
      giveConsent: (by) => set({ consent: { by, at: new Date().toISOString() } }),

      teacherStyles: {},
      setTeacherStyle: (teacher, style) =>
        set((s) => ({ teacherStyles: { ...s.teacherStyles, [teacher]: { ...EMPTY_STYLE, ...s.teacherStyles[teacher], ...style } } })),
      extraTeachers: [],
      addTeacher: (name) => set((s) => (s.extraTeachers.includes(name) ? s : { extraTeachers: [...s.extraTeachers, name] })),

      tests: [],
      saveTest: (test) => set((s) => ({ tests: [...s.tests.filter((t) => t.id !== test.id), test] })),
      removeTest: (id) => set((s) => ({ tests: s.tests.filter((t) => t.id !== id) })),

      tab: 'licoes',
      setTab: (tab) => set({ tab }),
    }),
    {
      name: 'lernpilot_study',
      partialize: (s) => ({ consent: s.consent, teacherStyles: s.teacherStyles, extraTeachers: s.extraTeachers, tests: s.tests }),
    },
  ),
);

export interface TeacherProfile {
  name: string;
  courses: string[];
  tasks: NormalizedTask[];
  announcements: NormalizedAnnouncement[];
}

/** Agrupa o que veio do Classroom por professor e soma os professores criados à mão. */
export function buildTeacherProfiles(
  tasks: NormalizedTask[],
  announcements: NormalizedAnnouncement[],
  extra: string[] = [],
): TeacherProfile[] {
  const map = new Map<string, TeacherProfile>();
  const get = (name: string) => {
    if (!map.has(name)) map.set(name, { name, courses: [], tasks: [], announcements: [] });
    return map.get(name)!;
  };
  for (const name of extra) get(name);
  for (const t of tasks) {
    const p = get(t.teacherName);
    p.tasks.push(t);
    if (!p.courses.includes(t.courseName)) p.courses.push(t.courseName);
  }
  for (const a of announcements) {
    const p = get(a.teacherName);
    p.announcements.push(a);
    if (!p.courses.includes(a.courseName)) p.courses.push(a.courseName);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Tarefas do Classroom que parecem prova (pelo título). */
export const looksLikeTest = (task: NormalizedTask) => /\b(prova|teste|avalia[çc][ãa]o|simulado|recupera[çc][ãa]o)\b/i.test(task.title);

console.assert(
  buildTeacherProfiles(
    [{ teacherName: 'A', courseName: 'Mat' } as NormalizedTask, { teacherName: 'A', courseName: 'Mat' } as NormalizedTask],
    [{ teacherName: 'B', courseName: 'Hist' } as NormalizedAnnouncement],
    ['C'],
  ).map((p) => `${p.name}:${p.courses.join()}:${p.tasks.length}`).join('|') === 'A:Mat:2|B:Hist:0|C::0',
  'buildTeacherProfiles',
);
console.assert(looksLikeTest({ title: 'Prova de História' } as NormalizedTask) && !looksLikeTest({ title: 'Lista 3' } as NormalizedTask), 'looksLikeTest');
