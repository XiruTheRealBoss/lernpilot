# lernpilot

App de estudos para alunos: junta o HomeworkHub (lições do Google Classroom por prioridade) e o Lyceum Remastered (boletim do Colégio Humboldt), com provas marcadas, lista de conteúdos e perfil de cobrança de cada professor.

- **Lições**: Google Classroom (opcional, só leitura, direto do navegador).
- **Provas**: marque a prova, liste os conteúdos e marque o que já estudou. Tarefas do Classroom com "prova/teste/avaliação" no título aparecem como sugestão.
- **Professores**: tipos de questão, dificuldade, temas que sempre caem e pontos por parte.
- **Notas**: o Lyceum Remastered em `public/notas.html`, usando `api/login.js` e `api/boletim.js` (proxy que não guarda senha).
- **Privacidade**: consentimento no primeiro acesso (adulto ou responsável), página de privacidade e "Apagar meus dados". Tudo fica no aparelho; sem IA, sem contas, sem analytics.

`/?demo` abre com dados de exemplo, sem login do Google. Antes de publicar, preencha `CONTACT` em `src/components/Privacy/Privacy.tsx`.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Google OAuth 2.0 + Google Classroom API (REST)
- Zustand (estado global, com persistência em `localStorage`)

## 1. Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior

## 2. Configurando o Google Cloud Console

Para que o app possa fazer login com o Google e acessar o Classroom, você precisa criar credenciais OAuth:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ou selecione um existente).
3. No menu lateral, vá em **APIs e serviços > Biblioteca** e ative a **Google Classroom API**.
4. Vá em **APIs e serviços > Tela de consentimento OAuth**:
   - Tipo de usuário: **Externo** (ou Interno, se for conta institucional do Google Workspace).
   - Preencha o nome do app ("lernpilot"), e-mail de suporte e domínio (se houver).
   - Em **Escopos**, adicione:
     - `.../auth/classroom.courses.readonly`
     - `.../auth/classroom.coursework.me.readonly`
     - `.../auth/classroom.announcements.readonly`
     - `.../auth/userinfo.profile`
     - `.../auth/userinfo.email`
   - Em **Usuários de teste**, adicione o e-mail da conta Google/Classroom que será usada para testar (enquanto o app estiver em modo de teste).
5. Vá em **APIs e serviços > Credenciais** e clique em **Criar credenciais > ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Em **Origens JavaScript autorizadas**, adicione:
     - `http://localhost:5173` (porta padrão do Vite em desenvolvimento)
     - A URL de produção do seu deploy (ex: `https://lernpilot.vercel.app`)
   - Não é necessário configurar "URIs de redirecionamento" — o app usa o fluxo implícito de token via `@react-oauth/google`.
6. Copie o **Client ID** gerado (algo como `123456789-abc.apps.googleusercontent.com`).

## 3. Configurando o projeto

```bash
cd lernpilot
npm install
cp .env.example .env
```

Abra o `.env` e cole o Client ID copiado:

```
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

## 4. Executando em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173`, clique em **Entrar com o Google** e autorize os escopos do Classroom.

> ⚠️ Enquanto a tela de consentimento OAuth estiver em modo de teste, apenas os e-mails cadastrados em "Usuários de teste" conseguirão fazer login.

## 5. Build para produção

```bash
npm run build
npm run preview
```

Os arquivos finais ficam em `dist/`. Você pode hospedar essa pasta na Vercel, Netlify ou qualquer serviço de hospedagem estática — lembre-se de adicionar a URL de produção nas **Origens JavaScript autorizadas** do Client ID e configurar a variável de ambiente `VITE_GOOGLE_CLIENT_ID` no painel do serviço de hospedagem.

## Estrutura do projeto

```
src/
├── components/      Componentes de UI (Auth, Dashboard, TaskCard, Announcements, Filters, Layout)
├── hooks/            useAuth (login Google), useClassroom (busca/normalização), useTasks (filtros e estado local)
├── services/         classroomApi.ts — chamadas REST à Classroom API
├── utils/            dateUtils.ts (urgência/formatação de datas), taskUtils.ts (normalização)
├── data/             mockTasks.ts — dados mockados para desenvolvimento de UI
└── types/            interfaces TypeScript (dados normalizados e tipos brutos da API)
```

## Observações

- Os tokens de acesso e o cache de tarefas ficam salvos no `localStorage` do navegador.
- O checkbox "Concluído" e as anotações por tarefa são apenas locais (não são enviados ao Classroom).
- Se a sessão expirar, o app exibe um aviso e pede para fazer login novamente.
