import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApiServer } from '../../server/app.ts';
import { loadServerConfig } from '../../server/config.ts';
import { SupabaseGateway } from '../../server/supabase-gateway.ts';
import type { AuthUser, TaskDto } from '../../src/shared/contracts/core.ts';
import {
  createTestAccount, deleteTestAccount, fixtureAdmin, localDatabaseConfig,
  verifyFixtureRemoval, type LocalDatabaseConfig, type TestAccount,
} from './local-fixtures.ts';

const frontendOrigin = 'http://127.0.0.1:5174';
interface BrowserSession { cookie: string; csrf: string; user?: AuthUser }

// Cleanup is the only place that may use an administrative key. Registration
// can create an Auth row even when a later HTTP response/verification fails, so
// find precisely this run's unique synthetic address if its ID was not returned.
async function cleanupRegistration(config: LocalDatabaseConfig, email: string): Promise<void> {
  const admin = fixtureAdmin(config);
  for (let page = 1; page <= 100; page++) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw new Error('Synthetic API registration cleanup lookup failed.');
    const user = result.data.users.find((candidate) => candidate.email === email);
    if (user) {
      if ((await admin.auth.admin.deleteUser(user.id)).error) throw new Error('Synthetic API registration cleanup failed.');
      await verifyFixtureRemoval(config, user.id);
      return;
    }
    if (result.data.users.length < 100) return;
  }
  throw new Error('Synthetic API registration cleanup lookup exceeded its local fixture limit.');
}

