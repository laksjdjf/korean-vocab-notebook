export type Importance = 1 | 2 | 3

export type Word = {
  id: string
  word: string
  meaning: string
  category: string
  example?: string
  exampleTranslation?: string
  hanja?: string
  importance: Importance
  createdAt: number
  updatedAt: number
}

export type QuizDirection = 'ko-ja' | 'ja-ko'

export type QuizResult = {
  wordId: string
  correct: boolean
  direction: QuizDirection
  at: number
}

export type RedactKey = 'word' | 'meaning' | 'example'

export type Settings = {
  redactedColumns: RedactKey[]
  quizDirection: QuizDirection | 'mixed'
  quizCount: 10 | 20 | 50 | 'all'
  prioritizeWeak: boolean
  voiceName: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  redactedColumns: [],
  quizDirection: 'ko-ja',
  quizCount: 10,
  prioritizeWeak: false,
  voiceName: null,
}
