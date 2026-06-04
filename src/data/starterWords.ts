import type { Importance } from '../types'
import raw from './starterWords.json'

export type StarterWord = {
  word: string
  meaning: string
  category: string
  example?: string
  exampleTranslation?: string
  importance: Importance
}

export const STARTER_WORDS: StarterWord[] = raw as StarterWord[]
