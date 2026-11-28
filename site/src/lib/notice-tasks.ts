/**
 * Finds homework hidden inside a teacher's free-text notice ("Pessoal, lista 3 para sexta").
 * Same rules as the Lernpilot reference: sentence must mention a task word, consequence sentences
 * ("quem não entregar perde nota") are skipped, at most 2 tasks per notice, near-equal titles deduplicated.
 */
import { addDays, fromIso, iso, nextWeekday, norm } from './dates.ts'

const WEEKDAYS: [string, number][] = [['domingo', 0], ['segunda', 1], ['terca', 2], ['quarta', 3], ['quinta', 4], ['sexta', 5], ['sabado', 6]]
const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// tested on accent-free lowercase text
const TASK_WORDS = /\blicao\b|exercicios?\b|\batividade\b|\btrabalho\b|\btarefa\b|redacao|\blista de\b|relatorio|\bpesquisa\b|\bprojeto\b|\bprova\b|\bteste\b|\bentregar?\b|\bprazo\b|\bresolver\b|\bresponder\b|\btrazer\b|\bestud[ae]r\b/
const CONSEQUENCE = /^quem\s|^se\s|^caso\s|perde\s+(nota|ponto)|sera\s+descontado|ficara\s+sem\s+nota/

/** A date mentioned in pt-BR text, as a local YYYY-MM-DD; null when there is none. */
export function dateInText(text: string, today: string): string | null {
  const t = norm(text)
  if (/depois\s+de\s+amanha/.test(t)) return addDays(today, 2)
  if (/\bamanha\b/.test(t)) return addDays(today, 1)
  if (/\bhoje\b/.test(t)) return today
  if (/\bproxima\s+semana\b/.test(t)) return addDays(today, 7)
  for (const [name, wd] of WEEKDAYS) if (new RegExp(`\\b${name}\\b`).test(t)) return nextWeekday(today, wd)
  const year = fromIso(today).getFullYear()
  const dm = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(t)
  if (dm) {
    const y = dm[3] ? (+dm[3] < 100 ? 2000 + +dm[3] : +dm[3]) : year
    if (+dm[2] >= 1 && +dm[2] <= 12 && +dm[1] >= 1 && +dm[1] <= 31) return iso(new Date(y, +dm[2] - 1, +dm[1]))
  }
  for (let m = 0; m < 12; m++) {
    const hit = new RegExp(`(\\d{1,2})\\s+de\\s+${MONTHS[m]}`).exec(t)
    if (hit) return iso(new Date(year, m, +hit[1]))
  }
  const dia = /\bdia\s+(\d{1,2})\b/.exec(t)
  if (dia) {
    const d = new Date(year, fromIso(today).getMonth(), +dia[1])
    if (iso(d) < today) d.setMonth(d.getMonth() + 1)
    return iso(d)
  }
  return null
}

const titleOf = (sentence: string) => {
  const s = sentence
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(pessoal|turma|gente|galera|atenção turma|atenção|lembrete)[,!:]?\s*/i, '')
    .replace(/^(não esqueçam?|lembrem|lembra)[^:]*:\s*/i, '')
  const t = s.charAt(0).toUpperCase() + s.slice(1)
  return t.length > 80 ? `${t.slice(0, 77)}...` : t
}

export function tasksInNotice(text: string, today: string): { title: string; description: string; due: string | null }[] {
  const out: { title: string; description: string; due: string | null }[] = []
  const seen = new Set<string>()
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim())) {
    if (sentence.length <= 15) continue
    const n = norm(sentence)
    if (!TASK_WORDS.test(n) || CONSEQUENCE.test(n)) continue
    const title = titleOf(sentence)
    const key = norm(title).slice(0, 30)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title, description: sentence, due: dateInText(sentence, today) ?? dateInText(text, today) })
    if (out.length >= 2) break
  }
  return out
}
