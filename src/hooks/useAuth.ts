import { assertExternalAccessAllowed } from '../infrastructure/runtime';

/** Explicitly disabled adapter. No OAuth SDK, storage, or network side effects. */
export function useAuth() {
  return { accessToken: null, profile: null, isSessionExpired: false,
    login: assertExternalAccessAllowed, logout: () => undefined };
}
