import type {
  CourseInfo,
  MaterialLink,
  NormalizedAnnouncement,
  NormalizedTask,
  RawAnnouncement,
  RawCourseWork,
  RawMaterial,
  RawStudentSubmission,
  SubmissionStatus,
} from '../types';
import { buildDueDate, getDaysRemaining, getUrgencyLevel } from './dateUtils';

const ANNOUNCEMENT_KEYWORDS = ['prova', 'trabalho', 'entrega', 'data', 'lembrete', 'atenção', 'atencao'];

/** Extrai links de materiais anexados (drive, links externos, vídeos, formulários). */
export function extractMaterials(materials?: RawMaterial[]): MaterialLink[] {
  if (!materials) return [];
  const result: MaterialLink[] = [];
  for (const material of materials) {
    if (material.driveFile?.driveFile?.alternateLink) {
      result.push({
        title: material.driveFile.driveFile.title ?? 'Arquivo do Drive',
        url: material.driveFile.driveFile.alternateLink,
      });
    } else if (material.link?.url) {
      result.push({ title: material.link.title ?? material.link.url, url: material.link.url });
    } else if (material.youTubeVideo?.alternateLink) {
      result.push({ title: material.youTubeVideo.title ?? 'Vídeo do YouTube', url: material.youTubeVideo.alternateLink });
    } else if (material.form?.formUrl) {
      result.push({ title: material.form.title ?? 'Formulário', url: material.form.formUrl });
    }
  }
  return result;
}

/** Trunca uma descrição para no máximo `maxLength` caracteres, adicionando "..." se necessário. */
export function truncateDescription(text?: string, maxLength = 200): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}...`;
}

/** Determina o status de entrega do aluno a partir da submissão e da data de entrega. */
export function resolveSubmissionStatus(
  submission: RawStudentSubmission | undefined,
  dueDate: Date | null,
): SubmissionStatus {
  const state = submission?.state;
  if (state === 'TURNED_IN' || state === 'RETURNED') return 'entregue';
  if (!dueDate) return 'sem_data';
  const now = new Date();
  if (dueDate < now) return 'atrasado';
  return 'pendente';
}

/** Normaliza um item courseWork da Classroom API em uma NormalizedTask. */
export function normalizeCourseWork(
  raw: RawCourseWork,
  course: CourseInfo,
  teacherName: string,
  submission?: RawStudentSubmission,
): NormalizedTask {
  const dueDate = buildDueDate(raw.dueDate, raw.dueTime);
  const status = resolveSubmissionStatus(submission, dueDate);
  return {
    id: `classroom:${encodeURIComponent(course.id)}:task:${encodeURIComponent(raw.id ?? crypto.randomUUID())}`,
    type: 'tarefa',
    title: raw.title ?? 'Sem título',
    description: truncateDescription(raw.description, 200),
    courseId: course.id,
    courseName: course.name,
    teacherName,
    dueDate,
    alternateLink: raw.alternateLink ?? '#',
    materials: extractMaterials(raw.materials),
    status,
    urgency: getUrgencyLevel(dueDate),
    daysRemaining: getDaysRemaining(dueDate),
    creationTime: raw.creationTime ? new Date(raw.creationTime) : null,
  };
}

/** Normaliza um anúncio da Classroom API em uma NormalizedAnnouncement, destacando palavras-chave. */
export function normalizeAnnouncement(
  raw: RawAnnouncement,
  course: CourseInfo,
  teacherName: string,
): NormalizedAnnouncement {
  const text = raw.text ?? '';
  const lowerText = text.toLowerCase();
  const highlighted = ANNOUNCEMENT_KEYWORDS.some((keyword) => lowerText.includes(keyword));
  return {
    id: `classroom:${encodeURIComponent(course.id)}:announcement:${encodeURIComponent(raw.id ?? crypto.randomUUID())}`,
    type: 'anuncio',
    // Keep original text for extraction; truncate only for visual presentation.
    text,
    courseId: course.id,
    courseName: course.name,
    teacherName,
    creationTime: raw.creationTime ? new Date(raw.creationTime) : null,
    alternateLink: raw.alternateLink ?? '#',
    materials: extractMaterials(raw.materials),
    highlighted,
  };
}

/** Ordena tarefas por urgência: atrasadas/hoje primeiro, depois por data de entrega crescente. */
export function sortByUrgency(tasks: NormalizedTask[]): NormalizedTask[] {
  const urgencyOrder: Record<string, number> = { overdue: 0, today: 1, soon: 2, upcoming: 3, none: 4 };
  return [...tasks].sort((a, b) => {
    const orderDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (orderDiff !== 0) return orderDiff;
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}
