import { ref, watch } from 'vue'
import { loadJSON, saveJSON } from '../utils/storage'
import type { QuizResult } from '../types'

const STORAGE_KEY = 'results'
const MAX_RESULTS = 500

const results = ref<QuizResult[]>(loadJSON<QuizResult[]>(STORAGE_KEY, []))

watch(results, (v) => saveJSON(STORAGE_KEY, v), { deep: true })

export function useResults() {
  function record(r: QuizResult) {
    const next = results.value.slice()
    next.push(r)
    if (next.length > MAX_RESULTS) next.splice(0, next.length - MAX_RESULTS)
    results.value = next
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

  function clear() {
    results.value = []
  }

  return { results, record, statsByWord, clear }
}
