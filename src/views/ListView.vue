<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWords } from '../composables/useWords'
import { useSettings } from '../composables/useSettings'
import { useSpeech } from '../composables/useSpeech'
import type { Importance, RedactKey } from '../types'

const { words, categories } = useWords()
const { settings } = useSettings()
const { speak, supported: speechSupported } = useSpeech()

const search = ref('')
const selectedCategories = ref<string[]>([])
const selectedImportance = ref<Importance[]>([])
const sortKey = ref<'importance' | 'category' | 'createdAt'>('importance')

const redactables: { key: RedactKey; label: string }[] = [
  { key: 'word', label: '単語' },
  { key: 'meaning', label: '日本語訳' },
  { key: 'example', label: '例文' },
]

function isRedacted(k: RedactKey) {
  return settings.value.redactedColumns.includes(k)
}

function toggleRedact(k: RedactKey) {
  const list = settings.value.redactedColumns
  if (list.includes(k)) settings.value.redactedColumns = list.filter((x) => x !== k)
  else settings.value.redactedColumns = [...list, k]
  // 列の赤シート状態が変わったら、個別revealもリセット
  revealed.value = new Set()
}

const revealed = ref<Set<string>>(new Set())
function revealKey(id: string, k: RedactKey) {
  return id + ':' + k
}
function isRevealed(id: string, k: RedactKey) {
  return revealed.value.has(revealKey(id, k))
}
function toggleReveal(id: string, k: RedactKey) {
  if (!isRedacted(k)) return
  const s = new Set(revealed.value)
  const key = revealKey(id, k)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  revealed.value = s
}
function revealAll() {
  const s = new Set<string>()
  for (const w of filtered.value) {
    for (const r of settings.value.redactedColumns) s.add(revealKey(w.id, r))
  }
  revealed.value = s
}
function hideAll() {
  revealed.value = new Set()
}

function toggleCategory(c: string) {
  if (selectedCategories.value.includes(c)) {
    selectedCategories.value = selectedCategories.value.filter((x) => x !== c)
  } else {
    selectedCategories.value = [...selectedCategories.value, c]
  }
}

function toggleImportance(i: Importance) {
  if (selectedImportance.value.includes(i)) {
    selectedImportance.value = selectedImportance.value.filter((x) => x !== i)
  } else {
    selectedImportance.value = [...selectedImportance.value, i]
  }
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = words.value.filter((w) => {
    if (selectedCategories.value.length > 0 && !selectedCategories.value.includes(w.category)) return false
    if (selectedImportance.value.length > 0 && !selectedImportance.value.includes(w.importance)) return false
    if (q) {
      const hay = (w.word + ' ' + w.meaning + ' ' + (w.example ?? '') + ' ' + (w.exampleTranslation ?? '')).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  if (sortKey.value === 'importance') {
    list = list.slice().sort((a, b) => b.importance - a.importance || a.category.localeCompare(b.category))
  } else if (sortKey.value === 'category') {
    list = list.slice().sort((a, b) => a.category.localeCompare(b.category) || b.importance - a.importance)
  } else {
    list = list.slice().sort((a, b) => b.createdAt - a.createdAt)
  }
  return list
})

const anyRedact = computed(() => settings.value.redactedColumns.length > 0)

function stars(n: Importance) {
  return '★'.repeat(n) + '☆'.repeat(3 - n)
}
</script>

<template>
  <section>
    <div class="toolbar">
      <input v-model="search" class="search" placeholder="検索（単語・訳・例文）" />
      <div class="group">
        <label>並び:</label>
        <select v-model="sortKey">
          <option value="importance">重要度順</option>
          <option value="category">カテゴリ順</option>
          <option value="createdAt">追加日順</option>
        </select>
      </div>
    </div>

    <div class="toolbar">
      <div class="group">
        <label>🟥 赤シート:</label>
        <span
          v-for="c in redactables"
          :key="c.key"
          class="chip toggle"
          :class="{ active: isRedacted(c.key) }"
          @click="toggleRedact(c.key)"
        >{{ c.label }}</span>
        <template v-if="anyRedact">
          <button class="btn ghost sm" style="margin-left: 8px" @click="revealAll">全部めくる</button>
          <button class="btn ghost sm" @click="hideAll">全部戻す</button>
        </template>
      </div>
    </div>

    <div class="toolbar">
      <div class="group">
        <label>カテゴリ:</label>
        <span
          v-for="c in categories"
          :key="c"
          class="chip toggle"
          :class="{ active: selectedCategories.includes(c) }"
          @click="toggleCategory(c)"
        >{{ c }}</span>
      </div>
      <div class="group">
        <label>重要度:</label>
        <span
          v-for="i in [3, 2, 1] as Importance[]"
          :key="i"
          class="chip toggle"
          :class="{ active: selectedImportance.includes(i) }"
          @click="toggleImportance(i)"
        >{{ stars(i) }}</span>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow-x: auto;">
      <table v-if="filtered.length > 0" class="wordtable">
        <thead>
          <tr>
            <th>単語</th>
            <th>日本語訳</th>
            <th>カテゴリ</th>
            <th>重要度</th>
            <th>例文</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in filtered" :key="w.id">
            <td>
              <span
                class="redactable"
                :class="{ redact: isRedacted('word'), revealed: isRevealed(w.id, 'word') }"
                @click="toggleReveal(w.id, 'word')"
              >
                <span class="ko-word">{{ w.word }}</span>
              </span>
              <button
                v-if="speechSupported && (!isRedacted('word') || isRevealed(w.id, 'word'))"
                class="speak-btn"
                title="発音を再生"
                @click.stop="speak(w.word)"
              >♪</button>
            </td>
            <td>
              <span
                class="redactable"
                :class="{ redact: isRedacted('meaning'), revealed: isRevealed(w.id, 'meaning') }"
                @click="toggleReveal(w.id, 'meaning')"
              >{{ w.meaning }}</span>
            </td>
            <td>{{ w.category }}</td>
            <td>
              <span class="stars">
                <template v-for="n in 3" :key="n">
                  <span :class="{ dim: n > w.importance }">★</span>
                </template>
              </span>
            </td>
            <td>
              <template v-if="w.example">
                <span
                  class="redactable"
                  :class="{ redact: isRedacted('example'), revealed: isRevealed(w.id, 'example') }"
                  @click="toggleReveal(w.id, 'example')"
                >
                  <div>{{ w.example }}</div>
                  <div v-if="w.exampleTranslation" class="example">{{ w.exampleTranslation }}</div>
                </span>
              </template>
              <span v-else class="example">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">条件に合う単語がありません</div>
    </div>

    <p class="example" style="margin-top: 12px;">
      表示: {{ filtered.length }} 件 / 全 {{ words.length }} 件
    </p>
    <p v-if="anyRedact" class="example">
      🟥 赤シートモード: マウスを乗せると一時的に見えます。クリック/タップで個別に固定表示できます。
    </p>
  </section>
</template>
