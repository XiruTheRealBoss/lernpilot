# Lernpilot (site)

Central do aluno que entra no **Lyceum** e no **Google** (Classroom, Agenda, Docs, Slides, Drive) com a conta do próprio aluno e junta notas, provas, lições, faltas e avisos numa tela, com estatísticas e um assistente.

Este projeto mora na pasta `site/` e é independente do resto do repositório (tem o próprio `package.json`).

## Rodar

```bash
cd site
npm install
npm run dev        # http://localhost:5173
npm test           # auto-teste da lógica (notas, provas, assistente, leitura do Lyceum, livros, fotos)
npm run build && npm run preview   # versão de produção em http://localhost:4173
```

## Rotas

| Rota | O que é |
|---|---|
| `/` | Página inicial: livros 3D flutuando, Chromebook que abre mostrando a tela de login |
| `/login` | Entrar com Lyceum (usuário + senha do Aluno Online) ou com Google |
| `/central` | Resumo do dia, provas, avisos, assistente |
| `/tarefas` · `/notas` · `/estatisticas` · `/materiais` · `/avisos` | Lições, boletim, gráficos, Docs & Slides, mural |
| `/provas-feitas` | Histórico de fotos das provas já feitas, numa pasta por matéria |
| `/conexoes` · `/perfil` | Contas conectadas, privacidade, apagar dados |

## Lyceum

O login passa pelo conector em `server/lyceum.ts`, que roda junto com o `npm run dev` / `npm run preview`:

- fala só com `colegiohumboldt.lyceum.com.br/aluno`;
- usa a senha uma vez para entrar e não guarda nada; a sessão do portal fica 30 min na memória;
- depois de um login, `GET /api/lyceum/diagnostic` mostra só o status e os **nomes** dos campos que cada endpoint devolveu (nunca valores) — serve para ajustar `server/lyceum-map.ts` se algum dado não aparecer.

Ele **não funciona em hospedagem estática** (Vercel/Netlify só com arquivos). Publicar o conector num servidor faria a senha dos colegas passar por esse servidor; decida isso com cuidado antes.

## Google (Classroom, Agenda, Drive)

1. Em <https://console.cloud.google.com/> crie um projeto.
2. Ative **Google Classroom API**, **Google Calendar API** e **Google Drive API**.
3. Tela de consentimento OAuth: tipo **Externo**; adicione seu e-mail da escola como usuário de teste.
4. Credenciais → **ID do cliente OAuth** → Aplicativo da Web → origem autorizada `http://localhost:5173` (e o endereço publicado, se houver).
5. Copie `.env.example` para `.env`, cole o ID em `VITE_GOOGLE_CLIENT_ID=` e reinicie o `npm run dev`.

Permissões pedidas (todas de leitura): Classroom (turmas, suas atividades e notas, comunicados, materiais), eventos da Agenda e a lista de arquivos do Drive. Se a escola bloquear apps externos no Google dela, só o administrador libera.

## ClassApp

Não conecta: o ClassApp entra por código enviado por e-mail/SMS e não abre os comunicados para outros apps.

## Página inicial

- Livros 3D (`src/components/planet-scene.ts`, `src/lib/book-layout.ts`): sete livros didáticos usados na escola, com as capas reais em `public/img/books`. O posicionamento garante que nenhum livro encosta em outro, mesmo girando e deslizando (conferido no `npm test`).
- Chromebook (`src/components/ui/chromebook-open.tsx`): abre conforme a página rola e mostra `public/img/login-screen.webp`. "acer" e "chromebook" são texto, não os logotipos oficiais.
- A cena antiga do planeta continua em `/?fundo=terra`.

## Créditos e direitos

- Composição da página inicial: referência "Ascend", recolorida para azul, laranja e branco.
- Tela de login: referência "aurora glass", recolorida.
- Abas animadas: adaptadas do componente `vercel-tabs`.
- As capas em `public/img/books` são das editoras (Klett, Westermann, SM), recortadas de imagens públicas. Peça autorização antes de publicar o site na internet.

## Área de estudos (lições, provas, professores, quanto falta)

| Tela | Rota | O que faz |
|---|---|---|
| Lições | `/tarefas` | Grupos por prazo (atrasadas, hoje, amanhã, esta semana, mais tarde, sem data, feitas), busca, filtro por turma, detalhes e anotação. Marcar como feita vale só aqui: não entrega no Classroom. |
| Provas | `/provas` | Criar e editar provas, conteúdos com checklist e progresso, sugestões a partir de tarefas que parecem prova (aceitar uma vez não repete). |
| Provas feitas | `/provas-feitas` | Fotos das provas (envio de imagem ou câmera), uma pasta por matéria. Ficam só no navegador (IndexedDB `sb-exam-photos`), ligadas ao login do Lyceum e/ou e-mail do Google. |
| Professores | `/professores` | Estilo de prova de cada professor: tipos de questão, dificuldade, assuntos recorrentes, pontos por parte, observações. |
| Notas | `/notas` | "Quanto falta para passar" com a fórmula da escola, recuperação, meta e notas simuladas (sempre marcadas como simuladas). |

- Lógica: `src/lib/boletim.ts` (motor de notas), `src/lib/notice-tasks.ts` (lições dentro de avisos), `src/lib/study.ts` (regras de agenda, provas e professores), `src/lib/exam-photos.ts` (fotos das provas).
- Dados do aluno (provas, checklist, estilos, anotações, meta, simulações) ficam em `study`, dentro do registro `sb:v2` do navegador. Sair da conta apaga esses dados; as fotos das provas só são apagadas pelo botão "Apagar meus dados" em `/perfil`.
- Professores são identificados pelo id estável da origem (`gc:` Classroom, `ly:` Lyceum); nomes iguais com ids diferentes não são misturados.

## Demonstração

Abra `http://localhost:5173/demo` (ou qualquer endereço com `?demo`). Carrega um aluno fictício, sem login, sem OAuth e sem rede, incluindo um boletim de exemplo. Nada é gravado na conta real; "Sair da demonstração" volta para ela.

## Testes

`npm test` roda três verificações pelo terminal: lógica geral (incluindo livros e fotos), área de estudos (motor de notas com resultados esperados, estado local, demo) e renderização das 12 telas no Node com os dados da demonstração.
