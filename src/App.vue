<script setup lang="ts">
import { ref } from 'vue'
import ListView from './views/ListView.vue'
import QuizView from './views/QuizView.vue'
import EditView from './views/EditView.vue'

type Tab = 'list' | 'quiz' | 'edit'
const tab = ref<Tab>('list')
</script>

<template>
  <div class="app">
    <header class="appbar">
      <h1><span class="ko">한국어</span> 韓国語単語帳</h1>
      <nav class="tabs">
        <button :class="{ active: tab === 'list' }" @click="tab = 'list'">一覧</button>
        <button :class="{ active: tab === 'quiz' }" @click="tab = 'quiz'">クイズ</button>
        <button :class="{ active: tab === 'edit' }" @click="tab = 'edit'">編集</button>
      </nav>
    </header>

    <main>
      <ListView v-if="tab === 'list'" />
      <QuizView v-else-if="tab === 'quiz'" />
      <EditView v-else />
    </main>
  </div>
</template>
