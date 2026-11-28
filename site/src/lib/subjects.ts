import { norm } from './dates.ts'

/** Canonical subject → words that point to it (already accent-free, lowercase). */
// Includes the German names used in bilingual schools ("Física / Physik").
const ALIASES: Record<string, string[]> = {
  Matemática: ['matematica', 'mat', 'algebra', 'geometria', 'mathematik', 'mathe'],
  Português: ['portugues', 'port', 'lingua portuguesa', 'gramatica'],
  Redação: ['redacao'],
  Literatura: ['literatura', 'lit'],
  História: ['historia', 'hist', 'geschichte'],
  Geografia: ['geografia', 'geo', 'geographie', 'erdkunde'],
  Biologia: ['biologia', 'bio', 'biologie'],
  Química: ['quimica', 'qui', 'chemie'],
  Física: ['fisica', 'fis', 'physik'],
  Inglês: ['ingles', 'english', 'lingua inglesa', 'englisch'],
  Alemão: ['alemao', 'deutsch', 'lingua alema'],
  Espanhol: ['espanhol'],
  Filosofia: ['filosofia', 'filo', 'philosophie'],
  Sociologia: ['sociologia', 'socio'],
  Artes: ['artes', 'arte', 'kunst'],
  Música: ['musica', 'musik'],
  'Educação Física': ['educacao fisica', 'ed fisica', 'ed. fisica', 'sport'],
  Ciências: ['ciencias'],
}

const wordRe = (w: string) => new RegExp(`(^|[^a-z])${w.replace(/[.]/g, '\\.')}([^a-z]|$)`)

/** Finds a subject in free text. `known` (subjects already in the student's data) win over the built-in list. */
export const findSubject = (text: string, known: string[] = []): string | null => {
  const t = norm(text)
  for (const k of known) if (wordRe(norm(k)).test(t)) return k
  // longer aliases first so "educacao fisica" beats "fisica"
  const pairs = Object.entries(ALIASES).flatMap(([s, ws]) => ws.map((w) => [s, w] as const))
  pairs.sort((a, b) => b[1].length - a[1].length)
  for (const [s, w] of pairs) {
    // 3-letter short forms only count as whole words, to avoid "mat" in "material"
    if (wordRe(w).test(t)) return known.find((k) => norm(k) === norm(s)) ?? s
  }
  return null
}
