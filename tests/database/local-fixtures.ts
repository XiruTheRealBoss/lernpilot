import { randomBytes, randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type LocalDatabaseConfig = { url: string; publicKey: string; serviceKey: string };
export type TestAccount = {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  expiresAt: number;
  client: SupabaseClient;
};

export function localDatabaseConfig(): LocalDatabaseConfig {
  if (process.env.LERNPILOT_DATABASE_TESTS !== 'local-fixtures-only') {
    throw new Error('Database tests blocked: explicitly select the disposable local fixture project.');
  }
  const rawUrl = process.env.SUPABASE_URL;
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl || !publicKey || !serviceKey) {
    throw new Error('Database tests blocked: local Supabase URL/public key/fixture service key missing.');
  }
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '54321'
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Database tests blocked: only http://127.0.0.1:54321 is permitted.');
  }
  // Public keys must never silently be replaced with the privileged fixture key.
  if (publicKey === serviceKey || publicKey.startsWith('sb_secret_')) {
    throw new Error('Database tests blocked: the regular client requires a nonprivileged public key.');
  }
  if (publicKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString()) as { role?: string };
      if (payload.role !== 'anon') throw new Error('Unexpected role.');
    } catch {
      throw new Error('Database tests blocked: expected an anon/public key.');
    }
  }
  return { url: url.origin, publicKey, serviceKey };
}

// No persistent credentials, automatic refresh, external redirects or user data logs.
export function databaseClient(config: LocalDatabaseConfig, token?: string): SupabaseClient {
  return createClient(config.url, config.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: (input, init) => fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(10_000) }),
    },
  });
}

export function fixtureAdmin(config: LocalDatabaseConfig): SupabaseClient {
  return createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(10_000) }) },
  });
}

export async function createTestAccount(config: LocalDatabaseConfig, label: string): Promise<TestAccount> {
  const admin = fixtureAdmin(config);
  const email = `lernpilot-${label}-${randomUUID()}@example.test`;
  const password = randomBytes(32).toString('base64url');
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Local Auth fixture setup failed.');
  const id = created.data.user.id;
  try {
    const auth = databaseClient(config);
    const result = await auth.auth.signInWithPassword({ email, password });
    const session = result.data.session;
    if (result.error || !session?.access_token || !session.expires_at) throw new Error('Local Auth fixture login failed.');
    return { id, email, password, accessToken: session.access_token, expiresAt: session.expires_at,
      client: databaseClient(config, session.access_token) };
  } catch {
    await admin.auth.admin.deleteUser(id);
    throw new Error('Local Auth fixture login failed; fixture cleanup attempted.');
  }
}

export async function deleteTestAccount(config: LocalDatabaseConfig, account: TestAccount): Promise<void> {
  const admin = fixtureAdmin(config);
  const result = await admin.auth.admin.deleteUser(account.id);
  if (result.error) throw new Error('Local fixture cleanup failed; remove the synthetic fixture account locally.');
}

// Privileged *cleanup verification*, deliberately separated from authorization
// tests. Empty user-visible results would not prove physical row deletion.
export async function verifyFixtureRemoval(config: LocalDatabaseConfig, ownerId: string): Promise<void> {
  const admin = fixtureAdmin(config);
  for (const table of ['profiles', 'subjects', 'school_periods', 'grade_entries', 'tasks', 'calendar_events', 'exams', 'user_settings']) {
    const key = table === 'profiles' ? 'id' : 'owner_id';
    const result = await admin.from(table).select(key, { count: 'exact', head: true }).eq(key, ownerId);
    if (result.error || result.count !== 0) throw new Error(`Fixture cleanup verification failed for ${table}.`);
  }
}
