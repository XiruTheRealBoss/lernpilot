import { z } from 'zod';

/** Local test accounts only. No school addresses or real student data. */
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254)
    .refine(value => value.endsWith('.test'), 'Use a fictional .test address.'),
  password: z.string().min(12).max(128),
}).strict();

export const uuidSchema = z.string().uuid();
const instantSchema = z.string().datetime({ offset: true })
  .refine(value => Number.isFinite(Date.parse(value)), 'Invalid timestamp.');
const taskFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000),
  dueAt: instantSchema.nullable(),
  completedAt: instantSchema.nullable(),
  subjectId: uuidSchema.nullable(),
  periodId: uuidSchema.nullable(),
};
export const createTaskSchema = z.object(taskFields).strict().partial({
  description: true, dueAt: true, completedAt: true, subjectId: true, periodId: true,
});
export const updateTaskSchema = z.object(taskFields).strict().partial()
  .refine(value => Object.keys(value).length > 0, 'At least one field is required.');
export const taskListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  after: uuidSchema.optional(),
}).strict();

export type Credentials = z.infer<typeof credentialsSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export interface AuthUser { id: string; email: string }
export interface TaskDto {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  completedAt: string | null;
  subjectId: string | null;
  periodId: string | null;
  source: 'manual';
  createdAt: string;
  updatedAt: string;
}
export interface ApiErrorBody { error: { code: string; message: string; requestId: string } }
export interface ApiSuccess<T> { data: T }
