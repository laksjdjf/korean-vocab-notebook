import { ref, watch } from 'vue'
import { loadJSON, saveJSON } from '../utils/storage'
import { dayKey, dayKeyOffset } from '../utils/date'
import type { DailyStat, QuizResult } from '../types'

const STORAGE_KEY = 'results'
const DAILY_KEY = 'daily'
const MAX_RESULTS = 500

const results = ref<QuizResult[]>(loadJSON<QuizResult[]>(STORAGE_KEY, []))
// Durable, append-only per-day tally. Unlike `results` it is never capped,
// so streak / lifetime stats stay accurate over the long term.
const daily = ref<Record<string, DailyStat>>(loadJSON<Record<string, DailyStat>>(DAILY_KEY, {}))

watch(results, (v) => saveJSON(STORAGE_KEY, v), { deep: true })
watch(daily, (v) => saveJSON(DAILY_KEY, v), { deep: true })

export function useResults() {
  function record(r: QuizResult) {
    const next = results.value.slice()
    next.push(r)
    if (next.length > MAX_RESULTS) next.splice(0, next.length - MAX_RESULTS)
    results.value = next

    const key = dayKey(r.at)
    const cur = daily.value[key] ?? { answered: 0, correct: 0 }
    daily.value = {
      ...daily.value,
      [key]: { answered: cur.answered + 1, correct: cur.correct + (r.correct ? 1 : 0) },
    }
  }

  function statsByWord() {
    const m = new Map<string, { correct: number; total: number }>()
    for (const r of results.value) {
      const cur = m.get(r.wordId) ?? { correct: 0, total: 0 }
      cur.total++
      if (r.correct) cur.correct++
      m.set(r.wordId, cur)
    }
    return m
  }

  /** Consecutive days (ending today or yesterday) with at least one answer. */
  function streak(now: number = Date.now()): number {
    let n = 0
    // Allow the streak to "survive" today not yet being studied.
    let start = daily.value[dayKey(now)] ? 0 : 1
    if (start === 1 && !daily.value[dayKeyOffset(-1, now)]) return 0
    for (let i = start; ; i++) {
      if (daily.value[dayKeyOffset(-i, now)]) n++
      else break
    }
    return n
  }

  /** Last `days` days of activity, oldest first. */
  function recent(days: number, now: number = Date.now()) {
    const out: { key: string; answered: number; correct: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const key = dayKeyOffset(-i, now)
      const d = daily.value[key] ?? { answered: 0, correct: 0 }
      out.push({ key, answered: d.answered, correct: d.correct })
    }
    return out
  }

  function lifetime() {
    let answered = 0, correct = 0, days = 0
    for (const k in daily.value) {
      answered += daily.value[k].answered
      correct += daily.value[k].correct
      days++
    }
    return { answered, correct, days, accuracy: answered ? correct / answered : 0 }
  }

  function clear() {
    results.value = []
    daily.value = {}
  }

  return { results, daily, record, statsByWord, streak, recent, lifetime, clear }
}
