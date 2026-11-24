/** Nível de urgência de uma tarefa, calculado a partir da data de entrega. */
export type UrgencyLevel = 'overdue' | 'today' | 'soon' | 'upcoming' | 'none';

/** Status da entrega da tarefa pelo aluno. */
export type SubmissionStatus = 'entregue' | 'pendente' | 'atrasado' | 'sem_data';

/** Tipo de item normalizado: tarefa (courseWork) ou anúncio. */
export type ItemType = 'tarefa' | 'anuncio';

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
}

/** Anexo de material vinculado a uma tarefa ou anúncio. */
export interface MaterialLink {
  title: string;
  url: string;
}

/** Tarefa/atividade normalizada, pronta para exibição no dashboard. */
export interface NormalizedTask {
  id: string;
  type: 'tarefa';
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  teacherName: string;
  dueDate: Date | null;
  alternateLink: string;
  materials: MaterialLink[];
  status: SubmissionStatus;
  urgency: UrgencyLevel;
  daysRemaining: number | null;
  creationTime: Date | null;
  fromAnnouncement?: boolean;
  announcementId?: string;
}

/** Anúncio normalizado, pronto para exibição na seção de avisos. */
export interface NormalizedAnnouncement {
  id: string;
  type: 'anuncio';
  text: string;
  courseId: string;
  courseName: string;
  teacherName: string;
  creationTime: Date | null;
  alternateLink: string;
  materials: MaterialLink[];
  highlighted: boolean;
}

export interface CourseInfo {
  id: string;
  name: string;
  section?: string;
}

/** Filtros aplicados ao conjunto de tarefas exibidas no dashboard. */
export interface TaskFilters {
  courseId: string | 'todas';
  status: SubmissionStatus | 'todos';
  search: string;
}

export type ViewMode = 'lista' | 'calendario';

// ---- Tipos brutos retornados pela Google Classroom API (parciais, defensivos) ----

export interface RawCourse {
  id?: string;
  name?: string;
  section?: string;
  courseState?: string;
}

export interface RawDueDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface RawTimeOfDay {
  hours?: number;
  minutes?: number;
}

export interface RawMaterial {
  driveFile?: { driveFile?: { title?: string; alternateLink?: string } };
  link?: { url?: string; title?: string };
  youTubeVideo?: { title?: string; alternateLink?: string };
  form?: { title?: string; formUrl?: string };
}

export interface RawCourseWork {
  id?: string;
  title?: string;
  description?: string;
  dueDate?: RawDueDate;
  dueTime?: RawTimeOfDay;
  alternateLink?: string;
  creationTime?: string;
  creatorUserId?: string;
  materials?: RawMaterial[];
  courseId?: string;
}

export interface RawAnnouncement {
  id?: string;
  text?: string;
  creationTime?: string;
  alternateLink?: string;
  creatorUserId?: string;
  materials?: RawMaterial[];
  courseId?: string;
}

export interface RawStudentSubmission {
  courseWorkId?: string;
  state?: string;
  late?: boolean;
}

export interface RawUserProfile {
  id?: string;
  name?: { fullName?: string; givenName?: string; familyName?: string };
  emailAddress?: string;
  photoUrl?: string;
}
