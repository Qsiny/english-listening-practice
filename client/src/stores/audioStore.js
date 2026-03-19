import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAudioStore = defineStore('audio', () => {
  const audioFile = ref(null)
  const audioUrl = ref('')

  function setAudioFile(file) {
    audioFile.value = file
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = URL.createObjectURL(file)
  }

  function setAudioUrl(url) {
    if (audioUrl.value && audioFile.value) URL.revokeObjectURL(audioUrl.value)
    audioFile.value = null
    audioUrl.value = url
  }

  function reset() {
    if (audioUrl.value && audioFile.value) URL.revokeObjectURL(audioUrl.value)
    audioFile.value = null
    audioUrl.value = ''
  }

  return { audioFile, audioUrl, setAudioFile, setAudioUrl, reset }
})