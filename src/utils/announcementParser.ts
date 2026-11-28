/**
 * Parser de linguagem natural (pt-BR) para extrair tarefas implícitas de avisos de professoras.
 * Detecta menções a lições, entregas, provas e datas dentro do texto livre de anúncios.
 */

import type { CourseInfo, NormalizedAnnouncement, NormalizedTask } from '../types';
import { getDaysRemaining, getUrgencyLevel } from './dateUtils';

// ---- Constantes de detecção ----

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1, 'segunda-feira': 1,
  terça: 2, terca: 2, 'terça-feira': 2, 'terca-feira': 2,
  quarta: 3, 'quarta-feira': 3,
  quinta: 4, 'quinta-feira': 4,
  sexta: 5, 'sexta-feira': 5,
  sábado: 6, sabado: 6,
};

const MONTHS: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3,
  maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8,
  outubro: 9, novembro: 10, dezembro: 11,
};

/** Indicadores de que a frase contém uma tarefa/lição. */
const TASK_PATTERNS = [
  /li[çc][aã]o\s+de\s+casa/i,
  /\bli[çc][aã]o\b/i,
  /exerc[ií]cios?/i,
  /\batividade\b/i,
  /\btrabalho\b/i,
  /\btarefa\b/i,
  /reda[çc][aã]o/i,
  /\blista\s+de\b/i,
  /relat[oó]rio/i,
  /\bpesquisa\b/i,
  /\bprojeto\b/i,
  /\bprova\b/i,
  /\btest[ae]\b/i,
  /\bentregar\b/i,
  /\bentrega\b/i,
  /\bprazo\b/i,
  /\bfazer\s+(os?\s+)?(exerc|ativ|lista|quest)/i,
  /\bresolver\b/i,
  /\bresponder\b/i,
  /\btrazer\b/i,
  /\bestud[ae]r\b/i,
];

// ---- Parsing de datas ----

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function nextOccurrenceOfWeekday(weekday: number, from: Date): Date {
  const result = new Date(from);
  const daysAhead = ((weekday - from.getDay() + 7) % 7) || 7;
  result.setDate(result.getDate() + daysAhead);
  result.setHours(23, 59, 0, 0);
  return result;
}

/** Creates a local calendar date without silently rolling nonexistent dates into another month. */
function calendarDate(year: number, month: number, day: number): Date | null {
  if (![year, month, day].every(Number.isInteger) || year < 1 || year > 9999
    || month < 0 || month > 11 || day < 1 || day > 31) return null;
  const result = new Date(0);
  result.setFullYear(year, month, day);
  result.setHours(23, 59, 0, 0);
  return result.getFullYear() === year && result.getMonth() === month && result.getDate() === day ? result : null;
}

/** Inferred dates remain suggestions; null publication time prevents guessing relative dates. */
export function parseDateFromText(text: string, reference: Date | null = new Date()): Date | null {
  const norm = normalize(text);
  const validReference = reference && Number.isFinite(reference.getTime()) ? reference : null;

  // An explicit date takes precedence over weekday/relative words in the same message.
  const dmMatch = norm.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dmMatch) {
    if (!dmMatch[3] && !validReference) return null;
    if (dmMatch[3] && ![2, 4].includes(dmMatch[3].length)) return null;
    let year = dmMatch[3] ? Number(dmMatch[3]) : validReference!.getFullYear();
    if (year < 100) year += 2000;
    return calendarDate(year, Number(dmMatch[2]) - 1, Number(dmMatch[1]));
  }

  for (const [monthName, monthIdx] of Object.entries(MONTHS)) {
    const match = norm.match(new RegExp('(\\d{1,2})\\s+de\\s+' + monthName + '\\b'));
    if (match) return validReference ? calendarDate(validReference.getFullYear(), monthIdx, Number(match[1])) : null;
  }
  if (!validReference) return null;

  let offset: number | null = null;
  if (/depois\s+de\s+amanha/.test(norm)) offset = 2;
  else if (/\bamanha\b/.test(norm)) offset = 1;
  else if (/\bhoje\b/.test(norm)) offset = 0;
  else if (/\bpro?xima\s+semana\b/.test(norm)) offset = 7;
  if (offset !== null) {
    const result = new Date(validReference);
    result.setDate(result.getDate() + offset);
    result.setHours(23, 59, 0, 0);
    return result;
  }

  for (const [name, weekday] of Object.entries(WEEKDAYS)) {
    if (new RegExp('\\b' + name + '\\b').test(norm)) return nextOccurrenceOfWeekday(weekday, validReference);
  }

  const diaMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
  if (diaMatch) {
    const result = calendarDate(validReference.getFullYear(), validReference.getMonth(), Number(diaMatch[1]));
    if (!result) return null;
    if (result < validReference) {
      const nextMonth = new Date(validReference.getFullYear(), validReference.getMonth() + 1, 1);
      return calendarDate(nextMonth.getFullYear(), nextMonth.getMonth(), Number(diaMatch[1]));
    }
    return result;
  }
  return null;
}

