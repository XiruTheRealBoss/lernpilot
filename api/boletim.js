import { boletim, readJson, sendJson } from "./_lyceum.js";
export default async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method" });
  try {
    const b = await readJson(req);
    if (!b.cookie || !b.codPessoa || !b.codAluno) return sendJson(res, 400, { error: "sessão inválida" });
    const data = await boletim(b.cookie, b.codPessoa, b.codAluno);
    sendJson(res, 200, data);
  } catch (e) {
    const expired = e.code === 401 || e.code === 403;
    sendJson(res, expired ? 401 : 502, { error: expired ? "Sessão expirou, entre de novo." : "Erro ao buscar notas." });
  }
};
