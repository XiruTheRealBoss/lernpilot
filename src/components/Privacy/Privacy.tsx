import { clearDemoProfile, removeLegacyData } from '../../infrastructure/profileStorage';

export function deleteAllData() {
  if (!confirm('Apagar os dados fictícios deste perfil? O outro perfil será mantido.')) return;
  clearDemoProfile();
  location.reload();
}

export function PrivacyPolicy() {
  return (
    <article className="bg-card rounded-card shadow-card p-6 max-w-3xl mx-auto space-y-4 text-sm text-texto leading-relaxed">
      <h2 className="font-bold text-xl">Privacidade na demonstração</h2>
      <p>Esta fase é somente para desenvolvimento com dados fictícios. Não insira nomes reais, notas de alunos ou credenciais.</p>
      <p>Google, Lyceum e demais provedores estão desativados. Não há IA, analytics ou banco de dados produtivo. As fontes são locais ao dispositivo.</p>
      <p>Provas, anotações, perfis fictícios e preferências ficam neste navegador, separados entre Demo A e Demo B. Isso não é autenticação: quem usa este navegador pode abrir ambos os perfis.</p>
      <p>Com armazenamento bloqueado, os dados permanecem apenas durante esta sessão. Notas demonstrativas não são persistidas.</p>
      <p>Dados antigos não são importados. Credenciais antigas conhecidas são removidas ao iniciar; o descarte local não revoga permissões concedidas a provedores.</p>
      <button onClick={deleteAllData} className="font-semibold text-urgente border rounded-lg p-2">Apagar dados deste perfil</button>
      <p>Se este navegador foi usado com a versão antiga, você pode remover apenas os dados antigos conhecidos do LernPilot. Dados de outros aplicativos serão mantidos.</p>
      <button onClick={() => {
        if (confirm('Remover os dados locais da versão antiga do LernPilot?')) { removeLegacyData(); location.reload(); }
      }} className="font-semibold text-urgente border rounded-lg p-2">Remover dados da versão antiga</button>
      <p>Antes de qualquer uso real, a equipe ainda precisa definir responsáveis, contato, consentimento quando aplicável, retenção, exclusão e controles de acesso. Esta tela não comprova autorização para dados reais.</p>
    </article>
  );
}
