import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectId = 'lernpilot-integration';
const network = 'lernpilot-local';

export function assertLoopbackBindings(containers: unknown): void {
  if (!Array.isArray(containers)) throw new Error('Docker inspection must return an array.');
  for (const container of containers) {
    if (!container || typeof container !== 'object') throw new Error('Invalid Docker inspection.');
    const item = container as { Name?: string; NetworkSettings?: { Ports?: Record<string, Array<{ HostIp?: string }> | null> } };
    if (!item.Name?.startsWith('/supabase_') || !item.Name.endsWith(`_${projectId}`)) throw new Error('Unexpected project container.');
    if (!item.NetworkSettings?.Ports) throw new Error('Missing container port metadata.');
    for (const bindings of Object.values(item.NetworkSettings.Ports)) {
      for (const binding of bindings ?? []) {
        if (!['127.0.0.1', '::1'].includes(binding.HostIp ?? '')) throw new Error('Supabase published a non-loopback port.');
      }
    }
  }
}

export function prepareLocalEnvironment(): NodeJS.ProcessEnv {
  if (process.platform !== 'win32') throw new Error('This local Docker workaround is Windows-only.');
  const configText = readFileSync(join(projectRoot, 'supabase/config.jsonc'), 'utf8');
  const config = JSON.parse(configText.replace(/^\s*\/\/.*$/gm, '')) as { project_id?: string };
  if (config.project_id !== projectId) throw new Error('Unexpected Supabase project.');
  const original = process.env.LERNPILOT_DOCKER_EXECUTABLE
    ?? join(process.env.LOCALAPPDATA ?? '', 'Programs/DockerDesktop/resources/bin/docker.exe');
  if (!isAbsolute(original) || !existsSync(original)) throw new Error('Installed Docker executable not found; supply its absolute path.');
  const shimDir = join(projectRoot, 'artifacts/local-docker-shim');
  mkdirSync(shimDir, { recursive: true });
  const source = join(projectRoot, 'scripts/local-docker-proxy.cs');
  const shim = join(shimDir, 'docker.exe');
  if (!existsSync(shim) || statSync(shim).mtimeMs < statSync(source).mtimeMs) {
    const compiler = join(process.env.WINDIR ?? 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
    if (!existsSync(compiler)) throw new Error('Existing Windows C# compiler unavailable; nothing will be installed.');
    const result = spawnSync(compiler, ['/nologo', '/target:exe', `/out:${shim}`, source], { stdio: 'inherit', windowsHide: true });
    if (result.error || result.status !== 0) throw new Error('Could not compile the project-scoped Docker proxy.');
  }
  return { ...process.env, PATH: `${shimDir};${dirname(original)};${process.env.PATH ?? ''}`,
    LERNPILOT_DOCKER_EXECUTABLE: original, SUPABASE_TELEMETRY_DISABLED: '1' };
}

export function validateLocalCommand(args: string[]): void {
  const allowed = new Set(['start', 'stop', 'status', 'config validate', 'migration list', 'migration up', 'migration new', 'db query', 'db lint', 'db advisors']);
  const command = ['start', 'stop', 'status'].includes(args[0] ?? '') ? args[0] : args.slice(0, 2).join(' ');
  if (!allowed.has(command) || args.some(arg => /^--(?:remote|linked|db-url|project-ref|project-id|workdir|stack)(?:=|$)/.test(arg))) {
    throw new Error('Only allowlisted commands for this local project are permitted.');
  }
}

export function redactLine(line: string): string {
  if (/(?:ANON_KEY|SECRET_KEY|SERVICE_ROLE_KEY|PUBLISHABLE_KEY|JWT_SECRET|DB_URL|password)/i.test(line)) return '[Sensitive local status omitted]';
  return line.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED_DATABASE_URL]');
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, [join(projectRoot, 'node_modules/supabase/dist/supabase.js'), ...args], {
      cwd: projectRoot, env, stdio: ['inherit', 'pipe', 'pipe'], windowsHide: true,
    });
    const out = createInterface({ input: child.stdout! });
    const err = createInterface({ input: child.stderr! });
    out.on('line', line => process.stdout.write(redactLine(line) + '\n'));
    err.on('line', line => process.stderr.write(redactLine(line) + '\n'));
    const interrupt = () => { child.kill('SIGINT'); };
    const terminate = () => { child.kill('SIGTERM'); };
    process.once('SIGINT', interrupt); process.once('SIGTERM', terminate);
    child.once('error', reject);
    child.once('close', code => {
      out.close(); err.close();
      process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
      resolveExit(code ?? 1);
    });
  });
}