// No fake gateway or mock DB: real local HTTP -> SDK Auth -> PostgREST -> RLS.
// Configuration is checked before starting even the HTTP server or creating users.
test('real local API -> Supabase -> database reference flow', { timeout: 180_000 }, async (t) => {
  const database = localDatabaseConfig();
  const gatewayConfig = loadServerConfig({
    SUPABASE_URL: database.url,
    SUPABASE_PUBLISHABLE_KEY: database.publicKey,
    LERNPILOT_FRONTEND_ORIGIN: frontendOrigin,
    LERNPILOT_API_PORT: '8787',
  });
  const gateway = new SupabaseGateway(gatewayConfig);
  let serverClockOffset = 0;
  let completedRealRefreshes = 0;
  const refreshWithSupabase = gateway.refresh.bind(gateway);
  // Observe completed real Auth refreshes without retaining or exposing tokens.
  // This delegates unchanged to the SDK-backed gateway; it is not an Auth mock.
  gateway.refresh = async (refreshToken) => {
    const refreshed = await refreshWithSupabase(refreshToken);
    completedRealRefreshes++;
    return refreshed;
  };
  const server = createApiServer({ gateway, frontendOrigin, now: () => Date.now() + serverClockOffset });
  const accounts: TestAccount[] = [];
  const registrationEmail = `lernpilot-api-register-${randomUUID()}@example.test`;
  let registrationAttempted = false;
  try {
    const a = await createTestAccount(database, 'api-a'); accounts.push(a);
    const b = await createTestAccount(database, 'api-b'); accounts.push(b);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;

    const request = (path: string, method = 'GET', session?: BrowserSession, body?: unknown,
      extraHeaders: Record<string, string> = {}) => fetch(`${base}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: {
        Origin: frontendOrigin,
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
        ...(session?.user ? { 'X-Lernpilot-User-Id': session.user.id } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    async function preSession(): Promise<BrowserSession> {
      const response = await request('/api/v1/auth/csrf');
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie');
      assert.ok(cookie);
      assert.ok(cookie.includes('HttpOnly; SameSite=Strict'));
      const result = await response.json() as { data: { csrfToken: string } };
      assert.ok(result.data.csrfToken);
      return { cookie: cookie.split(';')[0], csrf: result.data.csrfToken };
    }
    async function login(account: TestAccount): Promise<BrowserSession> {
      const before = await preSession();
      const response = await request('/api/v1/auth/login', 'POST', before,
        { email: account.email, password: account.password });
      assert.equal(response.status, 200);
      const result = await response.json() as { data: { user: AuthUser; csrfToken: string } };
      assert.equal(result.data.user.id, account.id);
      const cookie = response.headers.get('set-cookie');
      assert.ok(cookie);
      assert.ok(cookie.includes('HttpOnly; SameSite=Strict'));
      assert.ok(cookie.split(';')[0] !== before.cookie, 'Login must rotate its opaque cookie.');
      assert.ok(result.data.csrfToken !== before.csrf, 'Login must rotate its CSRF value.');
      assert.equal((await request('/api/v1/auth/me', 'GET', before)).status, 401);
      return { cookie: cookie.split(';')[0], csrf: result.data.csrfToken, user: result.data.user };
    }
    async function tasks(session: BrowserSession): Promise<TaskDto[]> {
      const response = await request('/api/v1/tasks', 'GET', session);
      assert.equal(response.status, 200);
      return (await response.json() as { data: { tasks: TaskDto[] } }).data.tasks;
    }

    await t.test('anonymous protected reads require authentication', async () => {
      assert.equal((await request('/api/v1/tasks')).status, 401);
      assert.equal((await request('/api/v1/auth/me')).status, 401);
    });
    const sessionA = await login(a);
    const sessionB = await login(b);
    let aTaskId = '';
    let bTaskId = '';

    await t.test('authenticated task creation reaches the database with the ordinary owner identity', async () => {
      for (const [session, owner, title] of [
        [sessionA, a, 'Synthetic HTTP task A'], [sessionB, b, 'Synthetic HTTP task B'],
      ] as const) {
        const response = await request('/api/v1/tasks', 'POST', session,
          { title, description: 'Fictional local reference flow', dueAt: '2026-12-01T15:00:00Z' });
        assert.equal(response.status, 201);
        const result = await response.json() as { data: { task: TaskDto } };
        const task = result.data.task;
        assert.equal(task.title, title); assert.equal(task.source, 'manual');
        const row = await owner.client.from('tasks').select('id,owner_id,title').eq('id', task.id).single();
        assert.equal(row.error, null); assert.equal(row.data?.owner_id, owner.id);
        assert.equal(row.data?.title, title);
        if (owner.id === a.id) aTaskId = task.id; else bTaskId = task.id;
      }
      assert.ok(aTaskId && bTaskId);
    });

    await t.test('A/B lists and foreign update/delete attempts preserve account isolation', async () => {
      assert.ok(aTaskId && bTaskId, 'Creation must succeed before the cross-account checks.');
      assert.deepEqual((await tasks(sessionA)).map((task) => task.id), [aTaskId]);
      assert.deepEqual((await tasks(sessionB)).map((task) => task.id), [bTaskId]);
      assert.equal((await request(`/api/v1/tasks/${aTaskId}`, 'PATCH', sessionB, { title: 'Forbidden B change' })).status, 404);
      assert.equal((await request(`/api/v1/tasks/${aTaskId}`, 'DELETE', sessionB)).status, 404);
      const unchanged = await a.client.from('tasks').select('title').eq('id', aTaskId).single();
      assert.equal(unchanged.error, null); assert.equal(unchanged.data?.title, 'Synthetic HTTP task A');
    });

    await t.test('stale tab identity gets 409 on reads, writes and logout without changing either account', async () => {
      const stale = { 'X-Lernpilot-User-Id': a.id };
      for (const [path, method, body] of [
        ['/api/v1/tasks', 'GET', undefined],
        ['/api/v1/tasks', 'POST', { title: 'Stale must not create' }],
        [`/api/v1/tasks/${bTaskId}`, 'PATCH', { title: 'Stale must not update' }],
        [`/api/v1/tasks/${bTaskId}`, 'DELETE', undefined],
        ['/api/v1/auth/logout', 'POST', undefined],
      ] as const) {
        const response = await request(path, method, sessionB, body, stale);
        assert.equal(response.status, 409);
        assert.equal((await response.json() as { error: { code: string } }).error.code, 'SESSION_CHANGED');
        assert.equal(response.headers.get('set-cookie'), null);
      }
      const wrongCsrf = await request('/api/v1/tasks', 'GET', { ...sessionB, csrf: sessionA.csrf });
      assert.equal(wrongCsrf.status, 409);
      assert.deepEqual((await tasks(sessionA)).map((task) => task.title), ['Synthetic HTTP task A']);
      assert.deepEqual((await tasks(sessionB)).map((task) => task.title), ['Synthetic HTTP task B']);
    });

    await t.test('real Auth refresh preserves the protected API and database identity', async () => {
      const before = completedRealRefreshes;
      try {
        // The dedicated local Auth configuration issues five-minute JWTs. Moving
        // only the API clock forward triggers its refresh branch immediately;
        // Auth and Postgres still validate real, correctly signed local tokens.
        // Five minutes remain below the local session's 30-minute idle limit.
        serverClockOffset = 300_000;
        const renewed = await request('/api/v1/auth/me', 'GET', sessionA);
        assert.equal(renewed.status, 200);
        const result = await renewed.json() as { data: { user: AuthUser } };
        assert.equal(result.data.user.id, a.id);
        assert.equal(completedRealRefreshes, before + 1, 'A real Supabase refresh must complete.');
      } finally {
        serverClockOffset = 0;
      }
      assert.deepEqual((await tasks(sessionA)).map((task) => task.id), [aTaskId]);
      assert.deepEqual((await tasks(sessionB)).map((task) => task.id), [bTaskId]);
    });

    await t.test('own update and delete are reflected in API and ordinary Data API reads', async () => {
      const changed = await request(`/api/v1/tasks/${aTaskId}`, 'PATCH', sessionA, { title: 'Updated synthetic A' });
      assert.equal(changed.status, 200);
      assert.equal((await changed.json() as { data: { task: TaskDto } }).data.task.title, 'Updated synthetic A');
      assert.equal((await a.client.from('tasks').select('title').eq('id', aTaskId).single()).data?.title, 'Updated synthetic A');
      assert.equal((await request(`/api/v1/tasks/${aTaskId}`, 'DELETE', sessionA)).status, 200);
      assert.deepEqual(await tasks(sessionA), []);
      const removed = await a.client.from('tasks').select('id').eq('id', aTaskId);
      assert.equal(removed.error, null); assert.deepEqual(removed.data, []);
      assert.equal((await tasks(sessionB)).length, 1);
    });

    await t.test('real Supabase logout rejects the old HttpOnly cookie while B remains signed in', async () => {
      assert.equal((await request('/api/v1/auth/logout', 'POST', sessionA)).status, 200);
      assert.equal((await request('/api/v1/auth/me', 'GET', sessionA)).status, 401);
      assert.equal((await request('/api/v1/tasks', 'GET', sessionA)).status, 401);
      assert.equal((await request('/api/v1/auth/me', 'GET', sessionB)).status, 200);
    });

    await t.test('fictional registration through the real API creates a protected usable local account', async () => {
      const before = await preSession();
      registrationAttempted = true;
      const response = await request('/api/v1/auth/register', 'POST', before,
        { email: registrationEmail, password: randomBytes(32).toString('base64url') });
      assert.equal(response.status, 201, 'The local synthetic configuration must disable email confirmations.');
      const result = await response.json() as { data: { user: AuthUser; csrfToken: string } };
      assert.equal(result.data.user.email, registrationEmail);
      const cookie = response.headers.get('set-cookie'); assert.ok(cookie);
      const registered = { user: result.data.user, csrf: result.data.csrfToken, cookie: cookie.split(';')[0] };
      assert.equal((await request('/api/v1/auth/me', 'GET', registered)).status, 200);
      assert.deepEqual(await tasks(registered), []);
      assert.equal((await request('/api/v1/auth/logout', 'POST', registered)).status, 200);
    });
  } finally {
    let closeServer = Promise.resolve();
    if (server.listening) {
      server.closeAllConnections();
      closeServer = new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    const cleanup = await Promise.allSettled([
      closeServer,
      ...accounts.map(async (account) => {
        await deleteTestAccount(database, account);
        await verifyFixtureRemoval(database, account.id);
      }),
      ...(registrationAttempted ? [cleanupRegistration(database, registrationEmail)] : []),
    ]);
    assert.ok(cleanup.every((result) => result.status === 'fulfilled'), 'A synthetic local API fixture requires cleanup.');
  }
});
