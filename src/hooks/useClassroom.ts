import type { CourseInfo, NormalizedAnnouncement, NormalizedTask } from '../types';
import { assertExternalAccessAllowed } from '../infrastructure/runtime';

interface UseClassroomResult {
  tasks: NormalizedTask[];
  announcements: NormalizedAnnouncement[];
  courses: CourseInfo[];
  loading: boolean;
  error: string | null;
  isSessionExpired: boolean;
  disabled: true;
  refresh: () => Promise<void>;
}

/**
 * Phase 1 disables live Classroom and the former accountless cache.
 * Pure normalization functions and the guarded REST adapter remain available for
 * tests and a future server-side integration. No legacy browser data is loaded.
 */
export function useClassroom(accessToken: string | null): UseClassroomResult {
  void accessToken;
  return {
    tasks: [], announcements: [], courses: [], loading: false,
    error: 'Conexões externas desativadas nesta fase. Use os dados fictícios de demonstração.',
    isSessionExpired: false, disabled: true,
    refresh: async () => { assertExternalAccessAllowed(); },
  };
}
