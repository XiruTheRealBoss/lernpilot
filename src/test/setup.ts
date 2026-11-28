import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // Any accidental network attempt fails the test before reaching a provider.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network disabled in tests'))));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
