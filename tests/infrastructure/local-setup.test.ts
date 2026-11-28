import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicLocalEnvironment } from '../../scripts/configure-local-api.ts';

const url = 'http://127.0.0.1:54321';
const anon = `synthetic.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.synthetic`;

test('local setup serializes only the public configuration and discards privileged fields', () => {
  const text = publicLocalEnvironment({ API_URL: url, ANON_KEY: anon, SERVICE_ROLE_KEY: 'private-fixture', JWT_SECRET: 'private-fixture' });
  assert.equal(text, `SUPABASE_URL=${url}\nSUPABASE_PUBLISHABLE_KEY=${anon}\nLERNPILOT_FRONTEND_ORIGIN=http://127.0.0.1:5174\n`);
  assert.ok(!text.includes('private-fixture'));
});

test('local setup rejects hosted and unexpected loopback projects', () => {
  for (const API_URL of ['https://example.test', 'http://127.0.0.1:54329', `${url}/other`]) {
    assert.throws(() => publicLocalEnvironment({ API_URL, ANON_KEY: anon }));
  }
});

test('local setup rejects privileged keys and environment-line injection', () => {
  const privileged = `synthetic.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.synthetic`;
  for (const ANON_KEY of [privileged, 'sb_secret_synthetic', `${anon}\nINJECTED=true`, undefined]) {
    assert.throws(() => publicLocalEnvironment({ API_URL: url, ANON_KEY }));
  }
});
