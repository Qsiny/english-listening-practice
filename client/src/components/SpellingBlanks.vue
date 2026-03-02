<template>
  <div class="spell-card" v-if="practice.hasData">
    <div class="row">
      <!-- 左：眼睛（按住显示） -->
      <button
        class="icon-btn"
        @mousedown.prevent="practice.setRevealText(true)"
        @mouseup.prevent="practice.setRevealText(false)"
        @mouseleave="practice.setRevealText(false)"
        title="按住显示正确文本"
        aria-label="按住显示正确文本"
      >
        👁
      </button>

      <!-- 中：横线 -->
      <div class="blanks" :class="{ masked: !practice.revealText }">
        <button
          v-for="(w, i) in words"
          :key="i"
          class="blank"
          :class="blankClass(i)"
          type="button"
          @click="onPick(i)"
          :title="practice.revealText ? w : `第 ${i + 1} 个单词`"
        >
          <span class="filled" v-if="practice.revealText">{{ w }}</span>
          <span class="line" v-else></span>
        </button>
      </div>

      <!-- 右：喇叭（播放本句） -->
      <button
        class="icon-btn"
        @click="playSentence"
        title="播放本句"
        aria-label="播放本句"
      >
        🔊
      </button>
    </div>

    <!-- 输入 -->
    <form class="input-row" @submit.prevent="onSubmit">
      <input
        ref="inputEl"
        v-model="text"
        class="input"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="输入当前单词，回车确认；Space 回退；←/→ 切换"
        @keydown="onInputKeydown"
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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { usePracticeStore } from '../stores/practiceStore'

const practice = usePracticeStore()
const inputEl = ref(null)
const text = ref('')

const words = computed(() => practice.currentWords || [])

function focus() {
  nextTick(() => inputEl.value?.focus())
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

function onPick(i) {
  practice.setWordIndex(i)
  focus()
}

// 输入框内快捷键：Space/左右键
function onInputKeydown(e) {
  if (e.code === 'Space') {
    // 你的规则：空格跳转到上一个单词
    e.preventDefault()
    practice.prevWord()
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    practice.prevWord()
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    practice.nextWord()
    return
  }
}

// 播放本句：复用全局 AudioPlayer（用 window 事件发给 App）
function playSentence() {
  window.dispatchEvent(new CustomEvent('spell:play-sentence'))
}

function blankClass(i) {
  const sIdx = practice.currentSentenceIndex
  const state = practice.wordStates?.[sIdx]?.[i] || 'pending'
  return {
    current: i === practice.currentWordIndex,
    correct: state === 'correct',
    wrong: state === 'wrong',
  }
}

// 切句/切词时自动聚焦
watch(
  () => [practice.currentSentenceIndex, practice.currentWordIndex],
  () => focus()
)

onMounted(() => focus())
</script>

<style scoped>
.spell-card {
  margin-top: 12px;
}

.row {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 10px;
  align-items: center;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-size: 18px;
}

.blanks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-height: 44px;
}

.blank {
  position: relative;
  min-width: 42px;
  height: 36px;
  padding: 0 8px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.blank.current {
  border-color: #111827;
  box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.06);
}

.blank.correct {
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #065f46;
}

.blank.wrong {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.line {
  display: block;
  width: 44px;
  height: 2px;
  background: #111827;
  opacity: 0.6;
  border-radius: 999px;
}

.filled {
  font-weight: 600;
  font-size: 13px;
}

.input-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
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