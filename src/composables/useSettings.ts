import { ref, watch } from 'vue'
import { loadJSON, saveJSON } from '../utils/storage'
import { DEFAULT_SETTINGS, type Settings } from '../types'

const STORAGE_KEY = 'settings'

const settings = ref<Settings>({
  ...DEFAULT_SETTINGS,
  ...loadJSON<Partial<Settings>>(STORAGE_KEY, {}),
})

watch(settings, (v) => saveJSON(STORAGE_KEY, v), { deep: true })

export function useSettings() {
  return { settings }
}
