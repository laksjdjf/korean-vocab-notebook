import { ref } from 'vue'

/** Set when another view wants the Quiz tab to auto-start an SRS review. */
const pendingReview = ref(false)

export function useUi() {
  return { pendingReview }
}
