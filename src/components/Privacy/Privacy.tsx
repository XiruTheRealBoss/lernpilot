import { useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { useStudyStore } from '../../hooks/useStudy';
import { Logo } from '../Layout/Logo';

// Preencher antes de publicar: e-mail de quem responde pelo app (exigido pela LGPD/GDPR).
const CONTACT = '';

/** Apaga tudo que o app guardou neste aparelho e desconecta do Google. Não há dados nossos em servidor. */
export function deleteAllData() {
  if (!confirm('Apagar todos os seus dados do lernpilot neste aparelho? Isso não pode ser desfeito.')) return;
  googleLogout();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* armazenamento bloqueado: não há o que apagar */
  }
  location.replace(location.pathname);
}

export function PrivacyPolicy() {
  return (
    <article className="bg-card rounded-card shadow-card p-6 max-w-3xl mx-auto space-y-4 text-sm text-texto leading-relaxed">
      <h2 className="font-display text-xl font-bold">Privacidade</h2>
      <p>O lernpilot foi feito para estudantes, inclusive menores de idade. Por isso ele guarda o mínimo possível.</p>

      <h3 className="font-semibold">O que fica guardado e onde</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Tarefas marcadas como feitas, anotações, provas, conteúdos e perfis de professor ficam <b>só neste aparelho</b> (armazenamento do navegador). Não temos servidor de dados nem contas.</li>
        <li>Não usamos inteligência artificial, anúncios, cookies de rastreamento nem ferramentas de análise.</li>
      </ul>

      <h3 className="font-semibold">Google Classroom (opcional)</h3>
      <p>
        Se você conectar sua conta Google, o navegador busca suas turmas, tarefas e avisos <b>direto no Google</b>, só para leitura.
        A permissão fica salva neste aparelho e expira sozinha. O app não publica nada no Classroom.
      </p>

      <h3 className="font-semibold">Notas do Lyceum (opcional, Colégio Humboldt)</h3>
      <p>
        Para mostrar o boletim, seu usuário e senha do Lyceum passam pelo nosso servidor apenas para fazer o login no sistema da escola.
        <b> Não guardamos nem registramos sua senha.</b> A sessão da escola fica só nesta aba do navegador e some ao fechá-la.
        Notas digitadas à mão ficam só neste aparelho.
      </p>

      <h3 className="font-semibold">Menores de idade</h3>
      <p>Para quem tem menos de 18 anos, um responsável precisa autorizar o uso no primeiro acesso.</p>

      <h3 className="font-semibold">Apagar seus dados</h3>
      <p>Use o botão abaixo (ou "Apagar meus dados" no rodapé). Ele apaga tudo deste aparelho e desconecta do Google.</p>
      <button onClick={deleteAllData} className="text-sm font-semibold text-urgente border border-urgente/40 rounded-lg px-4 py-2 hover:bg-urgente/10">
        Apagar meus dados
      </button>
      {CONTACT && <p className="text-texto-suave">Dúvidas: {CONTACT}</p>}
    </article>
  );
}

/** Primeiro acesso: adulto confirma, ou um responsável autoriza o uso pelo aluno. */
export function ConsentGate() {
  const giveConsent = useStudyStore((s) => s.giveConsent);
  const [read, setRead] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  return (
    <div className="min-h-screen bg-fundo px-4 py-10 sm:py-16">
      <div className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Logo className="text-2xl" />
          <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight text-texto leading-[1.05] max-w-md">Seu piloto de estudos.</h1>
          <p className="text-lg text-texto-suave max-w-md">Lições do Classroom, provas marcadas e notas do Lyceum num lugar só. Tudo fica neste aparelho.</p>
        </div>

        <div className="bg-card rounded-card shadow-card p-7 space-y-5">
          <h2 className="text-lg font-bold text-texto">Antes de começar</h2>
          <label className="flex gap-3 text-sm text-texto cursor-pointer">
            <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="accent-primaria mt-0.5 h-4 w-4" />
            <span>
              Li e concordo com a{' '}
              <button type="button" onClick={() => setShowPolicy((v) => !v)} className="text-primaria font-bold underline underline-offset-2">
                política de privacidade
              </button>
              .
            </span>
          </label>
          <div className="space-y-2">
            <button disabled={!read} onClick={() => giveConsent('responsavel')} className="w-full font-bold text-white bg-primaria hover:bg-primaria/90 rounded-lg py-3 disabled:opacity-40 transition-colors">
              Sou o responsável e autorizo o aluno
            </button>
            <button disabled={!read} onClick={() => giveConsent('adulto')} className="w-full font-bold text-texto border border-borda hover:bg-fundo rounded-lg py-3 disabled:opacity-40 transition-colors">
              Tenho 18 anos ou mais
            </button>
          </div>
          <p className="text-sm text-texto-suave">Menor de 18 anos? Peça para seu pai, mãe ou responsável ler e tocar no primeiro botão.</p>
        </div>
      </div>
      {showPolicy && <div className="mt-10"><PrivacyPolicy /></div>}
    </div>
  );
}
