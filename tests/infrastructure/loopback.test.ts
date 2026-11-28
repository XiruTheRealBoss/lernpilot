import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { assertLoopbackBindings, redactLine, startAndVerify, validateLocalCommand } from '../../scripts/local-supabase.ts';

const root = resolve(import.meta.dirname, '../..');
const directory = join(root, 'artifacts/loopback-proxy-tests');
const compiler = 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe';
mkdirSync(directory, { recursive: true });
const proxy = join(directory, 'docker.exe');
const upstream = join(directory, 'upstream probe.exe');
function compile(source: string, output: string) {
  const result = spawnSync(compiler, ['/nologo', '/target:exe', `/out:${output}`, source], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
const fakeSource = join(directory, 'fake.cs');
writeFileSync(fakeSource, 'using System; using System.Text; public class Fake { public static int Main(string[] a) { foreach(string s in a) Console.WriteLine(Convert.ToBase64String(Encoding.UTF8.GetBytes(s))); return Environment.GetEnvironmentVariable("PROXY_TEST_EXIT") == "17" ? 17 : 0; } }');
compile(join(root, 'scripts/local-docker-proxy.cs'), proxy);
compile(fakeSource, upstream);
function invoke(args: string[], extra: Record<string, string> = {}) {
  const result = spawnSync(proxy, args, { encoding: 'utf8', windowsHide: true,
    env: { ...process.env, LERNPILOT_DOCKER_EXECUTABLE: upstream, ...extra } });
  const lines = result.stdout.replace(/\r?\n$/, '');
  return { ...result, args: result.stdout ? lines.split(/\r?\n/).map(line => Buffer.from(line, 'base64').toString()) : [] };
}
const name = 'supabase_db_lernpilot-integration';

test('project create/run rewrites split, joined and wildcard published ports', () => {
  for (const command of ['create', 'run']) {
    const result = invoke([command, '--name', name, '-p', '54322:5432', '--publish=0.0.0.0:54321:8000', '-p54324:8025', 'image']);
    assert.equal(result.status, 0);
    assert.deepEqual(result.args, [command, '--name', name, '-p', '127.0.0.1:54322:5432', '--publish=127.0.0.1:54321:8000', '-p127.0.0.1:54324:8025', 'image']);
  }
});
test('other projects and commands remain untouched', () => {
  for (const args of [['create', '--name', 'supabase_db_other', '-p', '80:80', 'image'], ['inspect', name], ['run', 'image', '--name', name, '-p', '80:80']]) {
    const result = invoke(args); assert.equal(result.status, 0); assert.deepEqual(result.args, args);
  }
});
test('container command and option values are preserved, including Windows quoting', () => {
  const args = ['create', '--name', name, '-e', 'synthetic value "quoted"', '-v', 'C:\\folder with spaces\\', '-p', '127.0.0.1:54322:5432', 'image', '--publish', 'do not rewrite', '"', ''];
  const result = invoke(args); assert.equal(result.status, 0); assert.deepEqual(result.args, args);
});
test('unsupported public bindings and publish-all fail closed without leaking arguments', () => {
  for (const ports of [['-p', '192.0.2.1:80:80'], ['-P'], ['--publish-all'], ['-p']]) {
    const result = invoke(['create', '--name', name, ...ports]); assert.equal(result.status, 125);
    assert.equal(result.stdout, ''); assert.ok(!result.stderr.includes('192.0.2.1'));
  }
});
test('upstream failure and missing executable propagate safely', () => {
  assert.equal(invoke(['version'], { PROXY_TEST_EXIT: '17' }).status, 17);
  assert.equal(invoke(['version'], { LERNPILOT_DOCKER_EXECUTABLE: proxy }).status, 125);
});
test('post-start inspection rejects wildcard bindings while allowing private internal ports', () => {
  const item = (ip: string) => [{ Name: '/'+name, NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: ip }], '9999/tcp': null } } }];
  assert.doesNotThrow(() => assertLoopbackBindings(item('127.0.0.1')));
  assert.doesNotThrow(() => assertLoopbackBindings(item('::1')));
  assert.throws(() => assertLoopbackBindings(item('0.0.0.0')));
  assert.throws(() => assertLoopbackBindings(item('::')));
  assert.throws(() => assertLoopbackBindings([{ Name: '/other', NetworkSettings: { Ports: {} } }]));
});
test('launcher only allows commands and targets belonging to local development', () => {
  for (const args of [['start'], ['stop'], ['status'], ['migration', 'up'], ['db', 'query', 'select 1'], ['config', 'validate']]) assert.doesNotThrow(() => validateLocalCommand(args));
  for (const args of [['login'], ['link'], ['projects', 'create'], ['db', 'query', '--remote'], ['start', '--workdir=elsewhere'], ['migration', 'up', '--stack', 'other']]) assert.throws(() => validateLocalCommand(args));
});
test('output redaction removes sensitive local status and inline credentials', () => {
  for (const line of ['{"SERVICE_ROLE_KEY":"synthetic"}', 'DB_URL=postgresql://user:synthetic@localhost/db', 'JWT_SECRET=synthetic', 'PUBLISHABLE_KEY=synthetic']) assert.equal(redactLine(line), '[Sensitive local status omitted]');
  assert.equal(redactLine('https://localhost eyJsynthetic.payload.signature sb_secret_synthetic'), 'https://localhost [REDACTED_JWT] [REDACTED_KEY]');
});

test('failed or interrupted startup checks survivors and stops unsafe or uninspectable projects without reset', async () => {
  for (const throwsOnStart of [false, true]) {
    for (const brokenInspection of [false, true]) {
      const calls: string[][] = [];
      let inspected = false;
      await assert.rejects(startAndVerify(['start'], {}, {
        run: async args => {
          calls.push(args);
          if (args[0] === 'stop') return 0;
          if (throwsOnStart) throw new Error('Synthetic launch failure');
          return 17;
        },
        inspect: () => {
          inspected = true;
          if (brokenInspection) throw new Error('Synthetic Docker inspection failure');
          return [{ Name: '/' + name, NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '0.0.0.0' }] } } }];
        },
      }), /stopped without a data reset/);
      assert.equal(inspected, true);
      assert.deepEqual(calls, [['start'], ['stop']]);
    }
  }
});

test('failed startup preserves its failure code when no project containers survive', async () => {
  const calls: string[][] = [];
  const result = await startAndVerify(['start'], {}, {
    run: async args => { calls.push(args); return 17; }, inspect: () => [],
  });
  assert.equal(result, 17);
  assert.deepEqual(calls, [['start']]);
});

test('failed containment reports an unconfirmed state instead of claiming the stack stopped', async () => {
  await assert.rejects(startAndVerify(['start'], {}, {
    run: async () => 17,
    inspect: () => { throw new Error('Synthetic inspection failure'); },
  }), /stop failed; container state remains unconfirmed/);
});
