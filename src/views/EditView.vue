<script setup lang="ts">
import { ref } from 'vue'
import { useWords } from '../composables/useWords'
import { useSpeech } from '../composables/useSpeech'
import { useSettings } from '../composables/useSettings'
import type { Importance, Word } from '../types'

const { words, categories, add, update, remove, resetToStarter, exportJSON, importJSON } = useWords()
const { voices, supported: speechSupported, speak } = useSpeech()
const { settings } = useSettings()

const editingId = ref<string | null>(null)
const form = ref({
  word: '',
  meaning: '',
  category: '',
  example: '',
  exampleTranslation: '',
  importance: 2 as Importance,
})

function resetForm() {
  form.value = {
    word: '',
    meaning: '',
    category: '',
    example: '',
    exampleTranslation: '',
    importance: 2,
  }
  editingId.value = null
}

function startEdit(w: Word) {
  editingId.value = w.id
  form.value = {
    word: w.word,
    meaning: w.meaning,
    category: w.category,
    example: w.example ?? '',
    exampleTranslation: w.exampleTranslation ?? '',
    importance: w.importance,
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function submit() {
  const f = form.value
  if (!f.word.trim() || !f.meaning.trim() || !f.category.trim()) {
    alert('単語・日本語訳・カテゴリは必須です')
    return
  }
  const payload = {
    word: f.word.trim(),
    meaning: f.meaning.trim(),
    category: f.category.trim(),
    example: f.example.trim() || undefined,
    exampleTranslation: f.exampleTranslation.trim() || undefined,
    importance: f.importance,
  }
  if (editingId.value) {
    update(editingId.value, payload)
  } else {
    add(payload)
  }
  resetForm()
}

function onRemove(w: Word) {
  if (!confirm(`「${w.word}」を削除しますか？`)) return
  remove(w.id)
}

function onReset() {
  if (!confirm('スターター単語に戻します。今のデータはすべて削除されます。よろしいですか？')) return
  resetToStarter()
}

function downloadExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `korean-words-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importMode = ref<'replace' | 'merge'>('merge')
function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const r = importJSON(String(reader.result), importMode.value)
      alert(`${importMode.value === 'replace' ? '置き換え' : '追加'}しました: ${r.added}語追加 / 全${r.total}語`)
    } catch (err) {
      alert('読み込み失敗: ' + (err instanceof Error ? err.message : String(err)))
    }
    input.value = ''
  }
  reader.readAsText(file)
}
</script>

<template>
  <section>
    <div class="card">
      <h2 style="margin-top:0">{{ editingId ? '単語を編集' : '単語を追加' }}</h2>
      <div class="form-grid">
        <label>
          単語(韓国語) *
          <input v-model="form.word" placeholder="例: 안녕하세요" />
        </label>
        <label>
          日本語訳 *
          <input v-model="form.meaning" placeholder="例: こんにちは" />
        </label>
        <label>
          カテゴリ *
          <input v-model="form.category" list="cat-list" placeholder="例: 인사" />
          <datalist id="cat-list">
            <option v-for="c in categories" :key="c" :value="c"></option>
          </datalist>
        </label>
        <label>
          重要度
          <select v-model.number="form.importance">
            <option :value="3">★★★ 最重要</option>
            <option :value="2">★★ 重要</option>
            <option :value="1">★ 基本</option>
          </select>
        </label>
        <label class="full">
          例文(韓国語)
          <textarea v-model="form.example" placeholder="例: 안녕하세요, 만나서 반갑습니다."></textarea>
        </label>
        <label class="full">
          例文の日本語訳
          <textarea v-model="form.exampleTranslation" placeholder="例: こんにちは、お会いできて嬉しいです。"></textarea>
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" @click="submit">{{ editingId ? '更新' : '追加' }}</button>
        <button v-if="editingId" class="btn ghost" @click="resetForm">キャンセル</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h2 style="margin-top:0">データ管理</h2>

      <div v-if="speechSupported" class="toolbar" style="padding-top:0">
        <div class="group">
          <label>音声:</label>
          <select v-model="settings.voiceName">
            <option :value="null">自動(女性voice優先)</option>
            <option v-for="v in voices" :key="v.name" :value="v.name">{{ v.name }} ({{ v.lang }})</option>
          </select>
          <button class="btn ghost sm" @click="speak('안녕하세요')">テスト再生</button>
        </div>
      </div>
      <div v-else class="example">このブラウザは音声合成に対応していません。</div>

      <div class="toolbar">
        <button class="btn ghost" @click="downloadExport">JSONエクスポート</button>

        <label class="group" style="margin-left:8px">
          <span>インポート:</span>
          <select v-model="importMode" class="chip" style="cursor:pointer">
            <option value="merge">追加(マージ)</option>
            <option value="replace">置き換え</option>
          </select>
          <input type="file" accept="application/json" @change="onImportFile" />
        </label>

        <button class="btn danger" style="margin-left:auto" @click="onReset">スターターに戻す</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px;padding:0;overflow-x:auto">
      <table class="wordtable">
        <thead>
          <tr>
            <th>単語</th>
            <th>日本語訳</th>
            <th>カテゴリ</th>
            <th>重要度</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in words" :key="w.id">
            <td><span class="ko-word">{{ w.word }}</span></td>
            <td>{{ w.meaning }}</td>
            <td>{{ w.category }}</td>
            <td>
              <span class="stars">
                <template v-for="n in 3" :key="n">
                  <span :class="{ dim: n > w.importance }">★</span>
                </template>
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button class="icon-btn" title="編集" @click="startEdit(w)">✎</button>
                <button class="icon-btn" title="削除" @click="onRemove(w)">🗑</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
