import { ref, computed, watch } from 'vue'
import type { Word, Importance } from '../types'
import { loadJSON, saveJSON } from '../utils/storage'
import { newId } from '../utils/id'
import { STARTER_WORDS } from '../data/starterWords'

const STORAGE_KEY = 'words'

function clampImportance(v: unknown): Importance {
  const n = Number(v)
  return n === 1 || n === 2 || n === 3 ? (n as Importance) : 2
}

function mergeKey(word: string, meaning: string): string {
  return word.trim().normalize('NFC') + '|' + meaning.trim().normalize('NFC')
}

function seed(): Word[] {
  const now = Date.now()
  return STARTER_WORDS.map((s, i) => ({
    id: newId(),
    word: s.word,
    meaning: s.meaning,
    category: s.category,
    example: s.example,
    exampleTranslation: s.exampleTranslation,
    hanja: s.hanja,
    importance: s.importance,
    createdAt: now + i,
    updatedAt: now + i,
  }))
}

const initial = loadJSON<Word[]>(STORAGE_KEY, [])
const words = ref<Word[]>(initial.length === 0 ? seed() : initial)

if (initial.length === 0) saveJSON(STORAGE_KEY, words.value)

watch(words, (v) => saveJSON(STORAGE_KEY, v), { deep: true })

export function useWords() {
  const categories = computed(() => {
    const set = new Set<string>()
    for (const w of words.value) set.add(w.category)
    return Array.from(set).sort()
  })

  function add(input: Omit<Word, 'id' | 'createdAt' | 'updatedAt'>): Word {
    const now = Date.now()
    const w: Word = { ...input, id: newId(), createdAt: now, updatedAt: now }
    words.value = [w, ...words.value]
    return w
  }

  function update(id: string, patch: Partial<Omit<Word, 'id' | 'createdAt'>>) {
    const idx = words.value.findIndex((w) => w.id === id)
    if (idx === -1) return
    words.value[idx] = { ...words.value[idx], ...patch, updatedAt: Date.now() }
  }

  function remove(id: string) {
    words.value = words.value.filter((w) => w.id !== id)
  }

  function replaceAll(next: Word[]) {
    words.value = next
  }

  function resetToStarter() {
    words.value = seed()
  }

  function exportJSON(): string {
    return JSON.stringify(words.value, null, 2)
  }

  function importJSON(raw: string, mode: 'replace' | 'merge'): { added: number; total: number } {
    const parsed = JSON.parse(raw) as Word[]
    if (!Array.isArray(parsed)) throw new Error('JSON must be an array of words')
    const valid = parsed.filter((w) => typeof w?.word === 'string' && typeof w?.meaning === 'string')

    if (mode === 'replace') {
      const now = Date.now()
      const normalized: Word[] = valid.map((w, i) => ({
        id: w.id ?? newId(),
        word: w.word,
        meaning: w.meaning,
        category: w.category ?? '기타',
        example: w.example,
        exampleTranslation: w.exampleTranslation,
        hanja: w.hanja,
        importance: clampImportance(w.importance),
        createdAt: w.createdAt ?? now + i,
        updatedAt: w.updatedAt ?? now + i,
      }))
      words.value = normalized
      return { added: normalized.length, total: normalized.length }
    } else {
      const existing = new Map(words.value.map((w) => [mergeKey(w.word, w.meaning), w]))
      let added = 0
      const next = words.value.slice()
      const now = Date.now()
      for (let i = 0; i < valid.length; i++) {
        const w = valid[i]
        const key = mergeKey(w.word, w.meaning)
        if (existing.has(key)) continue
        existing.set(key, w as Word)
        next.push({
          id: newId(),
          word: w.word,
          meaning: w.meaning,
          category: w.category ?? '기타',
          example: w.example,
          exampleTranslation: w.exampleTranslation,
          hanja: w.hanja,
          importance: clampImportance(w.importance),
          createdAt: now + i,
          updatedAt: now + i,
        })
        added++
      }
      words.value = next
      return { added, total: next.length }
    }
  }

  return {
    words,
    categories,
    add,
    update,
    remove,
    replaceAll,
    resetToStarter,
    exportJSON,
    importJSON,
  }
}
