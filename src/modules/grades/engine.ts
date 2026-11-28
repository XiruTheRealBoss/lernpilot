/**
 * Extracted from the original Lyceum prototype, with strict input validation.
 * These school-specific rules are preserved for synthetic demonstrations only:
 * D=3, SM=2, scale 0–10, recovery capped at 6, two equally weighted semesters.
 * They are NOT confirmed rules for a school and must not be generalized.
 */
export type Semester = '1' | '2';
export type GradeOrigin = 'imported' | 'calculated' | 'simulated';
export type Component = 'weight' | 'base' | null;
type Group = 'P' | 'D' | 'SM';
interface Period { subPeriodo?: { codSubPeriodo?: string } }
export interface LegacyAssessment {
  codigoProva: string;
  nota?: string | number | null;
  nomeProva?: string;
  formulaNota?: string;
  periodo?: Period;
}
export interface LegacySubject {
  nomeDisciplina?: string;
  provas?: LegacyAssessment[];
  mediaSubperiodos?: { nota?: string | number | null; periodo?: Period }[];
}
export interface SemesterStatus {
  media: number | null;
  origin: GradeOrigin;
  estado: 'sem' | 'aprovado' | 'recuperacao' | 'recuperado' | 'andamento' | 'garantido' | 'impossivel' | 'precisa';
  mediaOrig?: number;
  rec?: number | null;
  mira?: 'ano' | 'sem';
  alvoSem?: number;
  mOutro?: number | null;
  max?: number;
  precisa?: number;
  projectionOrigin?: 'simulated';
}

export class GradeInputError extends Error {
  constructor(message: string) { super(message); this.name = 'GradeInputError'; }
}

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new GradeInputError('Das Ergebnis muss eine endliche Zahl sein.');
  return value;
}

/** Missing values stay missing. Invalid numeric input never becomes a grade. */
export function num(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return finite(value);
  if (typeof value !== 'string') throw new GradeInputError('Eine Zahl wird erwartet.');
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) throw new GradeInputError('Ungültige Zahl.');
  return finite(Number(normalized));
}

export function parseTarget(value: unknown): number {
  const result = num(value);
  if (result == null || result < 0 || result > 10) throw new GradeInputError('Das Demo-Ziel muss zwischen 0 und 10 liegen.');
  return result;
}

function assertSemester(value: string): asserts value is Semester {
  if (value !== '1' && value !== '2') throw new GradeInputError('Ungültiges Halbjahr.');
}

function expectedGroupSize(group: Group): number { return group === 'D' ? 3 : group === 'SM' ? 2 : 99; }

export function gradeInfo(assessments: LegacyAssessment[], group: Group, semester: Semester) {
  const pattern = new RegExp(`^${group}\\d+_${semester}$`);
  const graded: number[] = [];
  const empty: LegacyAssessment[] = [];
  for (const assessment of assessments.filter((item) => pattern.test(item.codigoProva))) {
    const value = num(assessment.nota);
    if (value == null) empty.push(assessment); else graded.push(value);
  }
  return { graded, empty, faltam: Math.min(empty.length, Math.max(0, expectedGroupSize(group) - graded.length)) };
}

export function pendentesReais(subject: LegacySubject, semester: Semester): LegacyAssessment[] {
  return (['P', 'D', 'SM'] as const).flatMap((group) => {
    const info = gradeInfo(subject.provas ?? [], group, semester);
    return info.empty.slice(0, info.faltam);
  });
}

