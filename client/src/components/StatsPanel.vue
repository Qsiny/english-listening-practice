<template>
  <div class="card">
    <div class="row">
      <div class="item">
        <div class="label">句子</div>
        <div class="value">{{ p.sentenceIndex + 1 }} / {{ p.totalSentences }}</div>
      </div>
      <div class="item">
        <div class="label">单词</div>
        <div class="value">{{ p.wordIndex + 1 }} / {{ p.totalWords }}</div>
      </div>
      <div class="item">
        <div class="label">正确</div>
        <div class="value good">{{ s.correct }}</div>
      </div>
      <div class="item">
        <div class="label">错误</div>
        <div class="value bad">{{ s.wrong }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePracticeStore } from '../stores/practiceStore'

const practice = usePracticeStore()
const p = practice.progress
const s = practice.stats
</script>

<style scoped>
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
}

.row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.item {
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 10px;
  padding: 10px;
}

.label {
  font-size: 12px;
  color: #6b7280;
}

.value {
  margin-top: 6px;
  font-weight: 700;
  font-size: 16px;
}

.value.good {
  color: #065f46;
}

.value.bad {
  color: #991b1b;
}
</style>