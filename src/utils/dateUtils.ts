import type { RawDueDate, RawTimeOfDay, UrgencyLevel } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Combina dueDate + dueTime da Classroom API em um Date local, ou null se ausente. */
export function buildDueDate(dueDate?: RawDueDate, dueTime?: RawTimeOfDay): Date | null {
  if (!dueDate || dueDate.year == null || dueDate.month == null || dueDate.day == null) {
    return null;
  }
  const hours = dueTime?.hours ?? 23;
  const minutes = dueTime?.minutes ?? 59;
  return new Date(dueDate.year, dueDate.month - 1, dueDate.day, hours, minutes, 0, 0);
}

/** Verifica se uma data está dentro dos últimos 14 dias (semana atual + semana passada). */
export function isInLastTwoWeeks(date: Date | null): boolean {
  if (!date) return false;
  const now = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(now.getDate() - 14);
  return date >= twoWeeksAgo && date <= now;
}

/** Verifica se uma data (string ISO ou Date) está dentro dos últimos 14 dias. */
export function isWithinLastTwoWeeks(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(now.getDate() - 14);
  return date >= twoWeeksAgo && date <= now;
}

/** Verifica se uma data de entrega está dentro dos próximos 7 dias (a partir de agora). */
export function isWithinNextWeek(date: Date | null): boolean {
  if (!date) return false;
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  return date >= now && date <= nextWeek;
}

/** Calcula o nível de urgência com base na data de entrega. */
export function getUrgencyLevel(dueDate: Date | null): UrgencyLevel {
  if (!dueDate) return 'none';
  const now = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / MS_PER_DAY);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'upcoming';
}

/** Retorna o número de dias restantes até a entrega (negativo se atrasado), ou null se sem data. */
export function getDaysRemaining(dueDate: Date | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.round((startOfDue.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

/** Formata o número de dias restantes em texto amigável (ex: "Hoje!", "3 dias", "Atrasado há 2 dias"). */
export function formatDaysRemaining(daysRemaining: number | null): string {
  if (daysRemaining === null) return 'Sem data';
  if (daysRemaining < 0) {
    const days = Math.abs(daysRemaining);
    return `Atrasado há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  if (daysRemaining === 0) return 'Hoje!';
  if (daysRemaining === 1) return 'Amanhã';
  return `${daysRemaining} dias`;
}

/** Formata uma data no padrão "Quinta, 19 jun · 23h59" em pt-BR. */
export function formatDueDate(date: Date | null): string {
  if (!date) return 'Sem data de entrega';
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday}, ${day} ${month}, ${hours}h${minutes}`;
}

/** Formata uma data curta no padrão "19/06" em pt-BR. */
export function formatShortDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

/** Retorna o nome do dia da semana em pt-BR (ex: "Quinta-feira"). */
export function getWeekdayName(date: Date): string {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}
