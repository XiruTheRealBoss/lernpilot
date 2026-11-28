import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { ProviderSession } from './types.ts';
import { ApiError, unauthenticated } from './errors.ts';

export const SESSION_COOKIE = 'lp_local_session';
const token = () => randomBytes(32).toString('base64url');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export interface LocalSession {
  key: string;
  csrfToken: string;
  createdAt: number;
  touchedAt: number;
  provider?: ProviderSession;
  pending: Promise<void>;
}

export class SessionStore {
  private readonly entries = new Map<string, LocalSession>();
  private readonly now: () => number;
  private readonly maxSessions: number;

  constructor(now: () => number = Date.now, maxSessions = 100) {
    this.now = now;
    this.maxSessions = maxSessions;
  }

  private expired(session: LocalSession): boolean {
    const age = this.now() - session.createdAt;
    const idle = this.now() - session.touchedAt;
    return age >= (session.provider ? 8 * 60 * 60_000 : 10 * 60_000)
      || idle >= (session.provider ? 30 * 60_000 : 10 * 60_000);
  }

  create(): { cookieValue: string; session: LocalSession } {
    for (const [key, entry] of this.entries) if (this.expired(entry)) this.entries.delete(key);
    if (this.entries.size >= this.maxSessions) throw new ApiError(429, 'SESSION_LIMIT', 'Zu viele lokale Testsitzungen. Bitte später erneut versuchen.');
    const cookieValue = token();
    const session = { key: digest(cookieValue), csrfToken: token(), createdAt: this.now(), touchedAt: this.now(), pending: Promise.resolve() };
    this.entries.set(session.key, session);
    return { cookieValue, session };
  }

  read(cookieHeader: string | undefined): LocalSession | undefined {
    const values = (cookieHeader ?? '').split(';').map(part => part.trim())
      .filter(part => part.startsWith(`${SESSION_COOKIE}=`));
    if (values.length !== 1) return undefined;
    const value = values[0].slice(SESSION_COOKIE.length + 1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return undefined;
    const entry = this.entries.get(digest(value));
    if (!entry || this.expired(entry)) {
      if (entry) this.entries.delete(entry.key);
      return undefined;
    }
    return entry;
  }

  isActive(session: LocalSession): boolean {
    return this.entries.get(session.key) === session && !this.expired(session);
  }

  touch(session: LocalSession): void { session.touchedAt = this.now(); }
  remove(session: LocalSession): void { this.entries.delete(session.key); }

  /** Serializes refresh/login/logout so simultaneous requests cannot reuse rotating refresh tokens. */
  async exclusive<T>(session: LocalSession, action: () => Promise<T>): Promise<T> {
    const previous = session.pending;
    let release!: () => void;
    session.pending = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      if (!this.isActive(session)) throw unauthenticated();
      return await action();
    } finally { release(); }
  }
}

export function csrfMatches(expected: string, supplied: string | string[] | undefined): boolean {
  if (typeof supplied !== 'string' || supplied.length !== expected.length) return false;
  const candidate = Buffer.from(supplied);
  const known = Buffer.from(expected);
  return candidate.length === known.length && timingSafeEqual(known, candidate);
}

export function sessionCookie(value: string, clear = false): string {
  // Secure is intentionally unavailable on this loopback-only HTTP test server.
  // A production deployment must use HTTPS and a separately reviewed cookie/session configuration.
  return `${SESSION_COOKIE}=${value}; Path=/api/v1; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 8 * 60 * 60}`;
}
