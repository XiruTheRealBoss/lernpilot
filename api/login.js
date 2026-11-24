import { login, readJson, sendJson } from "./_lyceum.js";
export default async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method" });
  try {
    const b = await readJson(req);
    const data = await login(b.username, b.password);
    sendJson(res, 200, data);
  } catch (e) {
    const unauth = e.code === 401;
    sendJson(res, unauth ? 401 : 502, { error: unauth ? "Usuário ou senha inválidos" : "Não consegui falar com o Lyceum. Tente de novo." });
  }
};
