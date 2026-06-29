<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWords } from '../composables/useWords'
import { useSettings } from '../composables/useSettings'
import { useQuiz } from '../composables/useQuiz'
import { useSpeech } from '../composables/useSpeech'
import { useSrs } from '../composables/useSrs'
import { useUi } from '../composables/useUi'
import type { Importance, Settings } from '../types'
import { SKIP_ANSWER, isClozeable, type QuizChoice } from '../composables/useQuiz'

const { words, categories } = useWords()
const { settings } = useSettings()
const { current, currentIndex, total, score, wrongQuestions, start: startQuiz, answer, next: nextQuiz, restart, retryWrong, buildPool } = useQuiz()
const { speak, supported: speechSupported } = useSpeech()
const { dueWords, counts } = useSrs()
const { pendingReview } = useUi()

const dueList = computed(() => dueWords(words.value))
const srsCounts = computed(() => counts(words.value))

function startReview() {
  const due = dueList.value
  if (due.length === 0) return
  startQuiz({
    pool: words.value, // distractors drawn from the whole deck
    targets: due, // already ordered soonest-due first
    type: settings.value.quizType,
    direction: settings.value.quizDirection,
    count: settings.value.quizCount,
    prioritizeWeak: false,
  })
  picked.value = null
  showFeedback.value = false
  phase.value = 'play'
}

onMounted(() => {
  if (pendingReview.value) {
    pendingReview.value = false
    if (dueList.value.length > 0) startReview()
  }
})

const phase = ref<'setup' | 'play' | 'result'>('setup')
const filterCategories = ref<string[]>([])
const filterImportance = ref<Importance[]>([])
const showFeedback = ref(false)
const picked = ref<string | null>(null)

function toggleCat(c: string) {
  filterCategories.value = filterCategories.value.includes(c)
    ? filterCategories.value.filter((x) => x !== c)
    : [...filterCategories.value, c]
}

function toggleImp(i: Importance) {
  filterImportance.value = filterImportance.value.includes(i)
    ? filterImportance.value.filter((x) => x !== i)
    : [...filterImportance.value, i]
}

const pool = computed(() =>
  buildPool(words.value, {
    categories: filterCategories.value,
    importance: filterImportance.value,
  }),
)

const isCloze = computed(() => settings.value.quizType === 'cloze')

// For cloze, only words whose example contains them are usable.
const effectivePool = computed(() =>
  isCloze.value ? pool.value.filter(isClozeable) : pool.value,
)

const canStart = computed(() => effectivePool.value.length >= 4)

function start() {
  if (!canStart.value) return
  startQuiz({
    pool: pool.value,
    type: settings.value.quizType,
    direction: settings.value.quizDirection,
    count: settings.value.quizCount,
    prioritizeWeak: settings.value.prioritizeWeak,
  })
  picked.value = null
  showFeedback.value = false
  phase.value = 'play'
}

function pick(choice: QuizChoice) {
  if (showFeedback.value) return
  picked.value = choice.label
  showFeedback.value = true
  answer(choice.label)
}

function pass() {
  if (showFeedback.value) return
  picked.value = SKIP_ANSWER // counts as wrong; reveals the correct answer
  showFeedback.value = true
  answer(SKIP_ANSWER)
}

function pickedLabel(p: string | null) {
  return p === SKIP_ANSWER ? 'パス' : p
}

function next() {
  if (currentIndex.value >= total.value - 1) {
    nextQuiz()
    phase.value = 'result'
  } else {
    nextQuiz()
  }
  picked.value = null
  showFeedback.value = false
}

function abort() {
  if (!confirm('クイズを終了しますか？')) return
  restart()
  phase.value = 'setup'
}

function onRetryWrong() {
  retryWrong()
  picked.value = null
  showFeedback.value = false
  phase.value = 'play'
}

function backToSetup() {
  restart()
  phase.value = 'setup'
}

function stars(n: Importance) {
  return '★'.repeat(n) + '☆'.repeat(3 - n)
}

function choiceClass(choice: QuizChoice) {
  if (!showFeedback.value) return ''
  const q = current.value
  if (!q) return ''
  if (choice.label === q.answer) return 'correct'
  if (choice.label === picked.value) return 'wrong'
  return ''
}

