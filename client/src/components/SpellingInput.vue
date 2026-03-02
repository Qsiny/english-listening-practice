<template>
  <div class="wrap" v-if="practice.hasData">
    <div class="hint">
      <template v-if="practice.revealText">
        请输入当前单词（目标：<span class="target">{{ practice.expectedWord }}</span>）
      </template>
      <template v-else>
        请输入当前单词（文本已隐藏）
      </template>
    </div>

    <form class="form" @submit.prevent="onSubmit">
      <input
        ref="inputEl"
        v-model="text"
        type="text"
        class="input"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="输入单词后回车"
      />
      <button class="btn" type="submit">确认</button>
      <button class="btn secondary" type="button" @click="clear">清空</button>
    </form>

    <div v-if="practice.lastResult" class="result" :class="{ ok: practice.lastResult.ok, bad: !practice.lastResult.ok }">
      <span v-if="practice.lastResult.ok">正确</span>
      <span v-else>
        错误：你输入 "{{ practice.lastResult.actual }}"，正确是 "{{ practice.lastResult.expected }}"
      </span>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { usePracticeStore } from '../stores/practiceStore'

const practice = usePracticeStore()
const text = ref('')
const inputEl = ref(null)

function focus() {
  nextTick(() => {
    inputEl.value?.focus()
  })
}

function clear() {
  text.value = ''
  focus()
}

function onSubmit() {
  if (!text.value.trim()) return
  practice.submitWord(text.value)
  text.value = ''
  focus()
}

// 切句/切词时自动聚焦
watch(
  () => [practice.currentSentenceIndex, practice.currentWordIndex],
  () => {
    focus()
  }
)

onMounted(() => focus())
</script>

<style scoped>
.wrap {
  margin-top: 12px;
}

.hint {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.target {
  color: #111827;
  font-weight: 600;
}

.form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  outline: none;
}

.input:focus {
  border-color: #111827;
}

.btn {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.btn.secondary {
  background: #fff;
  color: #111827;
}

.result {
  margin-top: 10px;
  font-size: 13px;
}

.result.ok {
  color: #065f46;
}

.result.bad {
  color: #991b1b;
}
</style>