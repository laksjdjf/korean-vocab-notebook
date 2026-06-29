import { ref, onMounted } from 'vue'
import { useSettings } from './useSettings'

const FEMALE_HINTS = ['heami', 'sun-hi', 'yuna', 'female', '여자', 'woman']
const MALE_HINTS = ['inho', 'male', '남자', 'man']

const voices = ref<SpeechSynthesisVoice[]>([])
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

function refreshVoices() {
  if (!supported) return
  voices.value = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ko'))
}

if (supported) {
  refreshVoices()
  window.speechSynthesis.onvoiceschanged = refreshVoices
}

function pickFemale(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (list.length === 0) return null
  for (const v of list) {
    const n = v.name.toLowerCase()
    if (FEMALE_HINTS.some((h) => n.includes(h))) return v
  }
  for (const v of list) {
    const n = v.name.toLowerCase()
    if (!MALE_HINTS.some((h) => n.includes(h))) return v
  }
  return list[0]
}

export function useSpeech() {
  const { settings } = useSettings()

  onMounted(() => {
    if (voices.value.length === 0) refreshVoices()
  })

  function currentVoice(): SpeechSynthesisVoice | null {
    if (!supported || voices.value.length === 0) return null
    if (settings.value.voiceName) {
      const found = voices.value.find((v) => v.name === settings.value.voiceName)
      if (found) return found
    }
    return pickFemale(voices.value)
  }

  function speak(text?: string) {
    if (!supported || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = currentVoice()
    if (v) {
      u.voice = v
      u.lang = v.lang
    } else {
      u.lang = 'ko-KR'
    }
    u.rate = 0.95
    u.pitch = 1.0
    window.speechSynthesis.speak(u)
  }

  function stop() {
    if (supported) window.speechSynthesis.cancel()
  }

  return { voices, supported, speak, stop, currentVoice }
}
