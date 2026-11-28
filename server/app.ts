import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { ZodError } from 'zod';
import { createTaskSchema, credentialsSchema, taskListQuerySchema, updateTaskSchema, uuidSchema } from '../src/shared/contracts/core.ts';
import { ApiError, unauthenticated, unavailable } from './errors.ts';
import { requireLocalUrl } from './config.ts';
import { RateLimiter } from './rate-limit.ts';
import { csrfMatches, SessionStore, sessionCookie, type LocalSession } from './sessions.ts';
import type { InfrastructureGateway, ProviderSession } from './types.ts';

const MAX_BODY = 20 * 1024;
const writes = new Set(['POST', 'PATCH', 'DELETE', 'PUT']);

export interface ApiOptions {
  gateway: InfrastructureGateway;
  frontendOrigin: string;
  port?: number;
  now?: () => number;
  logger?: (entry: { requestId: string; route: string; status: number; durationMs: number }) => void;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '')) {
    throw new ApiError(415, 'JSON_REQUIRED', 'Eine JSON-Anfrage ist erforderlich.');
  }
  if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) {
    throw new ApiError(413, 'BODY_TOO_LARGE', 'Die Anfrage ist zu groß.');
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    let rejected = false;
    req.on('data', (chunk: Buffer) => {
      if (rejected) return;
      length += chunk.length;
      if (length > MAX_BODY) {
        rejected = true;
        chunks.length = 0;
        req.pause();
        reject(new ApiError(413, 'BODY_TOO_LARGE', 'Die Anfrage ist zu groß.'));
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new ApiError(400, 'INVALID_JSON', 'Ungültige JSON-Anfrage.')); }
    });
    req.on('error', () => reject(new ApiError(400, 'INVALID_REQUEST', 'Die Anfrage wurde unterbrochen.')));
    req.on('aborted', () => reject(new ApiError(400, 'INVALID_REQUEST', 'Die Anfrage wurde unterbrochen.')));
  });
}

