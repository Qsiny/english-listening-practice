<template>
  <div class="player">
    <audio
      ref="audioEl"
      :src="audio.audioUrl"
      class="audio"
      preload="auto"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="isPlaying = false"
    />
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
const playbackRate = ref(1)

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

function applyRate() {
  const el = audioEl.value
  if (el) el.playbackRate = playbackRate.value
}

function setPlaybackRate(rate) {
  playbackRate.value = rate
  applyRate()
}

function togglePlay() {
  const el = ensureAudio()
  sentenceMode.value = false
  if (el.paused) {
    applyRate()
    el.play()
  } else {
    el.pause()
  }
}

function playCurrentSentence() {
  if (!canPlaySentence.value) return
  const el = ensureAudio()
  sentenceMode.value = true
  el.currentTime = Math.max(0, sentenceStart.value)
  applyRate()
  el.play()
}

function pauseSentence() {
  const el = audioEl.value
  if (!el) return
  if (!el.paused) {
    el.pause()
  }
}

function onTimeUpdate() {
  if (!sentenceMode.value) return
  const el = audioEl.value
  if (!el) return
  if (el.currentTime >= sentenceEnd.value) {
    el.pause()
    sentenceMode.value = false
    isPlaying.value = false
  }
}

watch(audioEl, (el, oldEl) => {
  if (oldEl) oldEl.removeEventListener('timeupdate', onTimeUpdate)
  if (el) {
    el.addEventListener('timeupdate', onTimeUpdate)
    applyRate()
  }
})

watch(
  () => practice.currentSentenceIndex,
  () => {
    const el = audioEl.value
    if (el && !el.paused) {
      el.pause()
    }
    sentenceMode.value = false
    isPlaying.value = false
  }
)

onBeforeUnmount(() => {
  const el = audioEl.value
  if (el) el.removeEventListener('timeupdate', onTimeUpdate)
})

defineExpose({
  togglePlay,
  playCurrentSentence,
  pauseSentence,
  isPlaying,
  playbackRate,
  setPlaybackRate,
})
</script>

<style scoped>
.player {
  display: none;
}
</style>