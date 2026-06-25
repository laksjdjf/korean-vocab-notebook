import { ref, watch } from 'vue'
import { loadJSON, saveJSON } from '../utils/storage'
import { DAY_MS } from '../utils/date'
import type { SrsCard, SrsStatus, Word } from '../types'

const STORAGE_KEY = 'srs'

/** Interval (days) at/above which a word counts as "覚えた" (mastered). */
export const MASTER_INTERVAL = 21

const cards = ref<Record<string, SrsCard>>(loadJSON<Record<string, SrsCard>>(STORAGE_KEY, {}))
watch(cards, (v) => saveJSON(STORAGE_KEY, v), { deep: true })

/** Simplified SM-2 scheduling driven by binary correct/wrong answers. */
function schedule(prev: SrsCard | undefined, correct: boolean, at: number): SrsCard {
  const ease = prev?.ease ?? 2.5
  if (!correct) {
    return {
      reps: 0,
      interval: 0,
      ease: Math.max(1.3, ease - 0.2),
      due: at, // stays due today for re-study
      lapses: (prev?.lapses ?? 0) + 1,
      lastReviewed: at,
    }
  }
  const reps = (prev?.reps ?? 0) + 1
  let interval: number
  if (reps === 1) interval = 1
  else if (reps === 2) interval = 3
  else interval = Math.max(1, Math.round((prev?.interval || 3) * ease))
  return {
    reps,
    interval,
    ease,
    due: at + interval * DAY_MS,
    lapses: prev?.lapses ?? 0,
    lastReviewed: at,
  }
}

export function useSrs() {
  function review(wordId: string, correct: boolean, at: number = Date.now()) {
    cards.value = { ...cards.value, [wordId]: schedule(cards.value[wordId], correct, at) }
  }

  function statusOf(wordId: string): SrsStatus {
    const c = cards.value[wordId]
    if (!c) return 'new'
    return c.interval >= MASTER_INTERVAL ? 'mastered' : 'learning'
  }

  /** Studied words whose due date has passed, soonest-due first. */
  function dueWords(words: Word[], at: number = Date.now()): Word[] {
    return words
      .filter((w) => {
        const c = cards.value[w.id]
        return c != null && c.due <= at
      })
      .sort((a, b) => (cards.value[a.id]!.due) - (cards.value[b.id]!.due))
  }

  function counts(words: Word[], at: number = Date.now()) {
    let neu = 0, learning = 0, mastered = 0, due = 0
    for (const w of words) {
      const c = cards.value[w.id]
      if (!c) { neu++; continue }
      if (c.interval >= MASTER_INTERVAL) mastered++
      else learning++
      if (c.due <= at) due++
    }
    return { new: neu, learning, mastered, due, studied: learning + mastered }
  }

  function reset() {
    cards.value = {}
  }

  return { cards, review, statusOf, dueWords, counts, reset }
}
