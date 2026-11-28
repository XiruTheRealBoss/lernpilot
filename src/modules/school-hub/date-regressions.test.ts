import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDueDate, getDaysRemaining, getUrgencyLevel } from '../../utils/dateUtils';
import { buildTasksFromAnnouncement, parseDateFromText } from '../../utils/announcementParser';
import { normalizeCourseWork, resolveSubmissionStatus } from '../../utils/taskUtils';
import type { NormalizedAnnouncement } from '../../types';

afterEach(() => vi.useRealTimers());

describe('Classroom UTC deadlines', () => {
  it('uses UTC rather than browser local time', () => {
    expect(buildDueDate({ year: 2026, month: 11, day: 25 }, { hours: 15, minutes: 30 })?.toISOString())
      .toBe('2026-11-25T15:30:00.000Z');
  });

  it('uses 23:59 UTC only when dueTime is entirely absent', () => {
    expect(buildDueDate({ year: 2026, month: 11, day: 25 })?.toISOString())
      .toBe('2026-11-25T23:59:00.000Z');
    expect(buildDueDate({ year: 2026, month: 11, day: 25 }, {})?.toISOString())
      .toBe('2026-11-25T00:00:00.000Z');
    expect(buildDueDate({ year: 2026, month: 11, day: 25 }, { minutes: 15 })?.toISOString())
      .toBe('2026-11-25T00:15:00.000Z');
  });

  it.each([
    { year: 2026, month: 2, day: 31 },
    { year: 2026, month: 2, day: 29 },
    { year: 2026, month: 13, day: 1 },
    { year: 2026, month: 1, day: 0 },
    { year: Number.NaN, month: 1, day: 1 },
  ])('rejects invalid calendar components %j', (date) => {
    expect(() => buildDueDate(date)).toThrow(RangeError);
  });

  it('accepts leap day and rejects an invalid clock', () => {
    expect(buildDueDate({ year: 2028, month: 2, day: 29 })?.getUTCDate()).toBe(29);
    expect(() => buildDueDate({ year: 2026, month: 1, day: 1 }, { hours: 24 })).toThrow(RangeError);
    expect(() => buildDueDate({ year: 2026, month: 1, day: 1 }, { minutes: -1 })).toThrow(RangeError);
    expect(buildDueDate()).toBeNull();
  });
});

describe('deadline state', () => {
  it('distinguishes a later deadline today from an elapsed deadline today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 12));
    expect(getUrgencyLevel(new Date(2026, 10, 25, 23, 59))).toBe('today');
    expect(getUrgencyLevel(new Date(2026, 10, 25, 11))).toBe('overdue');
    expect(getUrgencyLevel(new Date(2026, 10, 26, 0))).toBe('soon');
    expect(getDaysRemaining(new Date(2026, 10, 26, 0))).toBe(1);
  });

  it('retains submitted state without a deadline', () => {
    expect(resolveSubmissionStatus({ state: 'TURNED_IN' }, null)).toBe('entregue');
    expect(resolveSubmissionStatus({ state: 'RETURNED' }, null)).toBe('entregue');
    expect(resolveSubmissionStatus(undefined, null)).toBe('sem_data');
  });

  it('includes the course in external identifiers', () => {
    const raw = { id: 'same-task', title: 'Synthetic task' };
    expect(normalizeCourseWork(raw, { id: 'course-a', name: 'A' }, 'Demo').id)
      .not.toBe(normalizeCourseWork(raw, { id: 'course-b', name: 'B' }, 'Demo').id);
  });
});

describe('announcement dates', () => {
  it.each(['31/02/2026', '29/02/2026', '32/01/2026', '10/13/2026', '31 de fevereiro', 'dia 0'])( 'does not silently roll invalid date %s into another month', (text) => {
      expect(parseDateFromText(text, new Date(2026, 0, 1))).toBeNull();
    });

  it('accepts a valid leap day', () => {
    const date = parseDateFromText('entregar 29/02/2028', new Date(2026, 0, 1));
    expect(date?.getFullYear()).toBe(2028);
    expect(date?.getMonth()).toBe(1);
    expect(date?.getDate()).toBe(29);
  });

  it('resolves tomorrow from publication time, not refresh time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 12));
    const announcement: NormalizedAnnouncement = {
      id: 'synthetic', type: 'anuncio', text: 'Resolver os exercícios para amanhã.',
      courseId: 'a', courseName: 'Demo', teacherName: 'Demo',
      creationTime: new Date(2026, 10, 20, 12), alternateLink: '#', materials: [], highlighted: false,
    };
    const tasks = buildTasksFromAnnouncement(announcement, { id: 'a', name: 'Demo' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].dueDate?.getDate()).toBe(21);
    expect(tasks[0].status).toBe('atrasado');
  });

  it('does not guess relative dates when publication time is unknown', () => {
    const announcement: NormalizedAnnouncement = {
      id: 'synthetic', type: 'anuncio', text: 'Resolver os exercícios para amanhã.',
      courseId: 'a', courseName: 'Demo', teacherName: 'Demo',
      creationTime: null, alternateLink: '#', materials: [], highlighted: false,
    };
    expect(buildTasksFromAnnouncement(announcement, { id: 'a', name: 'Demo' })[0].dueDate).toBeNull();
  });
});
