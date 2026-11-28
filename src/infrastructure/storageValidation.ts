const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 20_000;
const textList = (value: unknown) => Array.isArray(value) && value.length <= 5000 && value.every(text);
const fieldsOnly = (value: Record<string, unknown>, fields: string[]) => Object.keys(value).every((key) => fields.includes(key));

export function validDateInput(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, day);
  return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day;
}

function validTest(value: unknown): boolean {
  return record(value) && text(value.id) && text(value.subject) && !!value.subject.trim()
    && text(value.teacher) && validDateInput(value.date)
    && (value.sourceTaskId === undefined || text(value.sourceTaskId))
    && Array.isArray(value.topics) && value.topics.length <= 5000
    && value.topics.every((topic: unknown) => record(topic) && text(topic.text) && typeof topic.done === 'boolean');
}

/** Persisted JSON is untrusted: validate its shape before Zustand can merge it. */
export function validStoredState(name: string, value: unknown): boolean {
  if (!record(value)) return false;
  if (name === 'tasks') {
    if (!fieldsOnly(value, ['filters', 'completedIds', 'notes', 'viewMode', 'darkMode'])) return false;
    if ('filters' in value && (!record(value.filters) || !text(value.filters.courseId)
      || !text(value.filters.search) || !['todos', 'pendente', 'entregue', 'atrasado', 'sem_data'].includes(String(value.filters.status)))) return false;
    if ('completedIds' in value && !textList(value.completedIds)) return false;
    if ('notes' in value && (!record(value.notes) || !Object.values(value.notes).every(text))) return false;
    if ('viewMode' in value && !['lista', 'calendario'].includes(String(value.viewMode))) return false;
    if ('darkMode' in value && typeof value.darkMode !== 'boolean') return false;
    return true;
  }
  if (name === 'study') {
    if (!fieldsOnly(value, ['consent', 'teacherStyles', 'extraTeachers', 'tests'])) return false;
    if ('consent' in value && value.consent !== null && (!record(value.consent)
      || !['adulto', 'responsavel'].includes(String(value.consent.by)) || !text(value.consent.at))) return false;
    if ('extraTeachers' in value && !textList(value.extraTeachers)) return false;
    if ('tests' in value && (!Array.isArray(value.tests) || value.tests.length > 5000 || !value.tests.every(validTest))) return false;
    if ('teacherStyles' in value && (!record(value.teacherStyles) || !Object.values(value.teacherStyles).every((style) =>
      record(style) && ['questionTypes', 'typicalTopics', 'pointsPerSection', 'notes'].every((key) => text(style[key]))
      && ['', 'facil', 'media', 'dificil'].includes(String(style.difficulty))))) return false;
    return true;
  }
  return false;
}
