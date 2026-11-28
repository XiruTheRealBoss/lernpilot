import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { createApiServer } from '../../server/app.ts';
import { unavailable, unauthenticated } from '../../server/errors.ts';
import { loadServerConfig } from '../../server/config.ts';
import { csrfMatches } from '../../server/sessions.ts';
import type { InfrastructureGateway, ProviderSession } from '../../server/types.ts';
import type { CreateTaskInput, Credentials, TaskDto, UpdateTaskInput } from '../../src/shared/contracts/core.ts';

// These are real HTTP tests with a fake provider. They do NOT prove database/RLS isolation.
class FakeGateway implements InfrastructureGateway {
  readonly users = new Map<string, ProviderSession>();
  readonly tasks = new Map<string, TaskDto & { ownerId: string }>();
  readonly observed: ProviderSession[] = [];
  refreshCount = 0;
  offline = false;
  confirmationRequired = false;
  initialLifetime = 3600_000;
  time = Date.now();

  private issue(credentials: Credentials) {
    const session = { accessToken: `access-${randomUUID()}`, refreshToken: `refresh-${randomUUID()}`,
      expiresAt: this.time + this.initialLifetime, user: { id: randomUUID(), email: credentials.email } };
    this.users.set(session.accessToken, session);
    return session;
  }
  async register(credentials: Credentials) { return this.confirmationRequired ? null : this.issue(credentials); }
  async login(credentials: Credentials) { if (this.offline) throw unavailable(); return this.issue(credentials); }
  async refresh(refreshToken: string) {
    this.refreshCount++;
    const session = [...this.users.values()].find(item => item.refreshToken === refreshToken);
    if (!session) throw unauthenticated();
    const next = { ...session, accessToken: `access-${randomUUID()}`, refreshToken: `refresh-${randomUUID()}`, expiresAt: this.time + 3600_000 };
    this.users.delete(session.accessToken);
    this.users.set(next.accessToken, next);
    return next;
  }
  async verify(accessToken: string) {
    if (this.offline) throw unavailable();
    const session = this.users.get(accessToken);
    if (!session || session.expiresAt <= this.time) throw unauthenticated();
    return session.user;
  }
  async logout(session: ProviderSession) { this.users.delete(session.accessToken); }
  async listTasks(session: ProviderSession, limit: number, after?: string) {
    this.observed.push(session);
    return [...this.tasks.values()].filter(task => task.ownerId === session.user.id && (!after || task.id > after)).slice(0, limit).map(({ ownerId: _owner, ...task }) => task);
  }
  async createTask(session: ProviderSession, input: CreateTaskInput) {
    this.observed.push(session);
    const task: TaskDto = { id: randomUUID(), title: input.title, description: input.description ?? '',
      dueAt: input.dueAt ?? null, completedAt: input.completedAt ?? null, subjectId: input.subjectId ?? null,
      periodId: input.periodId ?? null, source: 'manual', createdAt: new Date(this.time).toISOString(), updatedAt: new Date(this.time).toISOString() };
    this.tasks.set(task.id, { ...task, ownerId: session.user.id });
    return task;
  }
  async updateTask(session: ProviderSession, id: string, input: UpdateTaskInput) {
    const existing = this.tasks.get(id);
    if (!existing || existing.ownerId !== session.user.id) return null;
    const { ownerId: _owner, ...task } = { ...existing, ...input };
    this.tasks.set(id, { ...task, ownerId: session.user.id });
    return task;
  }
  async deleteTask(session: ProviderSession, id: string) {
    if (this.tasks.get(id)?.ownerId !== session.user.id) return false;
    return this.tasks.delete(id);
  }
}

const origin = 'http://127.0.0.1:5173';
let gateway: FakeGateway;
let server: ReturnType<typeof createApiServer>;
let base: string;
let logs: unknown[];

