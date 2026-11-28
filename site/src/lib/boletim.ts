/**
 * Grade engine for the Lyceum report card: semester average, recovery and "how much is still needed".
 * Rules reproduced from the Lernpilot reference (public/notas.html), rewritten over this app's own types:
 *  - evaluation codes: P<n>_<sp> (provas), D<n>_<sp> (diversificadas), SM<n>_<sp> (Mitarbeit/participação),
 *    PA_<sp> (ponto adicional, a real component), PE_<sp> (ponto extra, bonus), R_<sp> (recuperação);
 *  - the school's formula comes with the data; PR/PS = mean of provas, DS = mean of D, SMS = mean of SM;
 *  - the portal creates spare template slots: only 3 diversificadas and 2 Mitarbeit really count;
 *  - recovery is capped at 6 and replaces the provas mean when higher;
 *  - year target: (sem1 + sem2) / 2 >= goal.
 */
import type { BoletimDisc, BoletimProva, SubjectSummary } from './types.ts'

type Mode = null | 'weight' | 'base'
const GROUPS: Record<string, string> = { PR: 'P', PS: 'P', DS: 'D', SMS: 'SM' }
const isEval = (code: string) => /^(P|D|SM)\d+_/.test(code)
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const expected = (prefix: string) => (prefix === 'D' ? 3 : prefix === 'SM' ? 2 : 99)

/** Graded and still-open evaluations of one group; `missing` ignores the portal's spare slots. */
export function groupInfo(provas: BoletimProva[], prefix: string, sp: string) {
  const re = new RegExp(`^${prefix}\\d+_${sp}$`)
  const mine = provas.filter((p) => re.test(p.code))
  const graded = mine.filter((p) => p.grade !== null).map((p) => p.grade!)
  const open = mine.filter((p) => p.grade === null)
  return { graded, open, missing: Math.min(open.length, Math.max(0, expected(prefix) - graded.length)) }
}

/** Evaluations that can still change the average. */
export const pending = (d: BoletimDisc, sp: string) =>
  ['P', 'D', 'SM'].flatMap((g) => {
    const gi = groupInfo(d.provas, g, sp)
    return gi.open.slice(0, gi.missing)
  })

function resolve(code: string, provas: BoletimProva[], sp: string, fill: number | null, mode: Mode, provasOverride: number | null): number | null {
  for (const [token, prefix] of Object.entries(GROUPS)) {
    if (code !== token + sp) continue
    if (provasOverride !== null && prefix === 'P') return mode === 'weight' ? 1 : provasOverride
    const gi = groupInfo(provas, prefix, sp)
    if (mode) return gi.graded.length ? (mode === 'weight' ? 1 : mean(gi.graded)) : null
    const vals = [...gi.graded, ...(fill !== null ? Array<number>(gi.missing).fill(fill) : [])]
    return vals.length ? mean(vals) : null
  }
  const p = provas.find((x) => x.code === code)
  if (!p) return null
  if (provasOverride !== null && /^P\d+_/.test(code)) return mode === 'weight' ? 1 : provasOverride
  if (mode) return (isEval(code) || /^PA_/.test(code)) && p.grade !== null ? (mode === 'weight' ? 1 : p.grade) : null
  // bonus points (PE/PA) are never assumed
  return p.grade === null && fill !== null && isEval(code) ? fill : p.grade
}

