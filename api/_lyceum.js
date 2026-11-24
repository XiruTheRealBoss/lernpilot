// Núcleo do proxy Lyceum — compartilhado pelas funções serverless (Vercel) e pelo server local.
// Faz login (base64 da senha, como o próprio portal faz) e repassa chamadas da API interna.


const ROOT = "https://colegiohumboldt.lyceum.com.br/aluno/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Lernpilot";

function mergeCookies(jar, res) {
  var sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (var i = 0; i < sc.length; i++) {
    var pair = sc[i].split(";")[0];
    var idx = pair.indexOf("=");
    if (idx > 0) jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return jar;
}
function cookieHeader(jar) {
  return Object.keys(jar).map(function (k) { return k + "=" + jar[k]; }).join("; ");
}

async function apiGet(cookie, path) {
  var r = await fetch(ROOT + path, { headers: { Cookie: cookie, "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) { var e = new Error("http " + r.status); e.code = r.status; throw e; }
  return r.json();
}

async function login(username, password) {
  if (!username || !password) { var e0 = new Error("missing"); e0.code = 401; throw e0; }
  var jar = {};
  // 1) bootstrap: obtém XSRF-TOKEN / sessão
  var r = await fetch(ROOT, { headers: { "User-Agent": UA } });
  mergeCookies(jar, r);
  // 2) POST auth — senha vai em base64 (é o que o portal faz), form urlencoded
  var b64 = Buffer.from(String(password), "utf8").toString("base64");
  var body = new URLSearchParams({ username: username, password: b64, recaptchaResponse: "" }).toString();
  r = await fetch(ROOT + "auth", {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
      "X-XSRF-TOKEN": jar["XSRF-TOKEN"] || "",
      "User-Agent": UA,
    },
    body: body,
  });
  mergeCookies(jar, r);
  // 3) identidade: codPessoa vem do cookie user-data (base64 JSON)
  var codPessoa = null, nome = "Aluno";
  if (jar["user-data"]) {
    try {
      var d = JSON.parse(Buffer.from(decodeURIComponent(jar["user-data"]), "base64").toString("utf8"));
      codPessoa = d.id; nome = d.name;
    } catch (e) {}
  }
  if (!codPessoa) { var e1 = new Error("login"); e1.code = 401; throw e1; }
  // 4) codAluno / turma
  var u = await apiGet(cookieHeader(jar), "apix/api/rest/alunos/user/" + codPessoa);
  var al = u && u.content && u.content[0];
  if (!al) { var e2 = new Error("login"); e2.code = 401; throw e2; }
  return {
    cookie: cookieHeader(jar),
    codPessoa: codPessoa,
    codAluno: al.codAluno || al.matricula,
    nome: al.nomeAluno || nome,
    turma: al.turma || "",
    serie: al.serie || "",
    curso: al.nomeCurso || "",
  };
}

function boletim(cookie, codPessoa, codAluno) {
  return apiGet(cookie, "apix/pessoas/" + codPessoa + "/alunos/" + codAluno + "/boletim");
}

// helpers HTTP (compatível com Vercel e server local)
function readJson(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    var data = "";
    req.on("data", function (c) { data += c; });
    req.on("end", function () { try { resolve(JSON.parse(data || "{}")); } catch (e) { resolve({}); } });
    req.on("error", function () { resolve({}); });
  });
}
function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

export { login, boletim, readJson, sendJson };
