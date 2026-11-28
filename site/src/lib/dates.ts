// All dates are local calendar days as "YYYY-MM-DD"; `today` is always passed in so logic stays testable.
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const todayIso = () => iso(new Date())

/** Classroom gives due date + time in UTC (time defaults to 23:59 UTC); return the student's local day. */
export const utcDueToLocalDay = (d: { year: number; month: number; day: number }, t?: { hours?: number; minutes?: number }) =>
  iso(new Date(Date.UTC(d.year, d.month - 1, d.day, t ? (t.hours ?? 0) : 23, t ? (t.minutes ?? 0) : 59)))

export const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (s: string, n: number) => {
  const d = fromIso(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export const diffDays = (a: string, b: string) => Math.round((fromIso(a).getTime() - fromIso(b).getTime()) / 86400000)

export const weekdays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** Next date (after today) that falls on weekday index 0-6. */
export const nextWeekday = (today: string, wd: number) => {
  const cur = fromIso(today).getDay()
  return addDays(today, ((wd - cur + 7) % 7) || 7)
}

/** "25/11" or "25/11/2026" → ISO; a dd/mm already behind us by more than 60 days rolls to next year. */
export const parseDayMonth = (today: string, dd: number, mm: number, yyyy?: number) => {
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const ty = fromIso(today).getFullYear()
  let y = yyyy ? (yyyy < 100 ? 2000 + yyyy : yyyy) : ty
  let out = iso(new Date(y, mm - 1, dd))
  if (!yyyy && diffDays(out, today) < -60) out = iso(new Date(++y, mm - 1, dd))
  return out
}

const fmtShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
const fmtLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

export const shortDate = (s: string) => fmtShort.format(fromIso(s)).replace('.', '')
export const longDate = (s: string) => fmtLong.format(fromIso(s))

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" */
export const relDay = (s: string, today: string) => {
  const n = diffDays(s, today)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`
}

export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
