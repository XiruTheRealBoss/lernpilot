// Phase 1: fail closed. No password parsing, portal calls, or session secrets.
export const DISABLED_MESSAGE = 'Integração Lyceum desativada. Use somente dados fictícios.';
export async function login(_username, _password) { throw Object.assign(new Error(DISABLED_MESSAGE), { code: 410 }); }
export async function boletim(_cookie, _codPessoa, _codAluno) { throw Object.assign(new Error(DISABLED_MESSAGE), { code: 410 }); }

/** @param {import('node:http').ServerResponse} res */
export function sendDisabled(res) {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ code: 'INTEGRATION_DISABLED', error: DISABLED_MESSAGE }));
}