function inspectProjectContainers(env: NodeJS.ProcessEnv): unknown[] {
    const executable = env.LERNPILOT_DOCKER_EXECUTABLE!;
    const ids = spawnSync(executable, ['ps', '-q', '--filter', `name=supabase_`], { encoding: 'utf8', windowsHide: true });
    if (ids.error || ids.status !== 0) throw new Error('Could not list project containers.');
    const candidates = ids.stdout.trim().split(/\s+/).filter(Boolean);
    if (candidates.length === 0) return [];
    const inspection = spawnSync(executable, ['inspect', '--format', '{{json .Name}}|{{json .NetworkSettings.Ports}}', ...candidates], { encoding: 'utf8', windowsHide: true });
    if (inspection.error || inspection.status !== 0) throw new Error('Could not inspect project port bindings.');
    const containers = inspection.stdout.trim().split(/\r?\n/).map(line => {
      const split = line.indexOf('|');
      return { Name: JSON.parse(line.slice(0, split)) as string, NetworkSettings: { Ports: JSON.parse(line.slice(split + 1)) as Record<string, Array<{ HostIp?: string }> | null> } };
    }).filter(item => item.Name.startsWith('/supabase_') && item.Name.endsWith(`_${projectId}`));
    return containers;
}

interface StartDependencies {
  run: (args: string[], env: NodeJS.ProcessEnv) => Promise<number>;
  inspect: (env: NodeJS.ProcessEnv) => unknown[];
}

class LoopbackVerificationError extends Error {}

/** Verify surviving containers even when CLI startup fails or throws. */
export async function startAndVerify(args: string[], env: NodeJS.ProcessEnv,
  dependencies: StartDependencies = { run: runCli, inspect: inspectProjectContainers }): Promise<number> {
  let code = 1;
  try { code = await dependencies.run(args, env); }
  catch { /* A failed process may still leave containers running. Inspect below. */ }
  try {
    const containers = dependencies.inspect(env);
    if (containers.length === 0 && code === 0) throw new Error('No matching local project containers found.');
    assertLoopbackBindings(containers);
    if (containers.length > 0) process.stderr.write('LernPilot: all published project ports are bound to loopback.\n');
    return code;
  } catch {
    let stopped = false;
    try { stopped = await dependencies.run(['stop'], env) === 0; }
    catch { /* Report failed containment without exposing command errors. */ }
    if (!stopped) throw new LoopbackVerificationError('Loopback verification and project stop failed; container state remains unconfirmed.');
    throw new LoopbackVerificationError('Loopback verification failed; local project stopped without a data reset.');
  }
}

export async function main(args = process.argv.slice(2)): Promise<number> {
  validateLocalCommand(args);
  const env = prepareLocalEnvironment();
  const start = args[0] === 'start';
  if (start && args.some(arg => arg === '--network-id' || arg.startsWith('--network-id='))) throw new Error('Project network is fixed by the launcher.');
  return start ? startAndVerify([...args, '--network-id', network], env) : runCli(args, env);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch((error: unknown) => {
    process.stderr.write(error instanceof LoopbackVerificationError ? `${error.message}\n`
      : 'Local Supabase launcher failed; credentials and command arguments are not logged.\n');
    process.exitCode = 1;
  });
}