function resolveCode(code: string, assessments: LegacyAssessment[], semester: Semester, fill: number | null, component: Component, recovery: number | null): number | null {
  const groups: Record<string, Group> = { PR: 'P', PS: 'P', DS: 'D', SMS: 'SM' };
  for (const [prefix, group] of Object.entries(groups)) {
    if (code !== prefix + semester) continue;
    if (recovery != null && (prefix === 'PR' || prefix === 'PS')) return component === 'weight' ? 1 : recovery;
    const info = gradeInfo(assessments, group, semester);
    if (component) {
      if (!info.graded.length) return null;
      return component === 'weight' ? 1 : finite(info.graded.reduce((sum, value) => sum + value, 0) / info.graded.length);
    }
    const values = [...info.graded];
    if (fill != null) for (let index = 0; index < info.faltam; index++) values.push(fill);
    return values.length ? finite(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  }
  const assessment = assessments.find((item) => item.codigoProva === code);
  if (!assessment) throw new GradeInputError(`Unbekanntes Formelelement: ${code}`);
  const value = num(assessment.nota);
  if (recovery != null && /^P\d+_/.test(code)) return component === 'weight' ? 1 : recovery;
  if (component) {
    if (!(/^(P|D|SM)\d+_/.test(code) || /^PA_/.test(code)) || value == null) return null;
    return component === 'weight' ? 1 : value;
  }
  return value == null && fill != null && /^(P|D|SM)\d+_/.test(code) ? fill : value;
}

/** Only arithmetic, existing assessment codes, MIN, MAX and ISNULL are allowed. */
export function evalFormula(formula: string, assessments: LegacyAssessment[], semester: Semester, fill: number | null = null, component: Component = null, recovery: number | null = null): number {
  assertSemester(semester);
  if (typeof formula !== 'string' || !formula.trim() || formula.length > 2048) throw new GradeInputError('Ungültige oder zu lange Formel.');
  if (fill != null) parseTarget(fill);
  if (recovery != null) parseTarget(recovery);
  let index = 0;
  let depth = 0;
  const zero = (value: number | null): number => value ?? 0;
  const whitespace = () => { while (index < formula.length && /\s/.test(formula[index])) index++; };
  const fail = (): never => { throw new GradeInputError(`Ungültige Formel an Position ${index + 1}.`); };

  function expression(): number | null {
    let value = term();
    while (true) {
      whitespace();
      const operator = formula[index];
      if (operator !== '+' && operator !== '-') return value;
      index++;
      const right = term();
      value = finite(operator === '+' ? zero(value) + zero(right) : zero(value) - zero(right));
    }
  }
  function term(): number | null {
    let value = factor();
    while (true) {
      whitespace();
      const operator = formula[index];
      if (operator !== '*' && operator !== '/') return value;
      index++;
      const right = zero(factor());
      if (operator === '/' && right === 0) throw new GradeInputError('Division durch null.');
      value = finite(operator === '*' ? zero(value) * right : zero(value) / right);
    }
  }
  function factor(): number | null {
    if (++depth > 64) throw new GradeInputError('Die Formel ist zu stark verschachtelt.');
    try {
      whitespace();
      if (index >= formula.length) return fail();
      if (formula[index] === '(') {
        index++;
        const value = expression();
        whitespace();
        if (formula[index++] !== ')') return fail();
        return value;
      }
      const rest = formula.slice(index);
      const numeric = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(rest);
      if (numeric) { index += numeric[0].length; return finite(Number(numeric[0])); }
      const identifier = /^[A-Za-z][A-Za-z0-9_]*/.exec(rest);
      if (!identifier) return fail();
      index += identifier[0].length;
      whitespace();
      if (formula[index] !== '(') return resolveCode(identifier[0], assessments, semester, fill, component, recovery);
      const name = identifier[0];
      if (!['MIN', 'MAX', 'ISNULL'].includes(name)) throw new GradeInputError(`Unbekannte Formelfunktion: ${name}`);
      index++;
      const args: (number | null)[] = [expression()];
      whitespace();
      while (formula[index] === ',') { index++; args.push(expression()); whitespace(); }
      if (formula[index++] !== ')') return fail();
      if (name === 'ISNULL') {
        if (args.length !== 3) throw new GradeInputError('ISNULL benötigt genau drei Argumente.');
        return args[0] == null ? args[1] : args[2];
      }
      return finite(name === 'MIN' ? Math.min(...args.map(zero)) : Math.max(...args.map(zero)));
    } finally { depth--; }
  }
  const value = expression();
  whitespace();
  if (index !== formula.length) fail();
  return finite(zero(value));
}

export function mediaOficial(subject: LegacySubject, semester: Semester): number | null {
  return num(subject.mediaSubperiodos?.find((item) => item.periodo?.subPeriodo?.codSubPeriodo === semester)?.nota);
}

export function formulaDoSub(subject: LegacySubject, semester: Semester): string | null {
  const direct = subject.provas?.find((item) => item.formulaNota && item.periodo?.subPeriodo?.codSubPeriodo === semester);
  if (direct?.formulaNota) return direct.formulaNota;
  const fallback = subject.provas?.find((item) => item.formulaNota);
  if (!fallback?.formulaNota) return null;
  const referenceSemester = fallback.periodo?.subPeriodo?.codSubPeriodo ?? '1';
  assertSemester(referenceSemester);
  if (referenceSemester === semester) return fallback.formulaNota;
  return fallback.formulaNota.replace(new RegExp(`(PR|PS|DS|SMS)${referenceSemester}\\b`, 'g'), `$1${semester}`)
    .replace(new RegExp(`([A-Z]+\\d*_)${referenceSemester}\\b`, 'g'), `$1${semester}`);
}

export function mediaParcial(subject: LegacySubject, formula: string, semester: Semester, recovery: number | null = null): number | null {
  const assessments = subject.provas ?? [];
  const weight = evalFormula(formula, assessments, semester, null, 'weight', recovery);
  if (!weight) return null;
  const base = evalFormula(formula, assessments, semester, null, 'base', recovery);
  const bonus = evalFormula(formula, assessments, semester, null, null, recovery) - base;
  return finite(Math.min(base / weight + bonus, 10));
}

function recoveryGrade(subject: LegacySubject, semester: Semester): number | null {
  return num(subject.provas?.find((item) => item.codigoProva === `R_${semester}`)?.nota);
}

export function provasMedia(subject: LegacySubject, semester: Semester): number | null {
  const info = gradeInfo(subject.provas ?? [], 'P', semester);
  return info.graded.length ? finite(info.graded.reduce((sum, value) => sum + value, 0) / info.graded.length) : null;
}

export function aplicaRec(subject: LegacySubject, formula: string, semester: Semester): { rec: number; aplica: boolean; nova?: number | null } | null {
  const rec = recoveryGrade(subject, semester);
  if (rec == null) return null;
  const average = provasMedia(subject, semester);
  const capped = Math.min(rec, 6);
  return average == null || capped <= average ? { rec, aplica: false } : { rec, aplica: true, nova: mediaParcial(subject, formula, semester, capped) };
}

export function statusSemestre(subject: LegacySubject, semester: Semester, target: number): SemesterStatus {
  parseTarget(target);
  const assessments = subject.provas ?? [];
  const formula = formulaDoSub(subject, semester);
  const imported = mediaOficial(subject, semester);
  const origin: GradeOrigin = imported != null ? 'imported' : 'calculated';
  const firstImported = mediaOficial(subject, '1');
  const firstFormula = formulaDoSub(subject, '1');
  const reliable = firstImported == null || !firstFormula || Math.abs(evalFormula(firstFormula, assessments, '1') - firstImported) <= 0.06;
  const laterGrade = assessments.some((item) => Number(item.periodo?.subPeriodo?.codSubPeriodo) > Number(semester) && num(item.nota) != null && /^(P|D|SM)\d+_/.test(item.codigoProva));
  const pending = pendentesReais(subject, semester).length > 0 && imported == null && !laterGrade && recoveryGrade(subject, semester) == null;
  const hasGraded = assessments.some((item) => item.periodo?.subPeriodo?.codSubPeriodo === semester && num(item.nota) != null && /^(P|D|SM)\d+_/.test(item.codigoProva));
  const average = imported ?? (formula && hasGraded ? mediaParcial(subject, formula, semester) : null);
  if (!formula) return { media: average, origin, estado: 'sem' };
  if (!pending) {
    if (average == null) return { media: null, origin, estado: 'sem' };
    const rec = aplicaRec(subject, formula, semester);
    if (rec?.aplica && rec.nova != null) return { media: rec.nova, mediaOrig: average, origin: 'calculated', estado: rec.nova >= target ? 'recuperado' : 'recuperacao', rec: rec.rec };
    return { media: average, origin, estado: average >= target ? 'aprovado' : 'recuperacao', rec: rec?.rec ?? recoveryGrade(subject, semester) };
  }
  const other = mediaOficial(subject, semester === '1' ? '2' : '1');
  const info = { mira: other != null ? 'ano' as const : 'sem' as const, alvoSem: other != null ? 2 * target - other : target, mOutro: other, projectionOrigin: 'simulated' as const };
  if (!reliable) return { media: average, origin, estado: 'andamento' };
  if (evalFormula(formula, assessments, semester, 0) >= info.alvoSem) return { media: average, origin, estado: 'garantido', ...info };
  const maximum = evalFormula(formula, assessments, semester, 10);
  if (maximum < info.alvoSem) return { media: average, origin, estado: 'impossivel', max: maximum, rec: recoveryGrade(subject, semester), ...info };
  let low = 0;
  let high = 10;
  // Preserved legacy simulation: same future grade in every remaining assessment.
  for (let count = 0; count < 40; count++) {
    const mid = (low + high) / 2;
    if (evalFormula(formula, assessments, semester, mid) >= info.alvoSem) high = mid; else low = mid;
  }
  return { media: average, origin, estado: 'precisa', precisa: Math.ceil((high - 1e-9) * 100) / 100, ...info };
}

export function mediaAnual(subject: LegacySubject, target: number): { media: number | null; origin: 'calculated'; complete: boolean } {
  parseTarget(target);
  const semesters = (['1', '2'] as const).map((semester) => statusSemestre(subject, semester, target));
  const complete = semesters.every((status) => ['aprovado', 'recuperado', 'recuperacao'].includes(status.estado));
  const values = semesters.map((status) => status.media).filter((value): value is number => value != null);
  return { media: values.length ? finite(values.reduce((sum, value) => sum + value, 0) / values.length) : null, origin: 'calculated', complete };
}
