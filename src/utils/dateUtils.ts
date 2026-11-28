import type { RawDueDate, RawTimeOfDay, UrgencyLevel } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Classroom supplies both date and time in UTC. Missing protobuf clock fields mean zero. */
export function buildDueDate(dueDate?: RawDueDate, dueTime?: RawTimeOfDay): Date | null {
  if (!dueDate || dueDate.year == null || dueDate.month == null || dueDate.day == null) {
    return null;
  }
  const { year, month, day } = dueDate;
  const hours = dueTime ? (dueTime.hours ?? 0) : 23;
  const minutes = dueTime ? (dueTime.minutes ?? 0) : 59;
  if (![year, month, day, hours, minutes].every(Number.isInteger)
    || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31
    || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new RangeError('Data ou horário de entrega inválido.');
  }
  // setUTCFullYear avoids Date.UTC's special interpretation of years 0..99.
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, day);
  result.setUTCHours(hours, minutes, 0, 0);
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) {
    throw new RangeError('Data de entrega inexistente no calendário.');
  }
  return result;
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
export function isWithinNextWeek(date: Date | null, now = new Date()): boolean {
  const days = getDaysRemaining(date, now);
  return date !== null && date >= now && days !== null && days <= 7;
}

/** Calcula o nível de urgência com base na data de entrega. */
export function getUrgencyLevel(dueDate: Date | null, now = new Date()): UrgencyLevel {
  if (!dueDate || !Number.isFinite(dueDate.getTime())) return 'none';
  if (dueDate < now) return 'overdue';
  const diffDays = getDaysRemaining(dueDate, now);
  if (diffDays === 0) return 'today';
  if (diffDays !== null && diffDays <= 3) return 'soon';
  return 'upcoming';
}

/** Retorna o número de dias restantes até a entrega (negativo se atrasado), ou null se sem data. */
export function getDaysRemaining(dueDate: Date | null, now = new Date()): number | null {
  if (!dueDate || !Number.isFinite(dueDate.getTime())) return null;
  // Compare calendar days, not 24-hour durations (which vary across DST changes).
  const startOfToday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.round((startOfDue - startOfToday) / MS_PER_DAY);
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
