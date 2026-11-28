import { describe, expect, it } from 'vitest';
import { clearDemoProfile, createProfileStorage, removeLegacyCredentials } from './profileStorage';
import { getDemoProfileId } from './runtime';

describe('synthetic profile boundaries', () => {
  it('never shares notes or study state between profiles', () => {
    const a = createProfileStorage('demo-a');
    const b = createProfileStorage('demo-b');
    a.setItem('tasks', JSON.stringify({ state: { notes: { example: 'Only A' } } }));
    b.setItem('tasks', JSON.stringify({ state: { notes: { example: 'Only B' } } }));
    expect(a.getItem('tasks')).toContain('Only A');
    expect(b.getItem('tasks')).toContain('Only B');
    localStorage.setItem('unrelated-application', 'keep');
    clearDemoProfile('demo-a');
    expect(a.getItem('tasks')).toBeNull();
    expect(b.getItem('tasks')).toContain('Only B');
    expect(localStorage.getItem('unrelated-application')).toBe('keep');
  });
  it('does not import unscoped legacy data and rejects corrupt storage', () => {
    localStorage.setItem('lernpilot_state', JSON.stringify({ notes: 'old' }));
    localStorage.setItem('lernpilot:demo:v1:demo-a:study', '{bad json');
    expect(createProfileStorage('demo-a').getItem('study')).toBeNull();
  });
  it('removes only known old credentials', () => {
    localStorage.setItem('lernpilot_access_token', 'synthetic-old-token');
    sessionStorage.setItem('lyr_sess', 'synthetic-old-session');
    localStorage.setItem('unrelated', 'keep');
    removeLegacyCredentials();
    expect(localStorage.getItem('lernpilot_access_token')).toBeNull();
    expect(sessionStorage.getItem('lyr_sess')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });
  it('uses an allowlist for profiles', () => {
    expect(getDemoProfileId('?demo&profile=demo-b')).toBe('demo-b');
    expect(getDemoProfileId('?profile=real-user')).toBe('demo-a');
  });
  it.each([
    ['tasks', { filters: null }],
    ['tasks', { completedIds: 'wrong' }],
    ['study', { tests: 'wrong' }],
    ['study', { tests: [{ id: 'invalid', date: '2026-02-31', topics: [] }] }],
    ['study', { teacherStyles: { Demo: { notes: 4 } } }],
  ])('rejects structurally invalid %s state', (name, state) => {
    localStorage.setItem(`lernpilot:demo:v1:demo-a:${name}`, JSON.stringify({ state }));
    expect(createProfileStorage('demo-a').getItem(name as string)).toBeNull();
  });
});
