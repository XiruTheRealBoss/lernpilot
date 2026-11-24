import { useCallback, useEffect, useState } from 'react';
import {
  ClassroomApiError,
  fetchAnnouncements,
  fetchCourses,
  fetchCourseWork,
  fetchStudentSubmission,
  fetchUserProfile,
} from '../services/classroomApi';
import { isWithinLastTwoWeeks } from '../utils/dateUtils';
import { buildDueDate } from '../utils/dateUtils';
import { normalizeAnnouncement, normalizeCourseWork } from '../utils/taskUtils';
import { extractAllTasksFromAnnouncements } from '../utils/announcementParser';
import type { CourseInfo, NormalizedAnnouncement, NormalizedTask } from '../types';

const CACHE_KEY = 'lernpilot_cache';

interface ClassroomCache {
  tasks: NormalizedTask[];
  announcements: NormalizedAnnouncement[];
  courses: CourseInfo[];
  fetchedAt: string;
}

interface UseClassroomResult {
  tasks: NormalizedTask[];
  announcements: NormalizedAnnouncement[];
  courses: CourseInfo[];
  loading: boolean;
  error: string | null;
  isSessionExpired: boolean;
  refresh: () => Promise<void>;
}

/** Reidrata datas (que viram strings após JSON.parse) ao carregar do cache. */
function reviveTasks(tasks: NormalizedTask[]): NormalizedTask[] {
  return tasks.map((task) => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    creationTime: task.creationTime ? new Date(task.creationTime) : null,
  }));
}

function reviveAnnouncements(announcements: NormalizedAnnouncement[]): NormalizedAnnouncement[] {
  return announcements.map((announcement) => ({
    ...announcement,
    creationTime: announcement.creationTime ? new Date(announcement.creationTime) : null,
  }));
}

function loadCache(): ClassroomCache | null {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ClassroomCache;
    return {
      ...parsed,
      tasks: reviveTasks(parsed.tasks),
      announcements: reviveAnnouncements(parsed.announcements),
    };
  } catch {
    return null;
  }
}

function saveCache(cache: ClassroomCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/** Hook principal: busca turmas, tarefas e anúncios das últimas 2 semanas e normaliza os dados. */
export function useClassroom(accessToken: string | null): UseClassroomResult {
  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [announcements, setAnnouncements] = useState<NormalizedAnnouncement[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setTasks(cached.tasks);
      setAnnouncements(cached.announcements);
      setCourses(cached.courses);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setIsSessionExpired(false);

    try {
      const rawCourses = await fetchCourses(accessToken);
      const courseInfos: CourseInfo[] = rawCourses
        .filter((course) => course.id && course.name)
        .map((course) => ({ id: course.id!, name: course.name!, section: course.section }));

      const teacherNameCache = new Map<string, string>();

      const resolveTeacherName = async (creatorUserId?: string): Promise<string> => {
        if (!creatorUserId) return 'Professor(a)';
        const cached = teacherNameCache.get(creatorUserId);
        if (cached) return cached;
        const profile = await fetchUserProfile(creatorUserId, accessToken);
        const name = profile?.name?.fullName ?? 'Professor(a)';
        teacherNameCache.set(creatorUserId, name);
        return name;
      };

      const allTasks: NormalizedTask[] = [];
      const allAnnouncements: NormalizedAnnouncement[] = [];

      for (const course of courseInfos) {
        const [courseWorkItems, announcementItems] = await Promise.all([
          fetchCourseWork(course.id, accessToken),
          fetchAnnouncements(course.id, accessToken),
        ]);

        for (const item of courseWorkItems) {
          const dueDate = buildDueDate(item.dueDate, item.dueTime);
          const creationDate = item.creationTime ? new Date(item.creationTime) : null;
          const relevant = isWithinLastTwoWeeks(dueDate) || isWithinLastTwoWeeks(creationDate) || (dueDate && dueDate > new Date());
          if (!relevant) continue;

          const teacherName = await resolveTeacherName(item.creatorUserId);
          const submission = item.id ? await fetchStudentSubmission(course.id, item.id, accessToken) : undefined;
          allTasks.push(normalizeCourseWork(item, course, teacherName, submission));
        }

        for (const item of announcementItems) {
          const creationDate = item.creationTime ? new Date(item.creationTime) : null;
          if (!isWithinLastTwoWeeks(creationDate)) continue;
          const teacherName = await resolveTeacherName(item.creatorUserId);
          allAnnouncements.push(normalizeAnnouncement(item, course, teacherName));
        }
      }

      const extractedTasks = extractAllTasksFromAnnouncements(allAnnouncements, courseInfos);
      const allTasksMerged = [...allTasks, ...extractedTasks];

      setTasks(allTasksMerged);
      setAnnouncements(allAnnouncements);
      setCourses(courseInfos);
      saveCache({ tasks: allTasksMerged, announcements: allAnnouncements, courses: courseInfos, fetchedAt: new Date().toISOString() });
    } catch (err) {
      if (err instanceof ClassroomApiError && err.status === 401) {
        setIsSessionExpired(true);
        setError(err.message);
      } else if (err instanceof ClassroomApiError) {
        setError(err.message);
      } else {
        setError('Não foi possível buscar suas tarefas. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      void refresh();
    }
  }, [accessToken, refresh]);

  return { tasks, announcements, courses, loading, error, isSessionExpired, refresh };
}
