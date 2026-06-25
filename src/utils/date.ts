export const DAY_MS = 86400000

/** Local-time day key, e.g. "2026-06-25". */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Day key offset by `n` days from `ts` (negative = past). */
export function dayKeyOffset(n: number, ts: number = Date.now()): string {
  return dayKey(ts + n * DAY_MS)
}

/** "6/25" style short label for charts. */
export function shortDayLabel(key: string): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}
