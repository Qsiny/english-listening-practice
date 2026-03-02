import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function normalizeWord(w) {
  return (w ?? '')
    .toString()
    .trim()
    .toLowerCase()
}

export const usePracticeStore = defineStore('practice', () => {
  // sentences: [{ text, start, end, words: string[] }]
  const sentences = ref([])
  const currentSentenceIndex = ref(0)
  const currentWordIndex = ref(0)

  // per-sentence word states: 'pending' | 'correct' | 'wrong'
  const wordStates = ref([]) // e.g. [[...],[...]]
  const lastAttempt = ref('') // 当前输入框最后一次提交的内容（用于显示/调试）
  const lastResult = ref(null) // { ok: boolean, expected, actual }
  const revealText = ref(false)

  // ✅ 新增：是否由“完成上一句最后一个词”触发了自动切句（一次性）
  const autoAdvancedSentence = ref(false)

  const hasData = computed(() => sentences.value.length > 0)

  const currentSentence = computed(() => {
    return sentences.value[currentSentenceIndex.value] || null
  })

  const currentWords = computed(() => currentSentence.value?.words || [])

  const expectedWord = computed(() => {
    return currentWords.value[currentWordIndex.value] || ''
  })

  const progress = computed(() => {
    const totalSentences = sentences.value.length
    const sentence = currentSentence.value
    const totalWords = sentence?.words?.length || 0
    return {
      sentenceIndex: currentSentenceIndex.value,
      totalSentences,
      wordIndex: currentWordIndex.value,
      totalWords,
    }
  })

  const stats = computed(() => {
    let correct = 0
    let wrong = 0
    let total = 0

    for (const arr of wordStates.value) {
      for (const s of arr) {
        total++
        if (s === 'correct') correct++
        if (s === 'wrong') wrong++
      }
    }

    return { correct, wrong, total }
  })

  function setRevealText(v) {
    revealText.value = !!v
  }

  function consumeAutoAdvancedSentence() {
    const v = autoAdvancedSentence.value
    autoAdvancedSentence.value = false
    return v
  }

  function moveToNextWord() {
    const len = currentWords.value.length

    // 默认：不是自动切句
    autoAdvancedSentence.value = false

    if (currentWordIndex.value < len - 1) {
      currentWordIndex.value++
      return
    }

    // ✅ 当前句最后一个词完成后，自动进入下一句，并打标记
    if (currentSentenceIndex.value < sentences.value.length - 1) {
      currentSentenceIndex.value++
      currentWordIndex.value = 0
      autoAdvancedSentence.value = true
    }
  }

  function setSentences(data) {
    sentences.value = Array.isArray(data) ? data : []
    currentSentenceIndex.value = 0
    currentWordIndex.value = 0
    wordStates.value = sentences.value.map((s) => (s.words || []).map(() => 'pending'))
    lastAttempt.value = ''
    lastResult.value = null
    revealText.value = false
    autoAdvancedSentence.value = false
  }

  function resetPractice() {
    setSentences([])
  }

  function goToSentence(index) {
    const max = sentences.value.length - 1
    const next = Math.min(Math.max(index, 0), max)

    // 手动切句不触发自动播放
    autoAdvancedSentence.value = false

    currentSentenceIndex.value = next
    currentWordIndex.value = 0
    lastAttempt.value = ''
    lastResult.value = null
  }

  function nextSentence() {
    goToSentence(currentSentenceIndex.value + 1)
  }

  function prevSentence() {
    goToSentence(currentSentenceIndex.value - 1)
  }

  /**
   * 校验用户输入（按单词）
   * @param {string} input
   * @returns {{ ok: boolean, expected: string, actual: string }}
   */
  function submitWord(input) {
    const expected = expectedWord.value
    const normalizedExpected = normalizeWord(expected)
    const actual = input
    const normalizedActual = normalizeWord(actual)

    lastAttempt.value = actual

    const ok = normalizedExpected.length > 0 && normalizedExpected === normalizedActual
    lastResult.value = { ok, expected, actual }

    const sIdx = currentSentenceIndex.value
    const wIdx = currentWordIndex.value

    if (wordStates.value[sIdx] && wordStates.value[sIdx][wIdx]) {
      wordStates.value[sIdx][wIdx] = ok ? 'correct' : 'wrong'
    } else if (wordStates.value[sIdx]) {
      wordStates.value[sIdx][wIdx] = ok ? 'correct' : 'wrong'
    }

    if (ok) {
      moveToNextWord()
    }
    return { ok, expected, actual }
  }

  function markAllPendingForSentence(sentenceIndex) {
    const s = sentences.value[sentenceIndex]
    if (!s) return
    wordStates.value[sentenceIndex] = (s.words || []).map(() => 'pending')
  }

  return {
    sentences,
    currentSentenceIndex,
    currentWordIndex,
    wordStates,
    lastAttempt,
    lastResult,
    revealText,
    setRevealText,

    autoAdvancedSentence,
    consumeAutoAdvancedSentence,

    hasData,
    currentSentence,
    currentWords,
    expectedWord,
    progress,
    stats,

    setSentences,
    resetPractice,
    goToSentence,
    nextSentence,
    prevSentence,
    submitWord,
    markAllPendingForSentence,
  }
})