// ---- Extração de tarefas ----

interface ExtractedTaskData {
  title: string;
  description: string;
  dueDate: Date | null;
}

/** Tenta criar um título curto e legível a partir da frase. */
function buildTitle(sentence: string): string {
  const clean = sentence.replace(/\s+/g, ' ').trim();
  // Remove frases de contexto genéricas do início
  const stripped = clean
    .replace(/^(pessoal|turma|gente|galera|atenção|atenção turma|lembrete)[,!:]?\s*/i, '')
    .replace(/^(não esqueçam?|lembrem|lembra)[^:]*:\s*/i, '');
  const result = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  return result.length > 80 ? result.slice(0, 77) + '...' : result;
}

/**
 * Analisa o texto de um aviso e extrai tarefas implícitas.
 * Retorna array de tarefas encontradas (vazio se nenhuma detectada).
 */
/** Padrões que indicam frases de consequência/condição, não tarefas reais. */
const EXCLUSION_PATTERNS = [
  /^quem\s+(n[aã]o\s+)?/i,        // "Quem não entregar..."
  /^se\s+(n[aã]o\s+)?/i,           // "Se não fizer..."
  /^caso\s+/i,                      // "Caso não..."
  /perde\s+(nota|ponto)/i,          // "...perde nota"
  /ser[aá]\s+descontado/i,
  /ficar[aá]\s+sem\s+nota/i,
];

export function extractTasksFromAnnouncementText(text: string, reference: Date | null = new Date()): ExtractedTaskData[] {
  // Quebra em frases por pontuação ou quebras de linha
  const sentences = text
    .split(/(?<=[.!?\n])\s+|[\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15); // mínimo 15 chars para evitar fragmentos

  const results: ExtractedTaskData[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const hasTask = TASK_PATTERNS.some((re) => re.test(sentence));
    if (!hasTask) continue;

    // Ignora frases de consequência, não são tarefas
    const isExclusion = EXCLUSION_PATTERNS.some((re) => re.test(sentence));
    if (isExclusion) continue;

    // Tenta achar data na própria frase, depois no texto completo
    const dueDate = parseDateFromText(sentence, reference) ?? parseDateFromText(text, reference);

    const title = buildTitle(sentence);
    // Deduplicar por título similar
    const titleKey = normalize(title).slice(0, 30);
    if (seen.has(titleKey)) continue;
    seen.add(titleKey);

    results.push({ title, description: sentence, dueDate });

    if (results.length >= 2) break; // Max 2 tarefas por aviso
  }

  return results;
}

/** Converte tarefas extraídas de anúncios em NormalizedTask para exibição no dashboard. */
export function buildTasksFromAnnouncement(
  announcement: NormalizedAnnouncement,
  course: CourseInfo,
): NormalizedTask[] {
  const extracted = extractTasksFromAnnouncementText(announcement.text, announcement.creationTime);
  return extracted.map((item, index) => ({
    id: `extracted-${announcement.id}-${index}`,
    type: 'tarefa',
    title: item.title,
    description: item.description,
    courseId: course.id,
    courseName: course.name,
    teacherName: announcement.teacherName,
    dueDate: item.dueDate,
    alternateLink: announcement.alternateLink,
    materials: announcement.materials,
    status: !item.dueDate ? 'sem_data' : item.dueDate < new Date() ? 'atrasado' : 'pendente',
    urgency: getUrgencyLevel(item.dueDate),
    daysRemaining: getDaysRemaining(item.dueDate),
    creationTime: announcement.creationTime,
    fromAnnouncement: true,
    announcementId: announcement.id,
  }));
}

/** Processa uma lista de anúncios e retorna todas as tarefas extraídas. */
export function extractAllTasksFromAnnouncements(
  announcements: NormalizedAnnouncement[],
  courses: CourseInfo[],
): NormalizedTask[] {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const result: NormalizedTask[] = [];

  for (const announcement of announcements) {
    const course = courseMap.get(announcement.courseId);
    if (!course) continue;
    result.push(...buildTasksFromAnnouncement(announcement, course));
  }

  return result;
}