/** Evaluates the school's formula: + - * / ( ), numbers, MIN, MAX, ISNULL(x, ifNull, otherwise). Unknown/empty = 0. */
export function evalFormula(formula: string, provas: BoletimProva[], sp: string, fill: number | null = null, mode: Mode = null, provasOverride: number | null = null): number {
  const tokens = formula.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[-+*/(),]/g) ?? []
  let i = 0
  const z = (x: number | null) => x ?? 0
  const expr = (): number | null => {
    let v = term()
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++]
      const r = term()
      v = op === '+' ? z(v) + z(r) : z(v) - z(r)
    }
    return v
  }
  const term = (): number | null => {
    let v = factor()
    while (tokens[i] === '*' || tokens[i] === '/') {
      const op = tokens[i++]
      const r = factor()
      v = op === '*' ? z(v) * z(r) : z(v) / z(r)
    }
    return v
  }
  const factor = (): number | null => {
    const t = tokens[i++]
    if (t === undefined) return null
    if (t === '(') {
      const v = expr()
      if (tokens[i] === ')') i++
      return v
    }
    if (/^\d/.test(t)) return parseFloat(t)
    if (tokens[i] === '(') {
      i++
      const args: (number | null)[] = [expr()]
      while (tokens[i] === ',') {
        i++
        args.push(expr())
      }
      if (tokens[i] === ')') i++
      if (t === 'MIN') return Math.min(...args.map(z))
      if (t === 'MAX') return Math.max(...args.map(z))
      if (t === 'ISNULL') return args[0] === null ? z(args[1] ?? null) : z(args[2] ?? null)
      return z(args[0])
    }
    return resolve(t, provas, sp, fill, mode, provasOverride)
  }
  return z(expr())
}

/** The formula of a sub-period; when only the other one carries it, the same formula with the period swapped. */
export function formulaFor(d: BoletimDisc, sp: string): string | null {
  const own = d.provas.find((p) => p.formula && p.sp === sp)
  if (own) return own.formula!
  const any = d.provas.find((p) => p.formula)
  if (!any) return null
  const ref = any.sp || '1'
  if (ref === sp) return any.formula!
  return any.formula!.replace(new RegExp(`(PR|PS|DS|SMS)${ref}\\b`, 'g'), `$1${sp}`).replace(new RegExp(`([A-Z]+\\d*_)${ref}\\b`, 'g'), `$1${sp}`)
}

/** Honest partial average: only over what was already graded (weights renormalised); bonus points added on top. */
export function partialAverage(d: BoletimDisc, formula: string, sp: string, provasOverride: number | null = null): number | null {
  const weight = evalFormula(formula, d.provas, sp, null, 'weight', provasOverride)
  if (!weight) return null
  const base = evalFormula(formula, d.provas, sp, null, 'base', provasOverride)
  const bonus = evalFormula(formula, d.provas, sp, null, null, provasOverride) - base
  return Math.min(base / weight + bonus, 10)
}

const recovery = (d: BoletimDisc, sp: string) => d.provas.find((p) => p.code === `R_${sp}`)?.grade ?? null
export const provasMean = (d: BoletimDisc, sp: string) => {
  const g = groupInfo(d.provas, 'P', sp).graded
  return g.length ? mean(g) : null
}
const hasGraded = (d: BoletimDisc, sp: string) => d.provas.some((p) => p.sp === sp && p.grade !== null && isEval(p.code))

export type SemState = 'sem' | 'aprovado' | 'garantido' | 'precisa' | 'recuperado' | 'recuperacao' | 'impossivel' | 'andamento'
export type SemStatus = {
  media: number | null
  estado: SemState
  /** true when `media` is the school's closed average (not a partial or a simulation). */
  oficial: boolean
  precisa?: number
  max?: number
  rec?: number | null
  mediaOrig?: number
  mira?: 'ano' | 'sem'
  alvoSem?: number
  outro?: number | null
}