function send(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function routePattern(path: string): string {
  if (/^\/api\/v1\/tasks\/[a-f0-9-]+$/i.test(path)) return '/api/v1/tasks/:id';
  return ['/api/v1/auth/csrf', '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/logout',
    '/api/v1/auth/me', '/api/v1/tasks', '/api/login', '/api/boletim'].includes(path) ? path : 'unknown';
}

export function createApiServer(options: ApiOptions) {
  const frontend = requireLocalUrl(options.frontendOrigin, 'Frontend-Origin');
  const now = options.now ?? Date.now;
  const store = new SessionStore(now);
  const limiter = new RateLimiter(now);

  async function requireProvider(session: LocalSession | undefined): Promise<ProviderSession> {
    if (!session?.provider) throw unauthenticated();
    return store.exclusive(session, async () => {
      const previous = session.provider;
      if (!previous) throw unauthenticated();
      try {
        const provider = previous.expiresAt - now() < 60_000
          ? await options.gateway.refresh(previous.refreshToken) : previous;
        const user = await options.gateway.verify(provider.accessToken);
        if (user.id !== previous.user.id || provider.user.id !== previous.user.id) throw unauthenticated();
        session.provider = { ...provider, user };
        store.touch(session);
        return session.provider;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) store.remove(session);
        throw error;
      }
    });
  }

  const server = createServer((req, res) => {
    const requestId = randomUUID();
    const started = now();
    let path = '';
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.on('finish', () => {
      options.logger?.({ requestId, route: routePattern(path), status: res.statusCode, durationMs: Math.max(0, now() - started) });
      if (!req.complete) req.destroy();
    });

    void (async () => {
      if (!req.url || req.url.length > 2048 || !req.url.startsWith('/') || req.url.startsWith('//')) {
        throw new ApiError(400, 'INVALID_REQUEST', 'Ungültige Anfrage.');
      }
      const url = new URL(req.url, frontend.origin);
      path = url.pathname;
      const method = req.method ?? 'GET';
      const actualPort = server.address();
      const apiHost = typeof actualPort === 'object' && actualPort ? `127.0.0.1:${actualPort.port}` : `127.0.0.1:${options.port ?? 8787}`;
      if (req.headers.host !== frontend.host && req.headers.host !== apiHost) {
        throw new ApiError(403, 'HOST_DENIED', 'Diese lokale Adresse ist nicht freigegeben.');
      }
      if (req.headers['sec-fetch-site'] === 'cross-site'
        || (req.headers.origin !== undefined && req.headers.origin !== frontend.origin)) {
        throw new ApiError(403, 'ORIGIN_DENIED', 'Diese Anfrage ist nicht freigegeben.');
      }
      if (writes.has(method) && req.headers.origin !== frontend.origin) {
        throw new ApiError(403, 'ORIGIN_DENIED', 'Die Herkunft der Anfrage fehlt.');
      }
      const remote = req.socket.remoteAddress ?? 'unknown';
      limiter.take(`${remote}:all`, 300);
      if (path === '/api/login' || path === '/api/boletim') {
        send(res, 410, { error: { code: 'INTEGRATION_DISABLED', message: 'Schulverbindungen sind deaktiviert.', requestId } });
        return;
      }
      if (!path.startsWith('/api/v1/')) throw new ApiError(404, 'NOT_FOUND', 'Nicht gefunden.');
      if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Diese Methode ist nicht erlaubt.');
      }
      let session = store.read(req.headers.cookie);
      let expectedUserId: string | undefined;
      if (path === '/api/v1/auth/logout' || path === '/api/v1/tasks' || path.startsWith('/api/v1/tasks/')) {
        const header = req.headers['x-lernpilot-user-id'];
        if (header !== undefined) {
          let occurrences = 0;
          for (let index = 0; index < req.rawHeaders.length; index += 2) {
            if (req.rawHeaders[index].toLowerCase() === 'x-lernpilot-user-id') occurrences++;
          }
          const parsed = uuidSchema.safeParse(header);
          if (occurrences !== 1 || !parsed.success) {
            throw new ApiError(400, 'INVALID_INPUT', 'Die erwartete Testkonto-Kennung ist ungültig.');
          }
          expectedUserId = parsed.data;
        }
      }
      const assertExpectedUser = (provider: ProviderSession) => {
        if (expectedUserId !== undefined && expectedUserId !== provider.user.id) {
          throw new ApiError(409, 'SESSION_CHANGED', 'Das Testkonto wurde in einem anderen Tab gewechselt. Bitte neu laden.');
        }
      };
      if (path === '/api/v1/auth/csrf' && method === 'GET') {
        if (url.search) throw new ApiError(400, 'INVALID_QUERY', 'Ungültige Anfrageparameter.');
        if (!session) {
          const created = store.create();
          session = created.session;
          res.setHeader('Set-Cookie', sessionCookie(created.cookieValue));
        }
        send(res, 200, { data: { csrfToken: session.csrfToken } });
        return;
      }
      if (writes.has(method)) {
        limiter.take(`${remote}:write`, 120);
        if (!session || !csrfMatches(session.csrfToken, req.headers['x-csrf-token'])) {
          throw new ApiError(403, 'CSRF_DENIED', 'Die Sitzung ist abgelaufen. Bitte die Seite neu laden.');
        }
      }
      // Optional identity binding on reads: an old tab must not display a different
      // account's tasks after another tab replaces the shared HttpOnly cookie.
      if (path === '/api/v1/tasks' && method === 'GET' && session && req.headers['x-csrf-token'] !== undefined
        && !csrfMatches(session.csrfToken, req.headers['x-csrf-token'])) {
        throw new ApiError(409, 'SESSION_CHANGED', 'Das Testkonto wurde in einem anderen Tab gewechselt. Bitte neu laden.');
      }
      if ((path === '/api/v1/auth/login' || path === '/api/v1/auth/register') && method === 'POST') {
        limiter.take(`${remote}:auth`, 10);
        if (url.search) throw new ApiError(400, 'INVALID_QUERY', 'Ungültige Anfrageparameter.');
        const credentials = credentialsSchema.parse(await readJson(req));
        const previous = session!;
        await store.exclusive(previous, async () => {
          if (previous.provider) throw new ApiError(409, 'ALREADY_SIGNED_IN', 'Bitte zuerst abmelden.');
          const provider = path.endsWith('/register')
            ? await options.gateway.register(credentials) : await options.gateway.login(credentials);
          if (!provider) {
            send(res, 202, { data: { user: null, requiresConfirmation: true } });
            return;
          }
          const user = await options.gateway.verify(provider.accessToken);
          if (user.id !== provider.user.id) throw unauthenticated();
          // Remove the old pre-login session before minting the authenticated one.
          store.remove(previous);
          const created = store.create();
          created.session.provider = { ...provider, user };
          res.setHeader('Set-Cookie', sessionCookie(created.cookieValue));
          send(res, path.endsWith('/register') ? 201 : 200, { data: { user, csrfToken: created.session.csrfToken } });
        });
        return;
      }
      if (path === '/api/v1/auth/logout' && method === 'POST') {
        const previous = session!;
        await store.exclusive(previous, async () => {
          // The store identity was verified on login/refresh. Check that trusted
          // identity without a network call so an Auth outage cannot block local logout.
          if (expectedUserId !== undefined) {
            if (!previous.provider) throw unauthenticated();
            assertExpectedUser(previous.provider);
          }
          store.remove(previous);
          res.setHeader('Set-Cookie', sessionCookie('', true));
          if (previous.provider) await options.gateway.logout(previous.provider);
          send(res, 200, { data: { loggedOut: true } });
        });
        return;
      }
      const provider = await requireProvider(session);
      assertExpectedUser(provider);
      if (path === '/api/v1/auth/me' && method === 'GET' && !url.search) {
        send(res, 200, { data: { user: provider.user, csrfToken: session!.csrfToken } });
        return;
      }
      if (path === '/api/v1/tasks' && method === 'GET') {
        const parameters = [...url.searchParams.keys()];
        if (new Set(parameters).size !== parameters.length) throw new ApiError(400, 'INVALID_QUERY', 'Doppelte Anfrageparameter.');
        const query = taskListQuerySchema.parse(Object.fromEntries(url.searchParams));
        send(res, 200, { data: { tasks: await options.gateway.listTasks(provider, query.limit, query.after) } });
        return;
      }
      if (path === '/api/v1/tasks' && method === 'POST' && !url.search) {
        const input = createTaskSchema.parse(await readJson(req));
        send(res, 201, { data: { task: await options.gateway.createTask(provider, input) } });
        return;
      }
      const match = path.match(/^\/api\/v1\/tasks\/([^/]+)$/);
      if (match && !url.search && (method === 'PATCH' || method === 'DELETE')) {
        const id = uuidSchema.parse(match[1]);
        if (method === 'PATCH') {
          const input = updateTaskSchema.parse(await readJson(req));
          const task = await options.gateway.updateTask(provider, id, input);
          if (!task) throw new ApiError(404, 'NOT_FOUND', 'Nicht gefunden.');
          send(res, 200, { data: { task } });
        } else {
          if (!(await options.gateway.deleteTask(provider, id))) throw new ApiError(404, 'NOT_FOUND', 'Nicht gefunden.');
          send(res, 200, { data: { deleted: true } });
        }
        return;
      }
      throw new ApiError(404, 'NOT_FOUND', 'Nicht gefunden.');
    })().catch((error: unknown) => {
      const safe = error instanceof ApiError ? error : error instanceof ZodError
        ? new ApiError(400, 'INVALID_INPUT', 'Bitte die Eingaben prüfen.') : unavailable();
      if (safe.status === 429) res.setHeader('Retry-After', '60');
      if (!req.complete) res.setHeader('Connection', 'close');
      if (!res.headersSent) send(res, safe.status, { error: { code: safe.code, message: safe.message, requestId } });
      else res.end();
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 50;
  return server;
}
