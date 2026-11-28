import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { createTestAccount, databaseClient, deleteTestAccount, localDatabaseConfig, verifyFixtureRemoval, type TestAccount } from './local-fixtures.ts';

// This suite intentionally fails, rather than skips, when the real local stack
// is unavailable. Run separately from offline unit tests; never against cloud.
test('real local Data API: eight tables, owner isolation and session enforcement', { timeout: 720_000 }, async (t) => {
  const config = localDatabaseConfig();
  const accounts: TestAccount[] = [];
  try {
    const a = await createTestAccount(config, 'rls-a'); accounts.push(a);
    const b = await createTestAccount(config, 'rls-b'); accounts.push(b);
    const anon = databaseClient(config);
    const aSubject = randomUUID(); const bSubject = randomUUID();
    const aPeriod = randomUUID(); const bPeriod = randomUUID();
    for (const [account, subject, period] of [[a, aSubject, aPeriod], [b, bSubject, bPeriod]] as const) {
      assert.equal((await account.client.from('subjects').insert({ id: subject, owner_id: account.id, name: 'Synthetic Mathematics' })).error, null);
      assert.equal((await account.client.from('school_periods').insert({ id: period, owner_id: account.id, name: 'Synthetic 2026', starts_on: '2026-01-01', ends_on: '2026-12-31' })).error, null);
    }

    await t.test('private profile is provisioned and cannot be created/deleted/reowned by clients', async () => {
      const own = await a.client.from('profiles').select('id').eq('id', a.id);
      assert.equal(own.error, null); assert.equal(own.data?.length, 1);
      const other = await b.client.from('profiles').select('id').eq('id', a.id);
      assert.equal(other.error, null); assert.deepEqual(other.data, []);
      assert.equal((await a.client.from('profiles').update({ display_name: 'Synthetic A' }).eq('id', a.id)).error, null);
      assert.ok((await a.client.from('profiles').insert({ id: randomUUID() })).error);
      assert.ok((await a.client.from('profiles').delete().eq('id', a.id)).error);
      assert.ok((await a.client.from('profiles').update({ id: b.id }).eq('id', a.id)).error);
      assert.ok((await anon.from('profiles').select('*')).error);
      const foreignUpdate = await b.client.from('profiles').update({ display_name: 'Forbidden' }).eq('id', a.id).select('id');
      assert.equal(foreignUpdate.error, null); assert.deepEqual(foreignUpdate.data, []);
    });

    const samples: Array<{ table: string; key: 'id' | 'owner_id'; row: Record<string, unknown>; update: Record<string, unknown> }> = [
      { table: 'subjects', key: 'id', row: { id: randomUUID(), owner_id: a.id, name: 'Synthetic subject' }, update: { name: 'Changed synthetic subject' } },
      { table: 'school_periods', key: 'id', row: { id: randomUUID(), owner_id: a.id, name: 'Synthetic period', starts_on: '2026-01-01', ends_on: '2026-06-30' }, update: { name: 'Changed synthetic period' } },
      { table: 'grade_entries', key: 'id', row: { id: randomUUID(), owner_id: a.id, subject_id: aSubject, period_id: aPeriod, label: 'Practice only', value: 7, scale_min: 0, scale_max: 10, weight: 1, recorded_on: '2026-02-01', source: 'manual' }, update: { value: 8 } },
      { table: 'tasks', key: 'id', row: { id: randomUUID(), owner_id: a.id, subject_id: aSubject, period_id: aPeriod, title: 'Synthetic task', source: 'manual' }, update: { title: 'Changed synthetic task' } },
      { table: 'calendar_events', key: 'id', row: { id: randomUUID(), owner_id: a.id, subject_id: aSubject, title: 'Synthetic event', starts_at: '2026-02-01T14:00:00Z', ends_at: '2026-02-01T15:00:00Z', timezone: 'America/Sao_Paulo' }, update: { title: 'Changed synthetic event' } },
      { table: 'exams', key: 'id', row: { id: randomUUID(), owner_id: a.id, subject_id: aSubject, period_id: aPeriod, title: 'Synthetic exam', scheduled_on: '2026-02-01' }, update: { title: 'Changed synthetic exam' } },
      { table: 'user_settings', key: 'owner_id', row: { owner_id: a.id, locale: 'de-DE', timezone: 'UTC' }, update: { locale: 'pt-BR' } },
    ];

    for (const sample of samples) {
      await t.test(`${sample.table}: own CRUD, foreign CRUD denial, anonymous and ownership tampering`, async () => {
        const id = sample.row[sample.key];
        const inserted = await a.client.from(sample.table).insert(sample.row).select(sample.key);
        assert.equal(inserted.error, null); assert.equal(inserted.data?.length, 1);
        const ownRead = await a.client.from(sample.table).select('*').eq(sample.key, id);
        assert.equal(ownRead.error, null); assert.equal(ownRead.data?.length, 1);
        const foreignRead = await b.client.from(sample.table).select('*').eq(sample.key, id);
        assert.equal(foreignRead.error, null); assert.deepEqual(foreignRead.data, []);
        const foreignUpdate = await b.client.from(sample.table).update(sample.update).eq(sample.key, id).select(sample.key);
        assert.equal(foreignUpdate.error, null); assert.deepEqual(foreignUpdate.data, []);
        const foreignDelete = await b.client.from(sample.table).delete().eq(sample.key, id).select(sample.key);
        assert.equal(foreignDelete.error, null); assert.deepEqual(foreignDelete.data, []);
        assert.ok((await anon.from(sample.table).select('*')).error);
        assert.ok((await anon.from(sample.table).insert(sample.row)).error);
        assert.ok((await anon.from(sample.table).update(sample.update).eq(sample.key, id)).error);
        assert.ok((await anon.from(sample.table).delete().eq(sample.key, id)).error);
        const forged = { ...sample.row, owner_id: b.id, ...(sample.key === 'id' ? { id: randomUUID() } : {}) };
        assert.ok((await a.client.from(sample.table).insert(forged)).error);
        assert.ok((await a.client.from(sample.table).update({ owner_id: b.id }).eq(sample.key, id)).error);
        const ownUpdate = await a.client.from(sample.table).update(sample.update).eq(sample.key, id).select(sample.key);
        assert.equal(ownUpdate.error, null); assert.equal(ownUpdate.data?.length, 1);
        const ownDelete = await a.client.from(sample.table).delete().eq(sample.key, id).select(sample.key);
        assert.equal(ownDelete.error, null); assert.equal(ownDelete.data?.length, 1);
        assert.deepEqual((await a.client.from(sample.table).select(sample.key).eq(sample.key, id)).data, []);
      });
    }

    await t.test('owner-composite foreign keys reject another account’s subject and period', async () => {
      for (const [subject_id, period_id] of [[bSubject, aPeriod], [aSubject, bPeriod]]) {
        const result = await a.client.from('tasks').insert({ owner_id: a.id, title: 'Forbidden relationship', subject_id, period_id });
        assert.equal(result.error?.code, '23503');
      }
      for (const table of ['grade_entries', 'calendar_events', 'exams']) {
        const sample = samples.find((item) => item.table === table)!;
        assert.equal((await a.client.from(table).insert({ ...sample.row, id: randomUUID(), subject_id: bSubject })).error?.code, '23503');
        if (table !== 'calendar_events') {
          assert.equal((await a.client.from(table).insert({ ...sample.row, id: randomUUID(), period_id: bPeriod })).error?.code, '23503');
        }
      }
      for (const table of ['tasks', 'grade_entries', 'calendar_events', 'exams']) {
        const sample = samples.find((item) => item.table === table)!;
        const id = randomUUID();
        assert.equal((await a.client.from(table).insert({ ...sample.row, id })).error, null);
        assert.equal((await a.client.from(table).update({ subject_id: bSubject }).eq('id', id)).error?.code, '23503');
        if (table !== 'calendar_events') {
          assert.equal((await a.client.from(table).update({ period_id: bPeriod }).eq('id', id)).error?.code, '23503');
        }
        assert.equal((await a.client.from(table).delete().eq('id', id)).error, null);
      }
    });

    await t.test('constraints reject invalid periods, dates, grades, weights, timezones and sources', async () => {
      assert.equal((await a.client.from('school_periods').insert({ owner_id: a.id, name: 'Invalid', starts_on: '2026-06-01', ends_on: '2026-01-01' })).error?.code, '23514');
      const grade = samples.find((item) => item.table === 'grade_entries')!.row;
      for (const invalid of [{ value: 11 }, { scale_min: 10, scale_max: 0 }, { weight: 0 }, { source: 'official' },
        { value: 'NaN' }, { scale_min: 'NaN' }, { scale_max: 'NaN' }, { value: 'NaN', scale_max: 'NaN' }]) {
        assert.equal((await a.client.from('grade_entries').insert({ ...grade, id: randomUUID(), ...invalid })).error?.code, '23514');
      }
      assert.ok((await a.client.from('exams').insert({ owner_id: a.id, title: 'Invalid date', scheduled_on: '2026-02-30' })).error);
      assert.equal((await a.client.from('tasks').insert({ owner_id: a.id, title: 'Invalid source', source: 'classroom' })).error?.code, '23514');
      assert.equal((await a.client.from('user_settings').insert({ owner_id: a.id, timezone: 'Invented/Zone' })).error?.code, '23514');
      const event = samples.find((item) => item.table === 'calendar_events')!.row;
      assert.equal((await a.client.from('calendar_events').insert({ ...event, id: randomUUID(), ends_at: event.starts_at })).error?.code, '23514');
    });

    await t.test('infinite PostgreSQL dates and timestamps cannot poison API responses', async () => {
      const task = samples.find((item) => item.table === 'tasks')!.row;
      const grade = samples.find((item) => item.table === 'grade_entries')!.row;
      const exam = samples.find((item) => item.table === 'exams')!.row;
      const event = samples.find((item) => item.table === 'calendar_events')!.row;
      for (const infinity of ['infinity', '-infinity']) {
        for (const field of ['due_at', 'completed_at', 'created_at']) {
          assert.equal((await a.client.from('tasks').insert({ ...task, id: randomUUID(), [field]: infinity })).error?.code, '23514');
        }
        assert.equal((await a.client.from('grade_entries').insert({ ...grade, id: randomUUID(), recorded_on: infinity })).error?.code, '23514');
        assert.equal((await a.client.from('exams').insert({ ...exam, id: randomUUID(), scheduled_on: infinity })).error?.code, '23514');
        assert.equal((await a.client.from('school_periods').insert({ owner_id: a.id, name: 'Invalid infinity', starts_on: '-infinity', ends_on: infinity })).error?.code, '23514');
        for (const field of ['starts_at', 'ends_at']) {
          assert.equal((await a.client.from('calendar_events').insert({ ...event, id: randomUUID(), [field]: infinity })).error?.code, '23514');
        }
      }
    });

    await t.test('referenced subject and period cannot silently orphan a task', async () => {
      const task = await a.client.from('tasks').insert({ owner_id: a.id, title: 'Parent reference', subject_id: aSubject, period_id: aPeriod }).select('id').single();
      assert.equal(task.error, null);
      assert.equal((await a.client.from('subjects').delete().eq('id', aSubject)).error?.code, '23503');
      assert.equal((await a.client.from('school_periods').delete().eq('id', aPeriod)).error?.code, '23503');
      assert.equal((await a.client.from('tasks').delete().eq('id', task.data!.id)).error, null);
    });

    await t.test('invalid JWT is rejected without a privileged data client', async () => {
      const invalid = databaseClient(config, 'invalid.test.token');
      assert.ok((await invalid.from('tasks').select('id')).error);
    });

    await t.test('logout revokes direct Data API access even before JWT expiry', async () => {
      const c = await createTestAccount(config, 'revoked'); accounts.push(c);
      const id = randomUUID();
      assert.equal((await c.client.from('tasks').insert({ id, owner_id: c.id, title: 'Revocation fixture' })).error, null);
      const authClient = databaseClient(config);
      const login = await authClient.auth.signInWithPassword({ email: c.email, password: c.password });
      assert.equal(login.error, null);
      const logout = await authClient.auth.signOut({ scope: 'global' });
      assert.equal(logout.error, null);
      const read = await c.client.from('tasks').select('id').eq('id', id);
      assert.ok(read.error || read.data?.length === 0);
      assert.ok((await c.client.from('tasks').insert({ owner_id: c.id, title: 'Must fail after logout' })).error);
    });

    await t.test('account deletion cascades private data while preserving another account', async () => {
      const c = await createTestAccount(config, 'cascade');
      const subject = randomUUID(); const period = randomUUID();
      try {
        assert.equal((await c.client.from('subjects').insert({ id: subject, owner_id: c.id, name: 'Delete fixture' })).error, null);
        assert.equal((await c.client.from('school_periods').insert({ id: period, owner_id: c.id, name: 'Delete fixture', starts_on: '2026-01-01', ends_on: '2026-12-31' })).error, null);
        for (const sample of samples.filter((item) => !['subjects', 'school_periods'].includes(item.table))) {
          const row = { ...sample.row, owner_id: c.id, ...(sample.key === 'id' ? { id: randomUUID() } : {}) };
          if ('subject_id' in row) row.subject_id = subject;
          if ('period_id' in row) row.period_id = period;
          assert.equal((await c.client.from(sample.table).insert(row)).error, null);
        }
      } finally {
        await deleteTestAccount(config, c);
      }
      // This separate privileged fixture check proves deletion, not RLS. All
      // preceding owner/foreign/anonymous access assertions use public keys.
      await verifyFixtureRemoval(config, c.id);
      const stale = await c.client.from('tasks').select('id');
      assert.ok(stale.error || stale.data?.length === 0);
      assert.equal((await b.client.from('profiles').select('id').eq('id', b.id)).data?.length, 1);
    });

    await t.test('real expired correctly signed access token is rejected', { timeout: 650_000 }, async () => {
      const fresh = await createTestAccount(config, 'expiry'); accounts.push(fresh);
      const id = randomUUID();
      const inserted = await fresh.client.from('tasks').insert({ id, owner_id: fresh.id, title: 'Synthetic expiring token fixture' }).select('id');
      assert.equal(inserted.error, null); assert.equal(inserted.data?.[0]?.id, id);
      const remainingMs = fresh.expiresAt * 1000 - Date.now() + 2_000;
      assert.ok(remainingMs > 0 && remainingMs <= 610_000,
        'Configure this disposable local Auth project with jwt_expiry=300 before running the expiry test.');
      // Wait for an Auth-issued user token; do not forge an expired payload and
      // mistakenly claim that an invalid signature proves expiration handling.
      await delay(remainingMs);
      // PostgREST permits 30 seconds of JWT clock skew. The stricter RLS expiry
      // predicate must already hide an existing row and reject writes during it.
      // https://github.com/PostgREST/postgrest/blob/main/docs/references/auth.rst#jwt-claims-validation
      const expiredRead = await fresh.client.from('tasks').select('id').eq('id', id);
      assert.ok(expiredRead.error || expiredRead.data?.length === 0);
      assert.ok((await fresh.client.from('tasks').insert({ owner_id: fresh.id, title: 'Must fail after expiry' })).error);
      const expiredUpdate = await fresh.client.from('tasks').update({ title: 'Forbidden after expiry' }).eq('id', id).select('id');
      assert.ok(expiredUpdate.error || expiredUpdate.data?.length === 0);
      const beyondClockSkewMs = fresh.expiresAt * 1000 + 32_000 - Date.now();
      if (beyondClockSkewMs > 0) await delay(beyondClockSkewMs);
      const rejected = await fresh.client.from('tasks').select('id').eq('id', id);
      assert.ok(rejected.error);
      assert.equal(rejected.status, 401);
      assert.ok((await fresh.client.auth.getUser(fresh.accessToken)).error);
    });
  } finally {
    const cleanupResults = await Promise.allSettled(accounts.map(async (account) => {
      await deleteTestAccount(config, account);
      await verifyFixtureRemoval(config, account.id);
    }));
    assert.ok(cleanupResults.every((result) => result.status === 'fulfilled'), 'At least one local synthetic account requires cleanup.');
  }
});
