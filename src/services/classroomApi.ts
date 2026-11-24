import type {
  RawAnnouncement,
  RawCourse,
  RawCourseWork,
  RawStudentSubmission,
  RawUserProfile,
} from '../types';

const API_BASE = 'https://classroom.googleapis.com/v1';

export class ClassroomApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ClassroomApiError';
    this.status = status;
  }
}

const MAX_RETRIES = 3;

/** Faz uma chamada autenticada à Classroom API com retry exponencial para erros de rede. */
async function fetchFromClassroom<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        throw new ClassroomApiError('Sua sessão expirou. Faça login novamente.', 401);
      }
      if (response.status === 403) {
        throw new ClassroomApiError('Você não tem permissão para acessar esta turma.', 403);
      }
      if (!response.ok) {
        throw new ClassroomApiError(`Erro ao buscar dados (status ${response.status}).`, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ClassroomApiError && (error.status === 401 || error.status === 403)) {
        throw error;
      }
      if (attempt < MAX_RETRIES - 1) {
        const delay = 2 ** attempt * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Falha ao se comunicar com a Classroom API.');
}

/** Busca todas as turmas ativas do aluno (paginando se necessário). */
export async function fetchCourses(accessToken: string): Promise<RawCourse[]> {
  const courses: RawCourse[] = [];
  let pageToken: string | undefined;

  do {
    const data = await fetchFromClassroom<{ courses?: RawCourse[]; nextPageToken?: string }>(
      '/courses',
      accessToken,
      { courseStates: 'ACTIVE', ...(pageToken ? { pageToken } : {}) },
    );
    courses.push(...(data.courses ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return courses;
}

/** Busca todas as atividades/tarefas (courseWork) de uma turma. */
export async function fetchCourseWork(courseId: string, accessToken: string): Promise<RawCourseWork[]> {
  const courseWork: RawCourseWork[] = [];
  let pageToken: string | undefined;

  do {
    const data = await fetchFromClassroom<{ courseWork?: RawCourseWork[]; nextPageToken?: string }>(
      `/courses/${courseId}/courseWork`,
      accessToken,
      { courseWorkStates: 'PUBLISHED', orderBy: 'dueDate desc', ...(pageToken ? { pageToken } : {}) },
    );
    courseWork.push(...(data.courseWork ?? []).map((item) => ({ ...item, courseId })));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return courseWork;
}

/** Busca todos os anúncios de uma turma. */
export async function fetchAnnouncements(courseId: string, accessToken: string): Promise<RawAnnouncement[]> {
  const announcements: RawAnnouncement[] = [];
  let pageToken: string | undefined;

  do {
    const data = await fetchFromClassroom<{ announcements?: RawAnnouncement[]; nextPageToken?: string }>(
      `/courses/${courseId}/announcements`,
      accessToken,
      { announcementStates: 'PUBLISHED', orderBy: 'updateTime desc', ...(pageToken ? { pageToken } : {}) },
    );
    announcements.push(...(data.announcements ?? []).map((item) => ({ ...item, courseId })));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return announcements;
}

/** Busca a submissão do aluno para uma tarefa específica. Retorna undefined se não encontrada. */
export async function fetchStudentSubmission(
  courseId: string,
  courseWorkId: string,
  accessToken: string,
): Promise<RawStudentSubmission | undefined> {
  try {
    const data = await fetchFromClassroom<{ studentSubmissions?: RawStudentSubmission[] }>(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`,
      accessToken,
      { userId: 'me' },
    );
    return data.studentSubmissions?.[0];
  } catch {
    return undefined;
  }
}

/** Busca o perfil de um usuário (usado para resolver o nome da professora a partir de creatorUserId). */
export async function fetchUserProfile(userId: string, accessToken: string): Promise<RawUserProfile | undefined> {
  try {
    return await fetchFromClassroom<RawUserProfile>(`/userProfiles/${userId}`, accessToken);
  } catch {
    return undefined;
  }
}
