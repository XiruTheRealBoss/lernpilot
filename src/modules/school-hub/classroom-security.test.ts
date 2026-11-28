import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fetchAnnouncements, fetchCourses, fetchCourseWork, fetchStudentSubmission, fetchUserProfile } from '../../services/classroomApi';
import { useClassroom } from '../../hooks/useClassroom';

afterEach(() => vi.unstubAllGlobals());

describe('disabled live Classroom adapter', () => {
  it('rejects every retained API entry without making a network request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    for (const operation of [
      () => fetchCourses('synthetic-token'),
      () => fetchCourseWork('synthetic-course', 'synthetic-token'),
      () => fetchAnnouncements('synthetic-course', 'synthetic-token'),
      () => fetchStudentSubmission('synthetic-course', 'synthetic-task', 'synthetic-token'),
      () => fetchUserProfile('synthetic-profile', 'synthetic-token'),
    ]) {
      await expect(operation()).rejects.toThrow();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never hydrates the old unscoped cache even if a token is provided', async () => {
    const readStorage = vi.fn(() => { throw new Error('Legacy cache must not be read'); });
    vi.stubGlobal('localStorage', { getItem: readStorage });
    const { result } = renderHook(() => useClassroom('synthetic-token'));
    expect(result.current.disabled).toBe(true);
    expect(result.current.tasks).toEqual([]);
    expect(readStorage).not.toHaveBeenCalled();
    await expect(result.current.refresh()).rejects.toThrow();
  });
});