export function semesterStatus(d: BoletimDisc, sp: string, goal: number): SemStatus {
  const formula = formulaFor(d, sp)
  const official = d.official[sp] ?? null
  const media = official ?? (formula && hasGraded(d, sp) ? partialAverage(d, formula, sp) : null)
  const oficial = official !== null
  if (!formula) return { media, estado: 'sem', oficial }

  const laterGraded = d.provas.some((p) => Number(p.sp) > Number(sp) && p.grade !== null && isEval(p.code))
  const inProgress = pending(d, sp).length > 0 && official === null && !laterGraded && recovery(d, sp) === null
  if (!inProgress) {
    if (media === null) return { media: null, estado: 'sem', oficial }
    // recovery is triggered by the provas mean (< 6), capped at 6, and replaces that mean when higher
    const rec = recovery(d, sp)
    const pm = provasMean(d, sp)
    if (rec !== null && pm !== null && Math.min(rec, 6) > pm) {
      const nova = partialAverage(d, formula, sp, Math.min(rec, 6))!
      return { media: nova, mediaOrig: media, estado: nova >= goal ? 'recuperado' : 'recuperacao', rec, oficial }
    }
    return media >= goal ? { media, estado: 'aprovado', oficial } : { media, estado: 'recuperacao', rec, oficial }
  }

  // Passing the YEAR needs (sem1 + sem2) / 2 >= goal; only possible to aim at it once the other semester closed.
  const outro = d.official[sp === '1' ? '2' : '1'] ?? null
  const mira = outro !== null ? ('ano' as const) : ('sem' as const)
  const alvoSem = mira === 'ano' ? 2 * goal - outro! : goal
  const info = { mira, alvoSem, outro, oficial }

  // Trust the engine only if it reproduces the closed 1st-semester average from the same data.
  // (Unlike the reference, skipped when the 1st semester's evaluations are not in the data at all.)
  const f1 = formulaFor(d, '1')
  const of1 = d.official['1'] ?? null
  if (of1 !== null && f1 && hasGraded(d, '1') && Math.abs(evalFormula(f1, d.provas, '1') - of1) > 0.06) return { media, estado: 'andamento', ...info }

  if (evalFormula(formula, d.provas, sp, 0) >= alvoSem) return { media, estado: 'garantido', ...info }
  const max = evalFormula(formula, d.provas, sp, 10)
  if (max < alvoSem) return { media, estado: 'impossivel', max, rec: recovery(d, sp), ...info }
  let lo = 0
  let hi = 10
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2
    if (evalFormula(formula, d.provas, sp, mid) >= alvoSem) hi = mid
    else lo = mid
  }
  return { media, estado: 'precisa', precisa: Math.ceil((hi - 1e-9) * 100) / 100, ...info }
}

/** Year average: (1st + 2nd) / 2 once both closed (recovery included); otherwise an estimate over what exists. */
export function yearAverage(d: BoletimDisc, goal: number): { media: number | null; oficial: boolean } {
  const closed = (sp: string) => {
    const st = semesterStatus(d, sp, 6)
    return ['aprovado', 'recuperado', 'recuperacao'].includes(st.estado) ? st.media : null
  }
  const [a, b] = [closed('1'), closed('2')]
  if (a !== null && b !== null) return { media: (a + b) / 2, oficial: true }
  const xs = ['1', '2'].map((sp) => semesterStatus(d, sp, goal).media).filter((x): x is number => x !== null)
  return { media: xs.length ? mean(xs) : null, oficial: false }
}

/** Overlays grades the student typed (teacher handed it back, portal not updated). Never overrides an official grade. */
export const withSimulated = (boletim: BoletimDisc[], simulated: Record<string, number>): BoletimDisc[] =>
  boletim.map((d) => ({
    ...d,
    provas: d.provas.map((p) => {
      const v = simulated[`${d.id}|${p.code}`]
      return p.grade === null && v !== undefined ? { ...p, grade: v, simulated: true } : p
    }),
  }))

/** Disciplines worth showing: those with a formula or at least one grade. */
export const gradedSubjects = (boletim: BoletimDisc[]) => boletim.filter((d) => d.provas.some((p) => p.formula || p.grade !== null))

/** One line per discipline for the rest of the app (statistics, central): the current semester's average. */
export const subjectsFromBoletim = (boletim: BoletimDisc[]): SubjectSummary[] =>
  gradedSubjects(boletim).map((d) => {
    const st = semesterStatus(d, d.currentSp ?? '2', 6)
    return {
      subject: d.name,
      average: st.media,
      absences: d.attendance?.absences ?? null,
      status: null,
      lessonsPlanned: null,
      lessonsGiven: null,
      official: st.oficial,
      teacher: d.teacher,
      teacherId: d.teacherId,
    }
  })
