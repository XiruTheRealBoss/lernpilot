import { describe, expect, it, vi } from 'vitest';
import { accountClient } from './client';

const a = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.test' };
const b = { id: '22222222-2222-4222-8222-222222222222', email: 'b@example.test' };
const task = {
  id: '33333333-3333-4333-8333-333333333333', title: 'Fictícia', description: '',
  dueAt: null, completedAt: null, subjectId: null, periodId: null, source: 'manual',
  createdAt: '2026-11-27T12:00:00Z', updatedAt: '2026-11-27T12:00:00Z',
};
const response = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ data }) }) as Response;

describe('account requests remain bound to their expected identity', () => {
  it('binds task reads to the identity obtained before the read', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ user: a, csrfToken: 'a'.repeat(43) }))
      .mockResolvedValueOnce(response({ tasks: [task] }));
    vi.stubGlobal('fetch', fetch);
    const user = await accountClient.me();
    await accountClient.tasks(user.id);
    expect(fetch.mock.calls[1][1]?.headers).toMatchObject({ 'X-Lernpilot-User-Id': a.id, 'X-CSRF-Token': 'a'.repeat(43) });
  });

  it('keeps A as the expected owner even when a parallel session poll returns B', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ user: a, csrfToken: 'a'.repeat(43) }))
      .mockResolvedValueOnce(response({ user: b, csrfToken: 'b'.repeat(43) }))
      .mockResolvedValueOnce(response({ task }));
    vi.stubGlobal('fetch', fetch);
    const expected = await accountClient.me();
    await accountClient.me();
    await accountClient.create('Fictícia', expected.id);
    // The server must reject A expectation with B's cookie/CSRF; the client never switches owners.
    expect(fetch.mock.calls[2][1]?.headers).toMatchObject({ 'X-Lernpilot-User-Id': a.id, 'X-CSRF-Token': 'b'.repeat(43) });
  });

  it('binds logout to the identity captured before clearing the screen', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ user: a, csrfToken: 'a'.repeat(43) }))
      .mockResolvedValueOnce(response({ user: b, csrfToken: 'b'.repeat(43) }))
      .mockResolvedValueOnce(response({ loggedOut: true }));
    vi.stubGlobal('fetch', fetch);
    const expected = await accountClient.me();
    await accountClient.me();
    await accountClient.logout(expected.id);
    expect(fetch.mock.calls[2][1]?.headers).toMatchObject({ 'X-Lernpilot-User-Id': a.id });
  });
});
