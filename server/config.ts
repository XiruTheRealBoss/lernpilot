export interface ServerConfig {
  port: number;
  frontendOrigin: string;
  supabaseUrl: string;
  supabasePublicKey: string;
}

/** This entry point deliberately supports local HTTP development only. */
export function requireLocalUrl(raw: string, label: string): URL {
  const value = new URL(raw);
  if (value.protocol !== 'http:' || value.hostname !== '127.0.0.1' || value.username || value.password
    || value.pathname !== '/' || value.search || value.hash) {
    throw new Error(`${label} muss eine lokale http://127.0.0.1:PORT-Adresse sein.`);
  }
  return value;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  if (env.NODE_ENV === 'production') throw new Error('Dieser Server ist ausschließlich für lokale Tests vorgesehen.');
  const port = Number(env.LERNPILOT_API_PORT ?? '8787');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Ungültiger API-Port.');
  const frontendOrigin = requireLocalUrl(env.LERNPILOT_FRONTEND_ORIGIN ?? 'http://127.0.0.1:5174', 'Frontend-Origin').origin;
  const supabaseUrl = requireLocalUrl(env.SUPABASE_URL ?? 'http://127.0.0.1:54321', 'Supabase-URL').origin;
  const supabasePublicKey = env.SUPABASE_PUBLISHABLE_KEY ?? '';
  // New public keys are preferred. Legacy local anon JWTs remain supported, but no privileged key.
  let legacyAnon = false;
  try {
    const parts = supabasePublicKey.split('.');
    legacyAnon = parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role === 'anon';
  } catch { /* Not a legacy JWT. The public-key format is checked below. */ }
  if ((!supabasePublicKey.startsWith('sb_publishable_') && !legacyAnon) || supabasePublicKey.length > 4096) {
    throw new Error('Nur einen lokalen Supabase-Publishable-/Anon-Schlüssel verwenden.');
  }
  return { port, frontendOrigin, supabaseUrl, supabasePublicKey };
}
