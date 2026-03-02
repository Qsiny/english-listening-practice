<template>
  <div class="app">
    <header class="header">
      <h1>英语听力拼写练习</h1>
      <p class="sub">上传音频 → 转写与断句 → 逐词拼写练习</p>
    </header>

    <main class="main">
      <AudioUploader />

      <div v-if="practice.hasData" class="practice">
        <div class="left">
          <StatsPanel />

          <div class="card">
            <AudioPlayer ref="audioPlayerRef" />
          </div>

          <div class="card">
            <div class="reveal-bar">
              <div
                class="reveal-chip"
                @mouseenter="practice.setRevealText(true)"
                @mouseleave="practice.setRevealText(false)"
                title="鼠标悬停显示句子文本与当前目标词"
              >
                按住查看文本
              </div>
              <div class="reveal-state">
                {{ practice.revealText ? '文本已显示' : '文本已隐藏' }}
              </div>
            </div>

            <SentenceDisplay />
            <SpellingInput />
            <div class="nav">
              <button class="btn" @click="practice.prevSentence" :disabled="practice.currentSentenceIndex === 0">
                上一句 (↑)
              </button>
              <button
                class="btn"
                @click="practice.nextSentence"
                :disabled="practice.currentSentenceIndex >= practice.sentences.length - 1"
              >
                下一句 (↓)
              </button>
              <button class="btn secondary" @click="practice.resetPractice()">清空练习</button>
            </div>
            <div class="kb-hint">
              快捷键：Space 播放/暂停｜R 重播本句｜↑ 上一句｜↓ 下一句
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { usePracticeStore } from './stores/practiceStore'

import AudioUploader from './components/AudioUploader.vue'
import SentenceDisplay from './components/SentenceDisplay.vue'
import SpellingInput from './components/SpellingInput.vue'
import StatsPanel from './components/StatsPanel.vue'
import AudioPlayer from './components/AudioPlayer.vue'

const practice = usePracticeStore()
const audioPlayerRef = ref(null)

// ✅ 修复：仅在“自动切句”时播放下一句
watch(
  () => practice.currentSentenceIndex,
  async (newIdx, oldIdx) => {
    if (!practice.hasData) return
    if (newIdx === oldIdx) return

    // 只有上一句完成触发的自动切句才播放
    const shouldAutoPlay = practice.consumeAutoAdvancedSentence()
    if (!shouldAutoPlay) return

    await nextTick()
    audioPlayerRef.value?.playCurrentSentence?.()
  }
)

function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || el.isContentEditable
}

function onKeydown(e) {
  if (!practice.hasData) return

  const typing = isTypingTarget(e.target)

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    practice.prevSentence()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    practice.nextSentence()
    return
  }

  if (typing) return

  if (e.code === 'Space') {
    e.preventDefault()
    audioPlayerRef.value?.togglePlay?.()
    return
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    audioPlayerRef.value?.replayCurrentSentence?.()
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: #f6f7fb;
  color: #111827;
}

.header {
  padding: 24px 16px 8px;
  max-width: 980px;
  margin: 0 auto;
}

.header h1 {
  margin: 0;
  font-size: 22px;
}

.sub {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.main {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 16px 24px;
}

.practice {
  margin-top: 16px;
}

.left {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.nav {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.secondary {
  background: #fff;
  color: #111827;
}

.kb-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
}

.reveal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.reveal-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  color: #111827;
  font-size: 12px;
  user-select: none;
  cursor: pointer;
}

.reveal-state {
  font-size: 12px;
  color: #6b7280;
}
</style>