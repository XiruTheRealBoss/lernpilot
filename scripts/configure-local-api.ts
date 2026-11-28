import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadServerConfig } from '../server/config.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Serialize only the local public key; ignore every privileged status field. */
export function publicLocalEnvironment(status: Record<string, unknown>): string {
  const key = status.ANON_KEY;
  if (status.API_URL !== 'http://127.0.0.1:54321' || typeof key !== 'string'
    || !/^[A-Za-z0-9_.-]+$/.test(key)) throw new Error('Invalid local public configuration.');
  const config = loadServerConfig({ SUPABASE_URL: status.API_URL, SUPABASE_PUBLISHABLE_KEY: key });
  return `SUPABASE_URL=${config.supabaseUrl}\nSUPABASE_PUBLISHABLE_KEY=${config.supabasePublicKey}\nLERNPILOT_FRONTEND_ORIGIN=${config.frontendOrigin}\n`;
}

function main(): void {
  const destination = join(root, '.env.local');
  if (existsSync(destination)) {
    process.stdout.write('.env.local already exists; no settings were changed.\n');
    return;
  }
  const config = JSON.parse(readFileSync(join(root, 'supabase/config.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')) as { project_id?: string };
  if (config.project_id !== 'lernpilot-integration') throw new Error('Unexpected local project.');
  const docker = [process.env.LERNPILOT_DOCKER_EXECUTABLE,
    join(homedir(), 'AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'),
    'C:/Program Files/Docker/Docker/resources/bin/docker.exe'].find(value => value && existsSync(value));
  if (!docker) throw new Error('Installed Docker executable unavailable.');
  const status = spawnSync(process.execPath, [join(root, 'node_modules/supabase/dist/supabase.js'), 'status', '--output', 'json'], {
    cwd: root, encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1', PATH: `${dirname(docker)}${delimiter}${process.env.PATH ?? ''}` },
  });
  if (status.status !== 0) throw new Error('Local Supabase must already be running.');
  // Never echo raw CLI output. Exclusive creation protects existing configuration.
  writeFileSync(destination, publicLocalEnvironment(JSON.parse(status.stdout) as Record<string, unknown>), { flag: 'wx', mode: 0o600 });
  process.stdout.write('Local API configuration created with the public key only; no key was printed.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch { process.stderr.write('Local API configuration failed; existing files and credentials were not printed or overwritten.\n'); process.exitCode = 1; }
}
