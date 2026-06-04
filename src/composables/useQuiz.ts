import { ref, computed } from 'vue'
import type { Word, QuizDirection, Settings } from '../types'
import { shuffle } from '../utils/shuffle'
import { useResults } from './useResults'

export type QuizQuestion = {
  word: Word
  direction: QuizDirection
  prompt: string
  choices: string[]
  answer: string
}

export type QuizSetup = {
  pool: Word[]
  direction: Settings['quizDirection']
  count: Settings['quizCount']
  prioritizeWeak: boolean
}

function buildQuestion(target: Word, allPool: Word[], direction: QuizDirection): QuizQuestion {
  const prompt = direction === 'ko-ja' ? target.word : target.meaning
  const answer = direction === 'ko-ja' ? target.meaning : target.word

  const sameCat = allPool.filter((w) => w.id !== target.id && w.category === target.category)
  const others = allPool.filter((w) => w.id !== target.id && w.category !== target.category)

  const distractorPool: Word[] = []
  const seen = new Set<string>()
  const collect = (list: Word[]) => {
    for (const w of shuffle(list)) {
      const v = direction === 'ko-ja' ? w.meaning : w.word
      if (v === answer || seen.has(v)) continue
      seen.add(v)
      distractorPool.push(w)
      if (distractorPool.length >= 3) return
    }
  }
  collect(sameCat)
  if (distractorPool.length < 3) collect(others)

  const distractors = distractorPool.slice(0, 3).map((w) => (direction === 'ko-ja' ? w.meaning : w.word))
  const choices = shuffle([answer, ...distractors])
  return { word: target, direction, prompt, choices, answer }
}

export function useQuiz() {
  const { record, statsByWord } = useResults()
  const questions = ref<QuizQuestion[]>([])
  const currentIndex = ref(0)
  const userAnswers = ref<(string | null)[]>([])
  const finished = ref(false)
  const lastPool = ref<Word[]>([])

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const total = computed(() => questions.value.length)

  function start(setup: QuizSetup) {
    if (setup.pool.length < 2) {
      questions.value = []
      finished.value = true
      return
    }

    const stats = statsByWord()
    let ordered = setup.pool.slice()
    if (setup.prioritizeWeak) {
      ordered.sort((a, b) => {
        const sa = stats.get(a.id)
        const sb = stats.get(b.id)
        const ra = sa ? sa.correct / sa.total : 0.5
        const rb = sb ? sb.correct / sb.total : 0.5
        return ra - rb
      })
      const weak = ordered.slice(0, Math.ceil(ordered.length * 0.4))
      const rest = ordered.slice(Math.ceil(ordered.length * 0.4))
      ordered = [...shuffle(weak), ...shuffle(rest)]
    } else {
      ordered = shuffle(ordered)
    }

    const count = setup.count === 'all' ? ordered.length : Math.min(setup.count, ordered.length)
    const targets = ordered.slice(0, count)

    const dirFor = (): QuizDirection => {
      if (setup.direction === 'mixed') return Math.random() < 0.5 ? 'ko-ja' : 'ja-ko'
      return setup.direction
    }

    questions.value = targets.map((t) => buildQuestion(t, setup.pool, dirFor()))
    currentIndex.value = 0
    userAnswers.value = new Array(questions.value.length).fill(null)
    finished.value = false
    lastPool.value = setup.pool
  }

  function answer(choice: string) {
    const q = current.value
    if (!q || finished.value) return
    userAnswers.value[currentIndex.value] = choice
    record({
      wordId: q.word.id,
      correct: choice === q.answer,
      direction: q.direction,
      at: Date.now(),
    })
  }

  function next() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
    } else {
      finished.value = true
    }
  }

  function restart() {
    questions.value = []
    currentIndex.value = 0
    userAnswers.value = []
    finished.value = false
  }

  const score = computed(() => {
    let correct = 0
    for (let i = 0; i < questions.value.length; i++) {
      if (userAnswers.value[i] === questions.value[i].answer) correct++
    }
    return { correct, total: questions.value.length }
  })

  const wrongQuestions = computed(() =>
    questions.value
      .map((q, i) => ({ q, picked: userAnswers.value[i] }))
      .filter((x) => x.picked != null && x.picked !== x.q.answer),
  )

  function buildPool(allWords: Word[], filters: { categories: string[]; importance: number[] }) {
    return allWords.filter((w) => {
      if (filters.categories.length > 0 && !filters.categories.includes(w.category)) return false
      if (filters.importance.length > 0 && !filters.importance.includes(w.importance)) return false
      return true
    })
  }

  function retryWrong() {
    const wrong = wrongQuestions.value.map((x) => x.q)
    if (wrong.length < 1) return
    const pool = lastPool.value.length > 0 ? lastPool.value : wrong.map((q) => q.word)
    questions.value = wrong.map((q) => buildQuestion(q.word, pool, q.direction))
    currentIndex.value = 0
    userAnswers.value = new Array(questions.value.length).fill(null)
    finished.value = false
  }

  return {
    questions,
    current,
    currentIndex,
    total,
    finished,
    userAnswers,
    score,
    wrongQuestions,
    start,
    answer,
    next,
    restart,
    retryWrong,
    buildPool,
  }
}
