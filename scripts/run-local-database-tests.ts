import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] ?? 'all';
if (!['all', 'api', 'rls', 'ui'].includes(target)) throw new Error('Use all, api, rls or ui.');
const config = JSON.parse(readFileSync(join(root, 'supabase/config.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')) as { project_id?: string };
if (config.project_id !== 'lernpilot-integration') throw new Error('Only the dedicated local LernPilot fixture project is allowed.');
const dockerCandidates = [
  process.env.LERNPILOT_DOCKER_EXECUTABLE,
  join(homedir(), 'AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'),
  'C:/Program Files/Docker/Docker/resources/bin/docker.exe',
].filter((value): value is string => Boolean(value));
const docker = dockerCandidates.find(value => existsSync(value));
const localEnv = { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1',
  PATH: docker ? `${dirname(docker)}${delimiter}${process.env.PATH ?? ''}` : process.env.PATH };
const status = spawnSync(process.execPath, [join(root, 'node_modules/supabase/dist/supabase.js'), 'status', '--output', 'json'],
  { cwd: root, env: localEnv, encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024 });
if (status.status !== 0) throw new Error('Start the dedicated local Supabase stack before running database tests.');
let values: Record<string, unknown>;
try { values = JSON.parse(status.stdout) as Record<string, unknown>; }
catch { throw new Error('Local Supabase returned an invalid status.'); }
if (values.API_URL !== 'http://127.0.0.1:54321' || typeof values.ANON_KEY !== 'string' || typeof values.SERVICE_ROLE_KEY !== 'string') {
  throw new Error('Expected loopback Supabase with separate public and fixture keys.');
}
// Keys remain in the child environment, never in command arguments, logs or files.
const testEnv = { ...localEnv, LERNPILOT_DATABASE_TESTS: 'local-fixtures-only',
  SUPABASE_URL: values.API_URL, SUPABASE_PUBLISHABLE_KEY: values.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY };
const tests = target === 'all' ? ['api-flow.test.ts', 'rls.test.ts'] : [target === 'api' ? 'api-flow.test.ts' : 'rls.test.ts'];
const testPaths = target === 'ui' ? [join(root, 'tests/browser/live-account.test.ts')] : tests.map(name => join(root, 'tests/database', name));
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...testPaths],
  { cwd: root, env: testEnv, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => child.kill(signal));
child.once('error', () => { process.stderr.write('Local database test process failed to start.\n'); process.exitCode = 1; });
child.once('exit', code => { process.exitCode = code ?? 1; });
