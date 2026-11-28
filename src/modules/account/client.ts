import { z } from 'zod';
import { userSchema as user, taskSchema as task, sessionResponseSchema } from '../../shared/contracts/api';

const session = sessionResponseSchema.shape.data;
export type AccountUser = z.infer<typeof user>;
export type AccountTask = z.infer<typeof task>;
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

let csrfToken: string | undefined;
async function request<T>(path: string, schema: z.ZodType<T>, method = 'GET', body?: unknown, expectedUserId?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12_000),
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(!csrfToken || path === '/auth/me' || path === '/auth/csrf' ? {} : { 'X-CSRF-Token': csrfToken }),
        ...(expectedUserId ? { 'X-Lernpilot-User-Id': expectedUserId } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, 'UNAVAILABLE', 'Servidor local indisponível. Verifique a infraestrutura de teste.');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = z.object({ error: z.object({ code: z.string() }) }).safeParse(payload);
    throw new ApiError(response.status, code.success ? code.data.error.code : 'REQUEST_FAILED',
      response.status === 401 || code.success && code.data.error.code === 'SESSION_CHANGED' ? 'Sessão alterada ou encerrada. Entre novamente.' :
        response.status === 429 ? 'Muitas tentativas. Aguarde antes de tentar novamente.' :
          response.status === 400 ? 'Confira os campos informados.' : 'Não foi possível concluir a solicitação.');
  }
  const parsed = z.object({ data: schema }).safeParse(payload);
  if (!parsed.success) throw new ApiError(502, 'INVALID_RESPONSE', 'Resposta inesperada do servidor local.');
  return parsed.data.data;
}

export const accountClient = {
  async csrf() { const result = await request('/auth/csrf', z.object({ csrfToken: z.string() })); csrfToken = result.csrfToken; },
  async me() { const result = await request('/auth/me', session); csrfToken = result.csrfToken; return result.user; },
  async authenticate(mode: 'login' | 'register', email: string, password: string) {
    await this.csrf();
    const result = await request(`/auth/${mode}`, z.union([
      session,
      z.object({ user: z.null(), requiresConfirmation: z.literal(true) }).strict(),
    ]), 'POST', { email, password });
    if ('requiresConfirmation' in result) throw new ApiError(409, 'CONFIRMATION_REQUIRED', 'Confirmação necessária. Verifique a configuração de e-mail do Supabase local.');
    csrfToken = result.csrfToken;
    return result.user;
  },
  async logout(expectedUserId: string) { await request('/auth/logout', z.object({ loggedOut: z.literal(true) }), 'POST', {}, expectedUserId); csrfToken = undefined; },
  async tasks(expectedUserId: string) { return (await request('/tasks', z.object({ tasks: z.array(task).max(100) }), 'GET', undefined, expectedUserId)).tasks; },
  async create(title: string, expectedUserId: string) { return (await request('/tasks', z.object({ task }), 'POST', { title }, expectedUserId)).task; },
  async complete(id: string, completedAt: string | null, expectedUserId: string) { return (await request(`/tasks/${id}`, z.object({ task }), 'PATCH', { completedAt }, expectedUserId)).task; },
  async remove(id: string, expectedUserId: string) { await request(`/tasks/${id}`, z.object({ deleted: z.literal(true) }), 'DELETE', undefined, expectedUserId); },
};
