export const DEMO_PROFILES = ['demo-a', 'demo-b'] as const;
export type DemoProfileId = typeof DEMO_PROFILES[number];

export function getDemoProfileId(search = typeof window === 'undefined' ? '' : window.location.search): DemoProfileId {
  const candidate = new URLSearchParams(search).get('profile');
  return candidate === 'demo-b' ? 'demo-b' : 'demo-a';
}

/** Phase 1 deliberately has no configuration switch that can enable live access. */
export function assertExternalAccessAllowed(): never {
  throw new Error('Conexões externas desativadas nesta fase. Use somente dados fictícios.');
}
