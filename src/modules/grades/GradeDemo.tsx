import { useState, type FormEvent } from 'react';
import { mediaAnual, num, parseTarget, statusSemestre, type LegacySubject, type Semester } from './engine';

const makeDemoSubjects = (): LegacySubject[] => [{
  nomeDisciplina: 'Matemática · exemplo fictício',
  provas: [
    { codigoProva: 'P1_1', nomeProva: 'Prova A', nota: 6, periodo: { subPeriodo: { codSubPeriodo: '1' } }, formulaNota: '(PR1+DS1)/2' },
    { codigoProva: 'D1_1', nomeProva: 'Atividade A', nota: 8, periodo: { subPeriodo: { codSubPeriodo: '1' } } },
    { codigoProva: 'P1_2', nomeProva: 'Prova B', nota: 4, periodo: { subPeriodo: { codSubPeriodo: '2' } }, formulaNota: '(PR2+DS2)/2' },
    { codigoProva: 'P2_2', nomeProva: 'Prova C', nota: null, periodo: { subPeriodo: { codSubPeriodo: '2' } } },
    { codigoProva: 'D1_2', nomeProva: 'Atividade B', nota: 6, periodo: { subPeriodo: { codSubPeriodo: '2' } } },
  ],
  mediaSubperiodos: [{ nota: 7, periodo: { subPeriodo: { codSubPeriodo: '1' } } }],
}];

const format = (value: number | null): string => value == null ? 'Sem nota' : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const originLabel = { imported: 'Valor importado de exemplo (fictício)', calculated: 'Valor calculado', simulated: 'Simulação' };

/** No network or browser persistence: only synthetic examples, reset on remount. */
export function GradeDemo() {
  const [subjects, setSubjects] = useState(makeDemoSubjects);
  const [semester, setSemester] = useState<Semester | 'ano'>('2');
  const [target, setTarget] = useState(6);
  const [targetDraft, setTargetDraft] = useState('6');
  const [error, setError] = useState<string | null>(null);
  const [manualDraft, setManualDraft] = useState('');

  const saveTarget = (event: FormEvent) => {
    event.preventDefault();
    try { setTarget(parseTarget(targetDraft)); setError(null); }
    catch { setError('Meta inválida: digite um número entre 0 e 10.'); }
  };

  const saveManualDemoGrade = (event: FormEvent) => {
    event.preventDefault();
    try {
      const value = manualDraft.trim() === '' ? null : parseTarget(manualDraft);
      setSubjects((previous) => previous.map((subject) => ({
        ...subject,
        provas: subject.provas?.map((assessment) => assessment.codigoProva === 'P2_2' ? { ...assessment, nota: value } : assessment),
      })));
      setError(null);
    } catch { setError('Nota inválida: digite um número entre 0 e 10.'); }
  };

  return (
    <section className="space-y-4" aria-labelledby="grade-demo-title">
      <div className="bg-card rounded-card shadow-card p-5 space-y-2">
        <h1 id="grade-demo-title" className="text-xl font-bold text-texto">Notas · demonstração isolada</h1>
        <p className="text-sm text-texto-suave">Login do Lyceum desativado. Não digite dados reais. Todos os valores são fictícios e ficam apenas na memória desta página.</p>
        <p className="text-sm text-texto-suave">As regras do protótipo foram preservadas para testes; ainda não são regras confirmadas de uma escola. Isto não é um boletim oficial.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-2" role="group" aria-label="Período das notas">
          {(['1', '2', 'ano'] as const).map((period) => (
            <button key={period} aria-pressed={semester === period} onClick={() => setSemester(period)} className={`rounded-lg border px-3 py-2 text-sm ${semester === period ? 'bg-primaria text-white' : 'bg-card text-texto border-borda'}`}>
              {period === 'ano' ? 'Ano' : `${period}º semestre`}
            </button>
          ))}
        </div>
        <form onSubmit={saveTarget} className="flex items-end gap-2">
          <label className="text-sm text-texto">Meta da simulação (0–10)
            <input aria-label="Meta da simulação" inputMode="decimal" value={targetDraft} onChange={(event) => setTargetDraft(event.target.value)} className="block w-28 rounded-lg border border-borda bg-card px-3 py-2" />
          </label>
          <button className="rounded-lg bg-primaria text-white px-3 py-2 text-sm" type="submit">Aplicar meta</button>
        </form>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}

      {subjects.map((subject) => {
        const annual = mediaAnual(subject, target);
        const current = semester === 'ano' ? null : statusSemestre(subject, semester, target);
        return (
          <article key={subject.nomeDisciplina} className="bg-card rounded-card shadow-card p-5 space-y-3">
            <h2 className="font-bold text-texto">{subject.nomeDisciplina}</h2>
            {current ? (
              <>
                <p className="text-xl font-semibold text-texto">{format(current.media)}</p>
                <p className="text-sm text-texto-suave">{originLabel[current.origin]} · meta escolhida: {format(target)}</p>
                {current.projectionOrigin && <p className="text-sm text-texto">Simulação: {current.estado === 'precisa' ? `a mesma nota ${format(current.precisa ?? null)} em cada avaliação pendente atingiria a meta.` : current.estado === 'garantido' ? 'a meta é atingida mesmo com zero nas avaliações pendentes.' : 'a meta não é atingida pelo cenário máximo deste exemplo.'}</p>}
                <ul className="space-y-1 text-sm text-texto">
                  {subject.provas?.filter((assessment) => assessment.periodo?.subPeriodo?.codSubPeriodo === semester).map((assessment) => <li key={assessment.codigoProva}>{assessment.nomeProva}: {format(num(assessment.nota))}</li>)}
                </ul>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-texto">{format(annual.media)}</p>
                <p className="text-sm text-texto-suave">Valor calculado · {annual.complete ? 'dois semestres concluídos no exemplo' : 'estimativa parcial, sem previsão de aprovação'}</p>
                <ul className="text-sm text-texto">
                  {(['1', '2'] as const).map((period) => <li key={period}>{period}º semestre: {format(statusSemestre(subject, period, target).media)}</li>)}
                </ul>
              </>
            )}
          </article>
        );
      })}

      <form onSubmit={saveManualDemoGrade} className="bg-card rounded-card shadow-card p-5 flex flex-wrap gap-3 items-end">
        <label className="text-sm text-texto">Nota fictícia da Prova C (vazio remove)
          <input aria-label="Nota fictícia da Prova C" inputMode="decimal" value={manualDraft} onChange={(event) => setManualDraft(event.target.value)} className="block mt-1 w-32 rounded-lg border border-borda bg-card px-3 py-2" />
        </label>
        <button type="submit" className="rounded-lg bg-primaria text-white px-3 py-2 text-sm">Aplicar exemplo</button>
        <p className="w-full text-xs text-texto-suave">A alteração é manual e fictícia; os resultados derivados continuam identificados como calculados ou simulados. Nenhum valor é enviado ou salvo.</p>
      </form>
    </section>
  );
}
