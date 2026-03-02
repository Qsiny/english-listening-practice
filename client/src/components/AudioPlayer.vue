<template>
  <div class="player">
    <div class="title">音频播放器</div>

    <div v-if="!audio.audioUrl" class="empty">请先上传音频</div>

    <div v-else class="controls">
      <div class="btns">
        <button class="btn" @click="togglePlay">
          {{ isPlaying ? '暂停' : '播放' }}
        </button>

        <button class="btn secondary" @click="playCurrentSentence" :disabled="!canPlaySentence">
          播放本句
        </button>

        <button class="btn secondary" @click="replayCurrentSentence" :disabled="!canPlaySentence">
          重播本句
        </button>
      </div>

      <div class="hint" v-if="canPlaySentence">
        本句区间：{{ sentenceStart.toFixed(2) }}s - {{ sentenceEnd.toFixed(2) }}s
      </div>

      <audio
        ref="audioEl"
        :src="audio.audioUrl"
        controls
        preload="metadata"
        class="audio"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAudioStore } from '../stores/audioStore'
import { usePracticeStore } from '../stores/practiceStore'

const audio = useAudioStore()
const practice = usePracticeStore()

const audioEl = ref(null)
const isPlaying = ref(false)
const sentenceMode = ref(false)

const sentenceStart = computed(() => practice.currentSentence?.start ?? 0)
const sentenceEnd = computed(() => practice.currentSentence?.end ?? 0)

const canPlaySentence = computed(() => {
  const s = practice.currentSentence
  return !!s && typeof s.start === 'number' && typeof s.end === 'number' && s.end > s.start
})

function ensureAudio() {
  const el = audioEl.value
  if (!el) throw new Error('audio element not ready')
  return el
}

function togglePlay() {
  const el = ensureAudio()
  sentenceMode.value = false
  if (el.paused) el.play()
  else el.pause()
}

function playCurrentSentence() {
  if (!canPlaySentence.value) return
  const el = ensureAudio()
  sentenceMode.value = true
  el.currentTime = Math.max(0, sentenceStart.value)
  el.play()
}

function replayCurrentSentence() {
  playCurrentSentence()
}

function onTimeUpdate() {
  if (!sentenceMode.value) return
  const el = audioEl.value
  if (!el) return
  if (el.currentTime >= sentenceEnd.value) {
    el.pause()
    sentenceMode.value = false
  }
}

watch(audioEl, (el, oldEl) => {
  if (oldEl) oldEl.removeEventListener('timeupdate', onTimeUpdate)
  if (el) el.addEventListener('timeupdate', onTimeUpdate)
})

watch(
  () => practice.currentSentenceIndex,
  () => {
    sentenceMode.value = false
  }
)

onBeforeUnmount(() => {
  const el = audioEl.value
  if (el) el.removeEventListener('timeupdate', onTimeUpdate)
})

defineExpose({
  togglePlay,
  playCurrentSentence,
  replayCurrentSentence,
})
</script>

<style scoped>
.player .title {
  font-weight: 700;
  margin-bottom: 8px;
}

.empty {
  color: #6b7280;
  font-size: 14px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btns {
  display: flex;
  gap: 8px;
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

.hint {
  font-size: 12px;
  color: #6b7280;
}

.audio {
  width: 100%;
}
</style>