<template>
  <div class="app">
    <!-- 上传页 -->
    <div v-if="mode === 'upload'" class="uploadPage">
      <header class="header">
        <h1>英语听力拼写练习</h1>
        <p class="sub">上传音频 → 转写与断句 → 听写</p>
      </header>

      <main class="main">
        <AudioUploader />
      </main>
    </div>

    <!-- 听写页（完全替换） -->
    <div v-else class="dictationPage">
      <AudioPlayer ref="playerRef" />
      <DictationPage
        v-if="practice.hasData"
        :is-playing="playerRef?.isPlaying ?? false"
        :playback-rate="playerRef?.playbackRate ?? 1"
        @play-sentence="playerRef?.playCurrentSentence()"
        @toggle-sentence-playback="playerRef?.toggleCurrentSentencePlayback()"
        @pause-sentence="playerRef?.pauseSentence()"
        @set-playback-rate="(r) => playerRef?.setPlaybackRate(r)"
        @restart="handleRestart"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { usePracticeStore } from './stores/practiceStore'

import AudioUploader from './components/AudioUploader.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import DictationPage from './pages/DictationPage.vue'

const practice = usePracticeStore()
const playerRef = ref(null)

const mode = computed(() => (practice.hasData ? 'dictation' : 'upload'))

function playSentence() {
  playerRef.value?.playCurrentSentence?.()
}

function restartToUpload() {
  practice.resetPractice()
}

// ✅ 仅在“自动切句”时播放下一句
watch(
  () => practice.currentSentenceIndex,
  async (newIdx, oldIdx) => {
    if (!practice.hasData) return
    if (newIdx === oldIdx) return

    const shouldAutoPlay = practice.consumeAutoAdvancedSentence?.() ? true : false
    if (!shouldAutoPlay) return

    await nextTick()
    playSentence()
  }
)

function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || el.isContentEditable
}

function isMacPlatform() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')
}

function isReplayShortcut(e) {
  return (
    isMacPlatform() &&
    e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    (e.key === 'r' || e.key === 'R')
  )
}

function isToggleSentenceShortcut(e) {
  return !e.metaKey && !e.ctrlKey && !e.altKey && e.key === 'Enter'
}

function onKeydown(e) {
  if (!practice.hasData) return

  // mac: Control + R 重播本句（输入中也可用）
  if (isReplayShortcut(e)) {
    e.preventDefault()
    playSentence()
    return
  }

  // Enter：播放/暂停本句（输入中也可用）
  if (isToggleSentenceShortcut(e)) {
    e.preventDefault()
    playerRef.value?.toggleCurrentSentencePlayback?.()
    return
  }

  // 输入框内的 Space 交给 DictationPage 的 input 处理，这里不抢
  const typing = isTypingTarget(e.target)
  if (typing) return

  // 全局只保留切句和重播（按需）
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
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: #f6f7fb;
  color: #111827;
}

.uploadPage .header {
  padding: 24px 16px 8px;
  max-width: 980px;
  margin: 0 auto;
}

.uploadPage .header h1 {
  margin: 0;
  font-size: 22px;
}

.uploadPage .sub {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.uploadPage .main {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 16px 24px;
}

/* 听写页全屏使用 */
.dictationPage {
  min-height: 100vh;
}

/* 隐藏 AudioPlayer，但保留其播放能力 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* ✅ 播放中按钮高亮 */
.tool.playing {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}
</style>
