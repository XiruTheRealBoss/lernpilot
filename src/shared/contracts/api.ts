import { z } from 'zod';
export * from './core.ts';
export type { AuthUser as UserDto } from './core.ts';

export const userSchema = z.object({ id: z.string().uuid(), email: z.string().email() }).strict();
export const taskSchema = z.object({
  id: z.string().uuid(), title: z.string().min(1).max(200), description: z.string().max(4000),
  dueAt: z.string().datetime({ offset: true }).nullable(), completedAt: z.string().datetime({ offset: true }).nullable(),
  subjectId: z.string().uuid().nullable(), periodId: z.string().uuid().nullable(), source: z.literal('manual'),
  createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
}).strict();
export const csrfResponseSchema = z.object({ data: z.object({ csrfToken: z.string().length(43) }).strict() }).strict();
export const sessionResponseSchema = z.object({ data: z.object({ user: userSchema, csrfToken: z.string().length(43) }).strict() }).strict();
export const registrationResponseSchema = z.union([
  sessionResponseSchema,
  z.object({ data: z.object({ user: z.null(), requiresConfirmation: z.literal(true) }).strict() }).strict(),
]);
export const taskListResponseSchema = z.object({ data: z.object({ tasks: z.array(taskSchema).max(100) }).strict() }).strict();
export const taskResponseSchema = z.object({ data: z.object({ task: taskSchema }).strict() }).strict();
export const logoutResponseSchema = z.object({ data: z.object({ loggedOut: z.literal(true) }).strict() }).strict();
export const deleteTaskResponseSchema = z.object({ data: z.object({ deleted: z.literal(true) }).strict() }).strict();
export const errorResponseSchema = z.object({ error: z.object({
  code: z.string().max(80), message: z.string().max(500), requestId: z.string().uuid(),
}).strict() }).strict();
