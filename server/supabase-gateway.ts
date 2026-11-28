import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { AuthUser, Credentials, CreateTaskInput, UpdateTaskInput, TaskDto } from '../src/shared/contracts/core.ts';
import { taskSchema } from '../src/shared/contracts/api.ts';
import { ApiError, unavailable, unauthenticated } from './errors.ts';
import type { ServerConfig } from './config.ts';
import type { InfrastructureGateway, ProviderSession } from './types.ts';

function userDto(user: User): AuthUser {
  if (!user.email || user.is_anonymous || !user.email.endsWith('.test')) throw unauthenticated();
  return { id: user.id, email: user.email };
}

function providerDto(session: Session | null): ProviderSession {
  if (!session?.expires_at || !session.access_token || !session.refresh_token) throw unauthenticated();
  return { accessToken: session.access_token, refreshToken: session.refresh_token,
    expiresAt: session.expires_at * 1000, user: userDto(session.user) };
}

function databaseError(error: { code?: string } | null): never {
  switch (error?.code) {
    case '23503': case '23514': case '22007': case '22P02':
      throw new ApiError(400, 'INVALID_REFERENCE', 'Die Daten oder zugehörigen Einträge sind ungültig.');
    case '23505': throw new ApiError(409, 'CONFLICT', 'Dieser Eintrag besteht bereits.');
    case '42501': throw new ApiError(403, 'ACCESS_DENIED', 'Dieser Zugriff ist nicht erlaubt.');
    case 'PGRST301': case 'PGRST303': throw unauthenticated();
    default: throw unavailable();
  }
}

function taskDto(row: Record<string, unknown>): TaskDto {
  const result = taskSchema.safeParse({ id: row.id, title: row.title, description: row.description,
    dueAt: row.due_at, completedAt: row.completed_at, subjectId: row.subject_id, periodId: row.period_id,
    source: row.source, createdAt: row.created_at, updatedAt: row.updated_at });
  if (!result.success) throw unavailable();
  return result.data;
}

function taskColumns(input: CreateTaskInput | UpdateTaskInput): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  if (input.title !== undefined) output.title = input.title;
  if (input.description !== undefined) output.description = input.description;
  if (input.dueAt !== undefined) output.due_at = input.dueAt;
  if (input.completedAt !== undefined) output.completed_at = input.completedAt;
  if (input.subjectId !== undefined) output.subject_id = input.subjectId;
  if (input.periodId !== undefined) output.period_id = input.periodId;
  return output;
}

const columns = 'id,title,description,due_at,completed_at,subject_id,period_id,source,created_at,updated_at';

/** Fresh public-key clients; all ordinary DB calls carry the verified user's JWT. */
export class SupabaseGateway implements InfrastructureGateway {
  private readonly config: ServerConfig;

  constructor(config: ServerConfig) { this.config = config; }

  private client(accessToken?: string) {
    return createClient(this.config.supabaseUrl, this.config.supabasePublicKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        fetch: (input, init) => fetch(input, { ...init,
          redirect: 'error',
          signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(8_000)]) : AbortSignal.timeout(8_000),
        }),
      },
    });
  }

  async register(credentials: Credentials): Promise<ProviderSession | null> {
    const { data, error } = await this.client().auth.signUp(credentials);
    if (error) {
      if (!error.status || error.status >= 500) throw unavailable();
      throw new ApiError(400, 'REGISTRATION_FAILED', 'Das fiktive Testkonto konnte nicht angelegt werden.');
    }
    return data.session ? providerDto(data.session) : null;
  }

  async login(credentials: Credentials): Promise<ProviderSession> {
    const { data, error } = await this.client().auth.signInWithPassword(credentials);
    if (error) {
      if (!error.status || error.status >= 500) throw unavailable();
      throw new ApiError(401, 'LOGIN_FAILED', 'Anmeldung fehlgeschlagen. Bitte die Testdaten prüfen.');
    }
    return providerDto(data.session);
  }

  async refresh(refreshToken: string): Promise<ProviderSession> {
    const { data, error } = await this.client().auth.refreshSession({ refresh_token: refreshToken });
    if (error) {
      if (!error.status || error.status >= 500) throw unavailable();
      throw unauthenticated();
    }
    return providerDto(data.session);
  }

  async verify(accessToken: string): Promise<AuthUser> {
    const client = this.client(accessToken);
    const { data, error } = await client.auth.getUser(accessToken);
    if (error) {
      if (!error.status || error.status >= 500) throw unavailable();
      throw unauthenticated();
    }
    const user = userDto(data.user);
    // getUser validates JWT/user state; the profile's RLS also checks auth.sessions.
    // This rejects signed-out JWTs that are still cryptographically unexpired.
    const profile = await client.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (profile.error) databaseError(profile.error);
    if (!profile.data) throw unauthenticated();
    return user;
  }

  async logout(session: ProviderSession): Promise<void> {
    const client = this.client();
    const result = await client.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken });
    if (result.error) {
      throw new ApiError(503, 'LOGOUT_REVOCATION_UNCONFIRMED', 'Lokale Sitzung beendet. Der Widerruf bei der lokalen Anmeldung ist noch unbestätigt.');
    }
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new ApiError(503, 'LOGOUT_REVOCATION_UNCONFIRMED', 'Lokale Sitzung beendet. Der Widerruf bei der lokalen Anmeldung ist noch unbestätigt.');
  }

  async listTasks(session: ProviderSession, limit: number, after?: string): Promise<TaskDto[]> {
    let query = this.client(session.accessToken).from('tasks').select(columns)
      .eq('owner_id', session.user.id).order('id', { ascending: true }).limit(limit);
    if (after) query = query.gt('id', after);
    const { data, error } = await query;
    if (error) databaseError(error);
    return (data ?? []).map(row => taskDto(row));
  }

  async createTask(session: ProviderSession, input: CreateTaskInput): Promise<TaskDto> {
    const { data, error } = await this.client(session.accessToken).from('tasks').insert({
      ...taskColumns(input), owner_id: session.user.id, source: 'manual',
    }).select(columns).single();
    if (error) databaseError(error);
    if (!data) throw unavailable();
    return taskDto(data);
  }

  async updateTask(session: ProviderSession, id: string, input: UpdateTaskInput): Promise<TaskDto | null> {
    const { data, error } = await this.client(session.accessToken).from('tasks').update(taskColumns(input))
      .eq('id', id).eq('owner_id', session.user.id).select(columns).maybeSingle();
    if (error) databaseError(error);
    return data ? taskDto(data) : null;
  }

  async deleteTask(session: ProviderSession, id: string): Promise<boolean> {
    const { data, error } = await this.client(session.accessToken).from('tasks').delete()
      .eq('id', id).eq('owner_id', session.user.id).select('id');
    if (error) databaseError(error);
    return data?.length === 1;
  }
}