beforeEach(async () => {
  gateway = new FakeGateway();
  logs = [];
  server = createApiServer({ gateway, frontendOrigin: origin, now: () => gateway.time, logger: entry => logs.push(entry) });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Testserver nicht erreichbar');
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

interface BrowserSession { cookie: string; csrf: string }
async function preSession(): Promise<BrowserSession> {
  const res = await fetch(`${base}/api/v1/auth/csrf`);
  const body = await res.json();
  return { cookie: res.headers.get('set-cookie')!.split(';')[0], csrf: body.data.csrfToken };
}
function request(path: string, method: string, session: BrowserSession, body?: unknown, extraHeaders: Record<string, string> = {}) {
  return fetch(`${base}${path}`, { method, headers: {
    Origin: origin, Cookie: session.cookie, 'X-CSRF-Token': session.csrf,
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extraHeaders,
  }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function login(email = 'learner@example.test') {
  const before = await preSession();
  const response = await request('/api/v1/auth/login', 'POST', before, { email, password: 'Synthetic-test-password-12' });
  expect(response.status).toBe(200);
  const result = await response.json();
  return { before, user: result.data.user, cookie: response.headers.get('set-cookie')!.split(';')[0], csrf: result.data.csrfToken };
}

describe('local HTTP authentication and task contract', () => {
  it('creates HttpOnly Strict cookies and keeps tokens/passwords out of responses', async () => {
    const before = await preSession();
    const response = await request('/api/v1/auth/register', 'POST', before, { email: 'new@example.test', password: 'Synthetic-test-password-12' });
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Strict');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.text();
    expect(body).not.toMatch(/accessToken|refreshToken|access-|refresh-|password/i);
  });

  it('rotates both cookie and CSRF token on login and rejects the old cookie', async () => {
    const current = await login();
    expect(current.cookie).not.toBe(current.before.cookie);
    expect(current.csrf).not.toBe(current.before.csrf);
    expect((await request('/api/v1/auth/me', 'GET', current.before)).status).toBe(401);
    expect((await request('/api/v1/auth/me', 'GET', current)).status).toBe(200);
  });

  it('requires authentication on protected reads', async () => {
    expect((await fetch(`${base}/api/v1/tasks`)).status).toBe(401);
  });

  it('binds task reads to the displayed account when another tab changes the cookie', async () => {
    const accountA = await login('a@example.test');
    const accountB = await login('b@example.test');
    const response = await request('/api/v1/tasks', 'GET', { cookie: accountB.cookie, csrf: accountA.csrf });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('SESSION_CHANGED');
    expect(gateway.observed).toHaveLength(0);
    expect((await request('/api/v1/auth/me', 'GET', accountB)).status).toBe(200);
  });

  it('rejects stale account identity on all protected task actions and logout before mutation', async () => {
    const accountA = await login('a@example.test');
    const accountB = await login('b@example.test');
    const created = await request('/api/v1/tasks', 'POST', accountB, { title: 'Aufgabe B' });
    const id = (await created.json()).data.task.id;
    const initial = JSON.stringify([...gateway.tasks.entries()]);
    const observedBefore = gateway.observed.length;
    const staleHeader = { 'X-Lernpilot-User-Id': accountA.user.id };
    for (const [path, method, body] of [
      ['/api/v1/tasks', 'GET', undefined],
      ['/api/v1/tasks', 'POST', { title: 'Nicht anlegen' }],
      [`/api/v1/tasks/${id}`, 'PATCH', { title: 'Nicht ändern' }],
      [`/api/v1/tasks/${id}`, 'DELETE', undefined],
      ['/api/v1/auth/logout', 'POST', undefined],
    ] as const) {
      const response = await request(path, method, accountB, body, staleHeader);
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe('SESSION_CHANGED');
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect(JSON.stringify([...gateway.tasks.entries()])).toBe(initial);
    expect(gateway.observed.length).toBe(observedBefore);
    expect((await request('/api/v1/auth/me', 'GET', accountB)).status).toBe(200);
    expect((await request('/api/v1/tasks', 'GET', accountB, undefined,
      { 'X-Lernpilot-User-Id': accountB.user.id })).status).toBe(200);
  });

  it('rejects malformed or duplicate expected-user headers', async () => {
    const account = await login();
    expect((await request('/api/v1/tasks', 'GET', account, undefined,
      { 'X-Lernpilot-User-Id': 'not-a-uuid' })).status).toBe(400);
    const status = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(`${base}/api/v1/tasks`, { headers: {
        Cookie: account.cookie, 'X-CSRF-Token': account.csrf,
        'X-Lernpilot-User-Id': [account.user.id, account.user.id],
      } }, res => { res.resume(); resolve(res.statusCode!); });
      req.on('error', reject); req.end();
    });
    expect(status).toBe(400);
    expect(gateway.observed).toHaveLength(0);
  });

  it('rejects foreign or missing Origin and forged CSRF on login', async () => {
    const session = await preSession();
    const input = { email: 'learner@example.test', password: 'Synthetic-test-password-12' };
    expect((await request('/api/v1/auth/login', 'POST', session, input, { Origin: 'https://evil.invalid' })).status).toBe(403);
    expect((await fetch(`${base}/api/v1/auth/login`, { method: 'POST' })).status).toBe(403);
    expect((await request('/api/v1/auth/login', 'POST', session, input, { 'X-CSRF-Token': 'x'.repeat(43) })).status).toBe(403);
  });

  it('rejects cross-site token minting and DNS rebinding hosts', async () => {
    expect((await fetch(`${base}/api/v1/auth/csrf`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    // Native fetch normalizes Host, so use an actual raw HTTP request here.
    const status = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(`${base}/api/v1/auth/csrf`, { headers: { Host: 'evil.invalid' } }, res => {
        res.resume(); resolve(res.statusCode!);
      });
      req.on('error', reject); req.end();
    });
    expect(status).toBe(403);
  });

  it('handles unicode and duplicate-cookie CSRF attempts without exceptions', async () => {
    expect(csrfMatches('a'.repeat(43), 'é'.repeat(43))).toBe(false);
    const current = await login();
    expect((await request('/api/v1/auth/me', 'GET', { ...current, cookie: `${current.cookie}; ${current.cookie}` })).status).toBe(401);
  });

  it('allows only fictional test addresses, bounded passwords and strict credential fields', async () => {
    const session = await preSession();
    for (const input of [
      { email: 'real@example.com', password: 'Synthetic-test-password-12' },
      { email: 'a@example.test', password: 'short' },
      { email: 'a@example.test', password: 'x'.repeat(129) },
      { email: 'a@example.test', password: 'Synthetic-test-password-12', role: 'admin' },
    ]) expect((await request('/api/v1/auth/register', 'POST', session, input)).status).toBe(400);
  });

  it('returns 202 for local email-confirmation configurations without exposing a session', async () => {
    gateway.confirmationRequired = true;
    const response = await request('/api/v1/auth/register', 'POST', await preSession(), { email: 'a@example.test', password: 'Synthetic-test-password-12' });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ data: { user: null, requiresConfirmation: true } });
  });

  it('creates, reads, updates and deletes a task with the verified identity', async () => {
    const session = await login();
    const created = await request('/api/v1/tasks', 'POST', session, { title: 'Fiktive Übung', dueAt: null });
    expect(created.status).toBe(201);
    const task = (await created.json()).data.task;
    expect(task.title).toBe('Fiktive Übung');
    const list = await request('/api/v1/tasks', 'GET', session);
    expect((await list.json()).data.tasks).toHaveLength(1);
    expect(gateway.observed.every(item => item.user.id === session.user.id)).toBe(true);
    expect((await request(`/api/v1/tasks/${task.id}`, 'PATCH', session, { completedAt: new Date().toISOString() })).status).toBe(200);
    expect((await request(`/api/v1/tasks/${task.id}`, 'DELETE', session)).status).toBe(200);
    expect(gateway.tasks.size).toBe(0);
  });

  it('does not accept client-selected owners, IDs, origins or empty updates', async () => {
    const session = await login();
    for (const input of [{ title: 'Test', ownerId: randomUUID() }, { title: 'Test', owner_id: randomUUID() },
      { title: 'Test', id: randomUUID() }, { title: 'Test', source: 'imported' }, { title: ' ' }, { title: 'x'.repeat(201) },
      { title: 'Test', description: 'x'.repeat(4001) }, { title: 'Test', dueAt: '2026-02-30T10:00:00Z' }]) {
      expect((await request('/api/v1/tasks', 'POST', session, input)).status).toBe(400);
    }
    expect((await request(`/api/v1/tasks/${randomUUID()}`, 'PATCH', session, {})).status).toBe(400);
  });

  it('rejects unknown, duplicate and unbounded list parameters', async () => {
    const session = await login();
    for (const query of ['?limit=101', '?limit=0', '?ownerId=other', '?limit=1&limit=2', '?after=bad']) {
      expect((await request(`/api/v1/tasks${query}`, 'GET', session)).status).toBe(400);
    }
  });

  it('gives the same 404 for absent and inaccessible task IDs (fake provider contract)', async () => {
    const session = await login();
    expect((await request(`/api/v1/tasks/${randomUUID()}`, 'PATCH', session, { title: 'Test' })).status).toBe(404);
    expect((await request(`/api/v1/tasks/${randomUUID()}`, 'DELETE', session)).status).toBe(404);
  });

  it('revokes logout locally and upstream, clears cookie, and rejects replay', async () => {
    const session = await login();
    const response = await request('/api/v1/auth/logout', 'POST', session);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(gateway.users.size).toBe(0);
    expect((await request('/api/v1/tasks', 'GET', session)).status).toBe(401);
  });

  it('fails closed after provider revocation', async () => {
    const session = await login();
    gateway.users.clear();
    expect((await request('/api/v1/auth/me', 'GET', session)).status).toBe(401);
    expect((await request('/api/v1/tasks', 'GET', session)).status).toBe(401);
  });

  it('destroys the local session even when upstream logout fails', async () => {
    const session = await login();
    gateway.logout = async () => { throw unavailable(); };
    const response = await request('/api/v1/auth/logout', 'POST', session);
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await request('/api/v1/auth/me', 'GET', session)).status).toBe(401);
  });

  it('clears an identity-bound session during an Auth verification outage before upstream logout', async () => {
    const session = await login();
    let unexpectedVerifications = 0;
    const originalVerify = gateway.verify.bind(gateway);
    gateway.verify = async () => { unexpectedVerifications++; throw unavailable(); };
    gateway.logout = async () => { throw unavailable(); };
    const response = await request('/api/v1/auth/logout', 'POST', session, undefined,
      { 'X-Lernpilot-User-Id': session.user.id });
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(unexpectedVerifications).toBe(0);
    // Recovery of Auth must not make the old local cookie valid again.
    gateway.verify = originalVerify;
    expect((await request('/api/v1/auth/me', 'GET', session)).status).toBe(401);
    expect((await request('/api/v1/tasks', 'GET', session)).status).toBe(401);
  });

  it('expires idle app sessions without automatically refreshing them', async () => {
    const session = await login();
    gateway.time += 30 * 60_000;
    expect((await request('/api/v1/auth/me', 'GET', session)).status).toBe(401);
    expect(gateway.refreshCount).toBe(0);
  });

  it('serializes concurrent provider refresh and keeps the user identity', async () => {
    gateway.initialLifetime = 30_000;
    const session = await login();
    const responses = await Promise.all([request('/api/v1/auth/me', 'GET', session), request('/api/v1/tasks', 'GET', session)]);
    expect(responses.map(item => item.status)).toEqual([200, 200]);
    expect(gateway.refreshCount).toBe(1);
  });

  it('handles JSON/content-type/size limits', async () => {
    const session = await login();
    expect((await request('/api/v1/tasks', 'POST', session, { title: 'x'.repeat(22_000) })).status).toBe(413);
    expect((await request('/api/v1/tasks', 'POST', session, { title: 'x' }, { 'Content-Type': 'text/plain' })).status).toBe(415);
    expect((await fetch(`${base}/api/v1/tasks`, { method: 'POST', headers: { Origin: origin, Cookie: session.cookie,
      'X-CSRF-Token': session.csrf, 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
  });

  it('returns a safe infrastructure error and minimal logs without request secrets', async () => {
    gateway.offline = true;
    const session = await preSession();
    const response = await request('/api/v1/auth/login', 'POST', session, { email: 'private@example.test', password: 'Synthetic-test-password-12' });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'INFRASTRUCTURE_UNAVAILABLE', requestId: expect.any(String) } });
    expect(JSON.stringify(logs)).not.toMatch(/private@example.test|Synthetic-test-password-12|accessToken|refreshToken/);
    expect(JSON.stringify(logs)).not.toContain(session.csrf);
    expect(JSON.stringify(logs)).not.toContain(session.cookie);
    for (const entry of logs) expect(Object.keys(entry as object).sort()).toEqual(['durationMs', 'requestId', 'route', 'status']);
  });

  it('limits authentication attempts even if credentials or pre-sessions vary', async () => {
    const session = await preSession();
    for (let index = 0; index < 10; index++) {
      expect((await request('/api/v1/auth/login', 'POST', session, { email: 'bad', password: 'short' })).status).toBe(400);
    }
    const limited = await request('/api/v1/auth/login', 'POST', session, { email: 'bad', password: 'short' });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
  });

  it('keeps legacy school handlers disabled', async () => {
    expect((await fetch(`${base}/api/login`)).status).toBe(410);
    expect((await fetch(`${base}/api/boletim`)).status).toBe(410);
  });
});

describe('local configuration boundary', () => {
  it('rejects cloud origins, production, privileged keys and invalid ports', () => {
    const env = { SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_test_only' };
    expect(loadServerConfig(env).port).toBe(8787);
    for (const extra of [
      { SUPABASE_URL: 'https://cloud.supabase.co' }, { LERNPILOT_FRONTEND_ORIGIN: 'http://evil.invalid' },
      { NODE_ENV: 'production' }, { SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden' }, { LERNPILOT_API_PORT: '0' },
    ]) expect(() => loadServerConfig({ ...env, ...extra })).toThrow();
    const elevatedJwt = `e30.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
    expect(() => loadServerConfig({ SUPABASE_PUBLISHABLE_KEY: elevatedJwt })).toThrow();
  });
});
