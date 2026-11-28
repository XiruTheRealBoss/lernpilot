import type { StateStorage } from 'zustand/middleware';
import { getDemoProfileId, type DemoProfileId } from './runtime';
import { validStoredState } from './storageValidation';

const PREFIX = 'lernpilot:demo:v1:';
const fallback = new Map<string, string>();
const LEGACY_SECRETS = ['lernpilot_access_token', 'lernpilot_token_expiry', 'lernpilot_user_profile', 'lyr_sess'];
const LEGACY_DATA = ['lernpilot_cache', 'lernpilot_state', 'lernpilot_study', 'lyr_manuais', 'lyr_goal'];

/** Profiles isolate synthetic development data; this is not authentication. */
export function createProfileStorage(profile: DemoProfileId): StateStorage {
  const keyFor = (name: string) => `${PREFIX}${profile}:${name}`;
  return {
    getItem(name) {
      const key = keyFor(name);
      try {
        const raw = localStorage.getItem(key) ?? fallback.get(key) ?? null;
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !('state' in parsed) || !validStoredState(name, parsed.state)) return null;
        return raw;
      } catch { return fallback.get(key) ?? null; }
    },
    setItem(name, value) {
      const key = keyFor(name);
      fallback.set(key, value);
      try { localStorage.setItem(key, value); } catch { /* Session-only fallback when storage is blocked. */ }
    },
    removeItem(name) {
      const key = keyFor(name);
      fallback.delete(key);
      try { localStorage.removeItem(key); } catch { /* No accessible persistent storage. */ }
    },
  };
}

export const profileStorage = createProfileStorage(getDemoProfileId());

export function clearDemoProfile(profile = getDemoProfileId()) {
  const storage = createProfileStorage(profile);
  storage.removeItem('tasks');
  storage.removeItem('study');
}

/** Known old credentials are removed, never read or migrated into demo profiles. */
export function removeLegacyCredentials() {
  for (const key of LEGACY_SECRETS) {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
    try { sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  }
}

export function removeLegacyData() {
  removeLegacyCredentials();
  for (const key of LEGACY_DATA) {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
    try { sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  }
}
