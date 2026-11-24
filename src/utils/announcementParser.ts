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

/** Tenta extrair uma data do texto em pt-BR. Retorna null se nenhuma data for encontrada. */
export function parseDateFromText(text: string, reference = new Date()): Date | null {
  const norm = normalize(text);

  if (/depois\s+de\s+amanha/.test(norm)) {
    const d = new Date(reference);
    d.setDate(d.getDate() + 2);
    d.setHours(23, 59, 0, 0);
    return d;
  }
  if (/\bamanha\b/.test(norm)) {
    const d = new Date(reference);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    return d;
  }
  if (/\bhoje\b/.test(norm)) {
    const d = new Date(reference);
    d.setHours(23, 59, 0, 0);
    return d;
  }
  if (/\bpro?xima\s+semana\b/.test(norm)) {
    const d = new Date(reference);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d;
  }

  // Dia da semana (ex: "na sexta", "na quinta-feira")
  for (const [name, weekday] of Object.entries(WEEKDAYS)) {
    if (norm.includes(name)) {
      return nextOccurrenceOfWeekday(weekday, reference);
    }
  }

  // dd/mm ou dd/mm/yyyy
  const dmMatch = norm.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1]);
    const month = parseInt(dmMatch[2]) - 1;
    let year = dmMatch[3] ? parseInt(dmMatch[3]) : reference.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 23, 59, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // "dia X de mês" ou "X de mês"
  for (const [monthName, monthIdx] of Object.entries(MONTHS)) {
    const re = new RegExp(`(\\d{1,2})\\s+de\\s+${monthName}`);
    const match = norm.match(re);
    if (match) {
      const day = parseInt(match[1]);
      const d = new Date(reference.getFullYear(), monthIdx, day, 23, 59, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // "dia X" isolado
  const diaMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
  if (diaMatch) {
    const day = parseInt(diaMatch[1]);
    const d = new Date(reference.getFullYear(), reference.getMonth(), day, 23, 59, 0, 0);
    if (d < reference) d.setMonth(d.getMonth() + 1);
    if (!isNaN(d.getTime())) return d;
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

export function extractTasksFromAnnouncementText(text: string): ExtractedTaskData[] {
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
    const dueDate = parseDateFromText(sentence) ?? parseDateFromText(text);

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
  const extracted = extractTasksFromAnnouncementText(announcement.text);
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
    status: 'pendente',
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