function choiceDetail(choice: QuizChoice) {
  const q = current.value
  if (!q) return ''
  // cloze choices are Korean words → reveal their meanings after answering
  if (q.type === 'cloze') return choice.word.meaning
  return q.direction === 'ja-ko' ? choice.word.meaning : choice.word.word
}

const progressPct = computed(() =>
  total.value === 0 ? 0 : Math.round(((currentIndex.value + (showFeedback.value ? 1 : 0)) / total.value) * 100),
)

const scorePct = computed(() =>
  score.value.total === 0 ? 0 : Math.round((score.value.correct / score.value.total) * 100),
)

const directionOptions: { v: Settings['quizDirection']; label: string }[] = [
  { v: 'ko-ja', label: '韓国語 → 日本語' },
  { v: 'ja-ko', label: '日本語 → 韓国語' },
  { v: 'mixed', label: 'ミックス' },
]

const countOptions: Settings['quizCount'][] = [10, 20, 50, 'all']
</script>

<template>
  <section v-if="phase === 'setup'">
    <div class="card srs-card" style="margin-bottom:12px">
      <div class="srs-head">
        <h2 style="margin:0">🔁 今日の復習</h2>
        <span class="srs-due-badge" :class="{ zero: dueList.length === 0 }">{{ dueList.length }} 語</span>
      </div>
      <p class="example" style="margin:6px 0 12px">
        間隔反復で出題時期がきた単語です。
        <span v-if="srsCounts.new > 0">未学習 {{ srsCounts.new }} 語・</span>覚えた {{ srsCounts.mastered }} 語
      </p>
      <button class="btn" :disabled="dueList.length === 0" @click="startReview">
        {{ dueList.length === 0 ? '復習はありません' : '復習する' }}
      </button>
    </div>

    <div class="card">
      <h2 style="margin-top:0">クイズ設定</h2>

      <div class="toolbar" style="padding-top:0">
        <div class="group">
          <label>出題形式:</label>
          <button
            type="button"
            class="chip toggle"
            :class="{ active: settings.quizType === 'meaning' }"
            @click="settings.quizType = 'meaning'"
          >意味</button>
          <button
            type="button"
            class="chip toggle"
            :class="{ active: settings.quizType === 'cloze' }"
            @click="settings.quizType = 'cloze'"
          >穴埋め</button>
        </div>
      </div>

      <div v-if="!isCloze" class="toolbar" style="padding-top:0">
        <div class="group">
          <label>方向:</label>
          <button
            v-for="o in directionOptions"
            :key="o.v"
            type="button"
            class="chip toggle"
            :class="{ active: settings.quizDirection === o.v }"
            @click="settings.quizDirection = o.v"
          >{{ o.label }}</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="group">
          <label>問題数:</label>
          <button
            v-for="c in countOptions"
            :key="String(c)"
            type="button"
            class="chip toggle"
            :class="{ active: settings.quizCount === c }"
            @click="settings.quizCount = c"
          >{{ c === 'all' ? '全部' : c + '問' }}</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="group">
          <label>苦手優先:</label>
          <button
            type="button"
            class="chip toggle"
            :class="{ active: settings.prioritizeWeak }"
            @click="settings.prioritizeWeak = !settings.prioritizeWeak"
          >{{ settings.prioritizeWeak ? 'ON' : 'OFF' }}</button>
        </div>
      </div>

      <hr style="border:0;border-top:1px solid var(--border);margin:16px 0" />

      <div class="toolbar" style="padding-top:0">
        <div class="group">
          <label>カテゴリ(空=全部):</label>
          <button
            v-for="c in categories"
            :key="c"
            type="button"
            class="chip toggle"
            :class="{ active: filterCategories.includes(c) }"
            @click="toggleCat(c)"
          >{{ c }}</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="group">
          <label>重要度(空=全部):</label>
          <button
            v-for="i in [3,2,1] as Importance[]"
            :key="i"
            type="button"
            class="chip toggle"
            :class="{ active: filterImportance.includes(i) }"
            @click="toggleImp(i)"
          >{{ stars(i) }}</button>
        </div>
      </div>

      <p class="example">
        対象単語: {{ effectivePool.length }} 語
        <span v-if="isCloze">（例文がある語のみ）</span>
      </p>

      <button class="btn" :disabled="!canStart" @click="start">スタート</button>
      <span v-if="!canStart" class="example" style="margin-left:10px">最低4語必要です</span>
    </div>
  </section>

  <section v-else-if="phase === 'play' && current">
    <div class="card">
      <div class="progress">
        <span class="pct">{{ currentIndex + 1 }} / {{ total }}</span>
        <div class="bar"><div :style="{ width: progressPct + '%' }"></div></div>
      </div>

      <p v-if="current.type === 'cloze'" class="cloze-caption">( ⬚ ) に入る言葉は？</p>
      <div
        class="quiz-prompt"
        :class="{ ko: current.type !== 'cloze' && current.direction === 'ko-ja', cloze: current.type === 'cloze' }"
      >
        {{ current.prompt }}
        <button
          v-if="speechSupported && current.type !== 'cloze' && current.direction === 'ko-ja'"
          class="speak-btn"
          @click="speak(current.prompt)"
        >♪</button>
      </div>

      <div class="quiz-choices">
        <button
          v-for="c in current.choices"
          :key="c.word.id"
          class="quiz-choice"
          :class="choiceClass(c)"
          :disabled="showFeedback"
          @click="pick(c)"
        >
          <span class="quiz-choice-content">
            <span class="quiz-choice-label">{{ c.label }}</span>
            <span v-if="showFeedback" class="quiz-choice-detail">
              {{ choiceDetail(c) }}
            </span>
          </span>
        </button>
      </div>

      <button v-if="!showFeedback" class="btn ghost pass-btn" @click="pass">
        パス（わからない）
      </button>

      <div v-if="showFeedback" class="example" style="margin-top:16px">
        <span v-if="picked === SKIP_ANSWER" class="pass-tag">パス</span>
        <strong class="ko-word">{{ current.word.word }}</strong> — {{ current.word.meaning }}
        <div v-if="current.word.example">
          {{ current.word.example }}
          <button
            v-if="speechSupported"
            class="speak-btn"
            title="例文を再生"
            @click="speak(current.word.example)"
          >♪</button>
          <span v-if="current.word.exampleTranslation">／ {{ current.word.exampleTranslation }}</span>
        </div>
      </div>

      <div style="display:flex; gap:8px; justify-content:space-between; margin-top:16px">
        <button class="btn ghost" @click="abort">中断</button>
        <button class="btn" :disabled="!showFeedback" @click="next">
          {{ currentIndex >= total - 1 ? '結果へ' : '次へ' }}
        </button>
      </div>
    </div>
  </section>

  <section v-else-if="phase === 'result'">
    <div class="card" style="text-align:center">
      <h2 style="margin-top:0">結果</h2>
      <div class="score-circle" :style="{ '--pct': scorePct + '%' } as any">
        <div>{{ scorePct }}%</div>
      </div>
      <p style="font-size:18px;font-weight:600">
        {{ score.correct }} / {{ score.total }} 正解
      </p>

      <div v-if="wrongQuestions.length > 0" style="margin-top:16px;text-align:left">
        <h3 style="margin-bottom:8px">間違えた単語</h3>
        <ul style="padding-left:20px;line-height:1.7">
          <li v-for="x in wrongQuestions" :key="x.q.word.id">
            <strong class="ko-word">{{ x.q.word.word }}</strong> — {{ x.q.word.meaning }}
            <span class="example">（あなた: {{ pickedLabel(x.picked) }}）</span>
          </li>
        </ul>
      </div>

      <div style="display:flex;gap:8px;justify-content:center;margin-top:20px;flex-wrap:wrap">
        <button class="btn ghost" @click="backToSetup">設定に戻る</button>
        <button v-if="wrongQuestions.length > 0" class="btn" @click="onRetryWrong">
          間違えた単語だけ再挑戦
        </button>
      </div>
    </div>
  </section>

  <section v-else>
    <div class="empty">準備中…</div>
  </section>
</template>
