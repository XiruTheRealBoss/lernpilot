import { randomUUID } from 'node:crypto';
import { databaseClient, fixtureAdmin, localDatabaseConfig } from '../tests/database/local-fixtures.ts';

// Explicit local-only fixture gate is shared with the real database suite.
// Credentials come from an untracked environment, never source or console output.
const config = localDatabaseConfig();
const password = process.env.LERNPILOT_SEED_PASSWORD;
if (!password || password.length < 16 || password.length > 128) {
  throw new Error('Set a synthetic LERNPILOT_SEED_PASSWORD of 16–128 characters in the local environment.');
}
const admin = fixtureAdmin(config);
const createdIds: string[] = [];
try {
  for (const label of ['a', 'b']) {
    const email = `lernpilot-local-${label}@example.test`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) {
      throw new Error('Seed account could not be created; existing accounts are never overwritten.');
    }
    const ownerId = created.data.user.id;
    createdIds.push(ownerId);
    const auth = databaseClient(config);
    const login = await auth.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) throw new Error('Synthetic seed login failed.');
    const client = databaseClient(config, login.data.session.access_token);
    const subjectId = randomUUID(); const periodId = randomUUID();
    const rows: Array<[string, Record<string, unknown> | Array<Record<string, unknown>>]> = [
      ['subjects', { id: subjectId, owner_id: ownerId, name: 'Fiktive Mathematik' }],
      ['school_periods', { id: periodId, owner_id: ownerId, name: 'Fiktives Schuljahr 2026', starts_on: '2026-01-01', ends_on: '2026-12-31' }],
      ['grade_entries', ['manual', 'imported', 'calculated', 'simulated'].map((source, index) => ({
        owner_id: ownerId, subject_id: subjectId, period_id: periodId,
        label: `Fiktiver Herkunftsbeleg ${source} – kein echter Import`, value: 6 + index,
        scale_min: 0, scale_max: 10, weight: 1, recorded_on: '2026-11-01', source,
      }))],
      ['tasks', [
        { owner_id: ownerId, subject_id: subjectId, period_id: periodId, title: 'Fiktive Aufgabe ohne Termin', source: 'manual' },
        { owner_id: ownerId, subject_id: subjectId, period_id: periodId, title: 'Fiktive Aufgabe mit UTC-Termin', due_at: '2026-12-01T15:00:00Z', source: 'manual' },
      ]],
      ['calendar_events', { owner_id: ownerId, subject_id: subjectId, title: 'Fiktive Lernzeit', starts_at: '2026-12-01T15:00:00Z', ends_at: '2026-12-01T16:00:00Z', timezone: 'America/Sao_Paulo' }],
      ['exams', { owner_id: ownerId, subject_id: subjectId, period_id: periodId, title: 'Fiktive Übungsprüfung', scheduled_on: '2026-12-02' }],
      ['user_settings', { owner_id: ownerId, locale: 'de-DE', timezone: 'America/Sao_Paulo' }],
    ];
    for (const [table, row] of rows) {
      if ((await client.from(table).insert(row)).error) throw new Error(`Synthetic seed failed for ${table}.`);
    }
    if ((await client.from('profiles').update({ display_name: `Fiktives Testkonto ${label.toUpperCase()}` }).eq('id', ownerId)).error) {
      throw new Error('Synthetic profile update failed.');
    }
    if ((await auth.auth.signOut({ scope: 'local' })).error) throw new Error('Synthetic seed logout failed.');
  }
  console.info('Two synthetic local accounts and fixture rows created. No credentials are printed.');
} catch {
  const cleanup = await Promise.allSettled(createdIds.map(async (id) => {
    if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Cleanup failed.');
  }));
  if (cleanup.some((result) => result.status === 'rejected')) {
    throw new Error('Seed setup failed; local synthetic account cleanup requires attention.');
  }
  throw new Error('Seed setup failed; accounts created by this run were removed. Existing accounts remain unchanged.');
}
