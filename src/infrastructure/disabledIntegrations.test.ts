import { describe, expect, it } from 'vitest';
import { login, boletim } from '../../api/_lyceum.js';
import loginHandler from '../../api/login.js';
import boletimHandler from '../../api/boletim.js';
import { assertExternalAccessAllowed } from './runtime';

describe('disabled live integrations', () => {
  it('blocks provider adapters before any fetch', async () => {
    expect(assertExternalAccessAllowed).toThrow(/desativadas/);
    await expect(login('synthetic', 'synthetic')).rejects.toMatchObject({ code: 410 });
    await expect(boletim('synthetic', 'synthetic', 'synthetic')).rejects.toMatchObject({ code: 410 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([loginHandler, boletimHandler])('rejects requests without even reading a request body', async (handler) => {
    let status = 0;
    let body = '';
    const req = new Proxy({}, { get() { throw new Error('Request must not be inspected'); } });
    const res = {
      set statusCode(value: number) { status = value; },
      setHeader() { /* Response header sink. */ },
      end(value: string) { body = value; },
    };
    // Minimal response boundary: no provider or HTTP server is involved.
    await handler(req as never, res as never);
    expect(status).toBe(410);
    expect(JSON.parse(body)).toMatchObject({ code: 'INTEGRATION_DISABLED' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
