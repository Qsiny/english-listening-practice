<template>
  <div class="sentence">
    <div class="meta" v-if="sentence">
      <div class="idx">
        第 {{ practice.currentSentenceIndex + 1 }} / {{ practice.sentences.length }} 句
      </div>
      <div class="time" v-if="hasTime">
        {{ sentence.start.toFixed(2) }}s - {{ sentence.end.toFixed(2) }}s
      </div>
    </div>

    <!-- ✅ 只有 revealText 才显示 -->
    <div v-if="practice.revealText" class="words" >
      <span
        v-for="(w, i) in words"
        :key="i"
        class="word"
        :class="wordClass(i)"
      >
        <span v-if="isCurrent(i)" class="cursor" aria-hidden="true"></span>
        {{ w }}
      </span>
    </div>

    <div v-else class="hidden-tip">
      文本已隐藏（悬停上方“按住查看文本”显示）
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePracticeStore } from '../stores/practiceStore'

const practice = usePracticeStore()

const sentence = computed(() => practice.currentSentence)
const words = computed(() => practice.currentWords)

const hasTime = computed(() => {
  return !!sentence.value && typeof sentence.value.start === 'number' && typeof sentence.value.end === 'number'
})

function isCurrent(i) {
  return i === practice.currentWordIndex
}

function wordClass(i) {
  const sIdx = practice.currentSentenceIndex
  const state = practice.wordStates?.[sIdx]?.[i] || 'pending'
  return {
    pending: state === 'pending',
    correct: state === 'correct',
    wrong: state === 'wrong',
    current: isCurrent(i),
  }
}
</script>

<style scoped>
.sentence {
  padding: 4px 0;
}

.meta {
  display: flex;
  gap: 12px;
  color: #6b7280;
  font-size: 12px;
  margin-bottom: 8px;
}

.words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  line-height: 1.8;
}

.word {
  position: relative;
  padding: 2px 6px;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  font-variant-ligatures: none;
}

.word.correct {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46;
}

.word.wrong {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.word.current {
  border-color: #111827;
}

.cursor {
  display: inline-block;
  width: 3px;
  height: 14px;
  background: #ef4444;
  margin-right: 6px;
  border-radius: 2px;
  vertical-align: -2px;
}

.empty {
  color: #6b7280;
  font-size: 14px;
}

.hidden-tip {
  color: #6b7280;
  font-size: 13px;
  padding: 10px 0;
}
</style>