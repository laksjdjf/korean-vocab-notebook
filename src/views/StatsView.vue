<script setup lang="ts">
import { computed } from 'vue'
import { useWords } from '../composables/useWords'
import { useResults } from '../composables/useResults'
import { useSrs } from '../composables/useSrs'
import { useUi } from '../composables/useUi'
import { shortDayLabel } from '../utils/date'

const emit = defineEmits<{ (e: 'navigate', tab: 'quiz'): void }>()

const { words } = useWords()
const { streak, recent, lifetime } = useResults()
const { counts, statusOf } = useSrs()
const { pendingReview } = useUi()

const srs = computed(() => counts(words.value))
const life = computed(() => lifetime())
const days7 = computed(() => recent(7))
const maxAnswered = computed(() => Math.max(1, ...days7.value.map((d) => d.answered)))
const currentStreak = computed(() => streak())

const masteredPct = computed(() =>
  words.value.length ? Math.round((srs.value.mastered / words.value.length) * 100) : 0,
)
const accuracyPct = computed(() => Math.round(life.value.accuracy * 100))

type CatStat = { category: string; total: number; mastered: number; learning: number }
const byCategory = computed<CatStat[]>(() => {
  const m = new Map<string, CatStat>()
  for (const w of words.value) {
    const c = m.get(w.category) ?? { category: w.category, total: 0, mastered: 0, learning: 0 }
    c.total++
    const s = statusOf(w.id)
    if (s === 'mastered') c.mastered++
    else if (s === 'learning') c.learning++
    m.set(w.category, c)
  }
  return Array.from(m.values()).sort(
    (a, b) => b.mastered / b.total - a.mastered / a.total || b.total - a.total,
  )
})

function goReview() {
  pendingReview.value = true
  emit('navigate', 'quiz')
}
</script>

<template>
  <section>
    <div class="stat-grid">
      <div class="card stat-tile">
        <div class="stat-num">{{ currentStreak }}<span class="stat-unit">日</span></div>
        <div class="stat-label">🔥 連続学習</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-num">{{ srs.studied }}<span class="stat-unit">/ {{ words.length }}</span></div>
        <div class="stat-label">📚 学習した単語</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-num">{{ srs.mastered }}</div>
        <div class="stat-label">✅ 覚えた単語</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-num">{{ accuracyPct }}<span class="stat-unit">%</span></div>
        <div class="stat-label">🎯 通算正答率</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="srs-head">
        <h2 style="margin:0">🔁 今日の復習</h2>
        <span class="srs-due-badge" :class="{ zero: srs.due === 0 }">{{ srs.due }} 語</span>
      </div>
      <p class="example" style="margin:6px 0 12px">未学習 {{ srs.new }} 語・学習中 {{ srs.learning }} 語</p>
      <button class="btn" :disabled="srs.due === 0" @click="goReview">
        {{ srs.due === 0 ? '復習はありません' : '復習する' }}
      </button>
    </div>

    <div class="card" style="margin-top:12px">
      <h2 style="margin-top:0">習得の進み具合</h2>
      <div class="mastery-bar">
        <div class="mastery-fill" :style="{ width: masteredPct + '%' }"></div>
      </div>
      <p class="example" style="margin-top:8px">
        全 {{ words.length }} 語中 {{ srs.mastered }} 語をマスター（{{ masteredPct }}%）
      </p>
    </div>

    <div class="card" style="margin-top:12px">
      <h2 style="margin-top:0">この7日間</h2>
      <div class="week-chart">
        <div v-for="d in days7" :key="d.key" class="week-col">
          <div class="week-bar-wrap">
            <div
              class="week-bar"
              :style="{ height: Math.round((d.answered / maxAnswered) * 100) + '%' }"
              :title="`${d.answered}問 / ${d.correct}正解`"
            ></div>
          </div>
          <div class="week-count">{{ d.answered || '' }}</div>
          <div class="week-label">{{ shortDayLabel(d.key) }}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <h2 style="margin-top:0">カテゴリ別の習熟度</h2>
      <div v-for="c in byCategory" :key="c.category" class="cat-row">
        <div class="cat-name">{{ c.category }}</div>
        <div class="cat-bar">
          <div class="cat-fill mastered" :style="{ width: (c.mastered / c.total) * 100 + '%' }"></div>
          <div class="cat-fill learning" :style="{ width: (c.learning / c.total) * 100 + '%' }"></div>
        </div>
        <div class="cat-count">{{ c.mastered }}/{{ c.total }}</div>
      </div>
    </div>
  </section>
</template>
