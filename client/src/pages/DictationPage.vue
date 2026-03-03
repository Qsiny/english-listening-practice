<template>
  <div class="layout" v-if="practice.hasData">
    <!-- 遮罩：移动端打开侧边栏时点击关闭 -->
    <div
      v-if="sidebarOpen"
      class="overlay"
      @click="sidebarOpen = false"
    />

    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebarHeader">
        <div class="sidebarTitle">句子列表</div>

        <button class="collapseBtn" @click="sidebarOpen = !sidebarOpen">
          {{ sidebarOpen ? '收起' : '展开' }}
        </button>
      </div>

      <div class="sidebarBody">
        <button
          v-for="(_, idx) in practice.sentences"
          :key="idx"
          class="sentenceItem"
          :class="{ active: idx === practice.currentSentenceIndex }"
          @click="switchSentence(idx)"
          :title="`切换到第 ${idx + 1} 句`"
        >
          <div class="sentenceIndex">{{ idx + 1 }}</div>
        </button>
      </div>

      <div class="sidebarFooter">
        <div class="sidebarHint">
          点击句子可跳转；当前：{{ practice.currentSentenceIndex + 1 }} / {{ practice.sentences.length }}
        </div>
      </div>
    </aside>

    <!-- 主内容 -->
    <main class="main">
      <!-- 顶部条 -->
      <div class="top">
        <button class="sidebarToggle" @click="sidebarOpen = !sidebarOpen" title="句子列表">
          ☰
        </button>

        <div class="meta">
          句子 {{ practice.currentSentenceIndex + 1 }} / {{ practice.sentences.length }}
        </div>

        <!-- ✅ 重新开始按钮移到右上角 -->
        <button class="restartBtn" @click="$emit('restart')" title="重新开始">↩</button>
      </div>

      <div class="page">
        <div class="center">
          <div class="blanks">
            <template v-for="(w, vIdx) in visibleWords" :key="vIdx">
              <!-- 当前词：透明输入框 + 底部横线 -->
              <div
                v-if="isCurrentVisible(vIdx)"
                class="blankWrap current"
                :class="stateClass(vIdx)"
              >
                <span v-if="practice.revealText" class="answer">{{ w }}</span>
                <input
                  v-show="!practice.revealText"
                  :ref="setActiveInputRef"
                  v-model="text"
                  class="lineInput"
                  type="text"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  @keydown="onKeydown"
                  :style="{ width: wordWidth(w) }"
                />
                <span class="bar" :style="{ width: wordWidth(w) }"></span>
              </div>

              <!-- 非当前词 -->
              <div
                v-else
                class="blankWrap"
                :class="stateClass(vIdx)"
                @click="pick(vIdx)"
              >
                <span v-if="practice.revealText" class="answer">{{ w }}</span>
                <span v-else-if="displayTextForVisible(vIdx)" class="typed">
                  {{ displayTextForVisible(vIdx) }}
                </span>
                <span v-else class="placeholder">{{ w }}</span>
                <span class="bar" :style="{ width: wordWidth(w) }"></span>
              </div>
            </template>
          </div>

          <!-- 正确提示 -->
          <div
            class="result"
            v-if="practice.lastResult?.ok"
            :class="{ ok: true }"
          >
            ✓ 正确
          </div>

          <!-- ✅ 小喇叭和小眼睛放在正确提示下方 -->
          <div class="toolbar">
            <button class="tool" @click="playSentence" title="播放本句">🔊</button>

            <button
              class="tool ghost"
              @mousedown.prevent="practice.setRevealText(true)"
              @mouseup.prevent="practice.setRevealText(false)"
              @mouseleave="practice.setRevealText(false)"
              title="按住显示正确文本"
            >
              👁
            </button>
          </div>
        </div>

        <div class="tip">输入后按 <b>Space</b> 校验并跳到下一词</div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { usePracticeStore } from '../stores/practiceStore'

const emit = defineEmits(['play-sentence', 'restart'])
const practice = usePracticeStore()

// 侧边栏状态
const sidebarOpen = ref(true)

function switchSentence(idx) {
  if (idx === practice.currentSentenceIndex) {
    // 同一句：移动端收起即可
    if (window.innerWidth <= 900) sidebarOpen.value = false
    return
  }

  practice.setSentenceIndex?.(idx)
  // 如果 store 没有 setSentenceIndex，则直接写 index（Pinia 是可写的 state）
  if (!practice.setSentenceIndex) {
    practice.currentSentenceIndex = idx
  }

  // 重置到第一个词，交给现有 watch 清缓存、聚焦
  practice.setWordIndex?.(0)
  if (!practice.setWordIndex) {
    practice.currentWordIndex = 0
  }

  practice.clearLastResult?.()
  text.value = ''

  // 移动端切换后关闭侧边栏
  if (window.innerWidth <= 900) sidebarOpen.value = false
}

// ====== 以下是你原来的逻辑 ======
const text = ref('')
const activeInputEl = ref(null)

function setActiveInputRef(el) {
  activeInputEl.value = el
}

function focusCurrent(selectAll = false) {
  nextTick(() => {
    nextTick(() => {
      const el = activeInputEl.value
      if (!el) return
      el.focus()
      if (selectAll) el.select()
    })
  })
}

/**
 * ✅ 切句/切词后更稳的聚焦：给 DOM/time 一点时间把 ref 挂上
 * @param {object} opts
 * @param {boolean} opts.selectAll
 * @param {number} opts.retries
 */
async function focusCurrentWithRetry({ selectAll = false, retries = 12 } = {}) {
  // 先等渲染
  await nextTick()
  await nextTick()

  for (let i = 0; i < retries; i++) {
    const el = activeInputEl.value
    if (el && typeof el.focus === 'function') {
      el.focus()
      if (selectAll && typeof el.select === 'function') el.select()
      return true
    }
    // 下一帧再试（比 setTimeout 更贴近渲染节奏）
    await new Promise((r) => requestAnimationFrame(r))
  }
  return false
}

// ── 纯标点过滤 ──
function isPurePunctuationToken(token) {
  return /^[\s,.;:!?，。！？、]+$/.test(token || '')
}

const visibleWords = computed(() =>
  (practice.currentWords || []).filter((w) => !isPurePunctuationToken(w))
)

const visibleToRealIndex = computed(() => {
  const map = []
  const words = practice.currentWords || []
  for (let i = 0; i < words.length; i++) {
    if (!isPurePunctuationToken(words[i])) map.push(i)
  }
  return map
})

const realToVisibleIndex = computed(() => {
  const map = new Map()
  visibleToRealIndex.value.forEach((ri, vi) => map.set(ri, vi))
  return map
})

const visibleWordIndex = computed(() =>
  realToVisibleIndex.value.get(practice.currentWordIndex) ?? 0
)

function isCurrentVisible(vIdx) {
  return vIdx === visibleWordIndex.value
}

// ── 已输入缓存 ──
const typedByRealIndex = reactive({})

function getRealIdx(vIdx) {
  return visibleToRealIndex.value[vIdx]
}

function displayTextForVisible(vIdx) {
  const ri = getRealIdx(vIdx)
  return typeof ri === 'number' ? typedByRealIndex[ri] || '' : ''
}

// ── 精确测量单词宽度 ──
let measureCtx = null
function getMeasureCtx() {
  if (!measureCtx) {
    const c = document.createElement('canvas')
    measureCtx = c.getContext('2d')
  }
  return measureCtx
}

function wordWidth(word) {
  const ctx = getMeasureCtx()
  ctx.font = '800 48px sans-serif'
  const measured = ctx.measureText(word).width
  const px = measured + 24 + measured * 0.1
  const clamped = Math.min(Math.max(px, 80), 600)
  return `${Math.round(clamped)}px`
}

// ── 状态 class ──
function stateClass(vIdx) {
  const ri = getRealIdx(vIdx)
  const si = practice.currentSentenceIndex
  const state = practice.wordStates?.[si]?.[ri] || 'pending'
  return {
    good: state === 'correct',
    bad: state === 'wrong',
  }
}

// ── 导航 ──
function pick(vIdx) {
  const ri = getRealIdx(vIdx)
  if (typeof ri === 'number') {
    practice.setWordIndex(ri)
    practice.clearLastResult?.()
    text.value = typedByRealIndex[ri] || ''
    focusCurrent(true)
  }
}

function prevVisible() {
  const v = visibleWordIndex.value
  if (v > 0) pick(v - 1)
}

function nextVisible() {
  const v = visibleWordIndex.value
  if (v < visibleWords.value.length - 1) pick(v + 1)
}

function autoSkipPunctuation() {
  const words = practice.currentWords || []
  let idx = practice.currentWordIndex
  while (idx < words.length && isPurePunctuationToken(words[idx])) {
    practice.setWordIndex(idx + 1)
    idx = practice.currentWordIndex
  }
}

function playSentence() {
  emit('play-sentence')
}

// ── 输入 & Space 校验 ──
async function submitBySpace() {
  if (!text.value.trim()) return

  // 记录用户输入（用于回显历史词）
  typedByRealIndex[practice.currentWordIndex] = text.value

  // 记住提交前的句子索引，用于判断是否切句了
  const prevSentenceIdx = practice.currentSentenceIndex

  // 提交并让 store 更新状态 + 前进
  practice.submitWord(text.value)

  // 清空当前输入框内容
  text.value = ''

  // 若正在"显示答案"，强制关闭
  practice.setRevealText?.(false)

  // ✅ 如果句子没切换（还在同一句），才在这里做跳标点+聚焦
  //    如果句子切换了，交给 watch(currentSentenceIndex) 统一处理
  if (practice.currentSentenceIndex === prevSentenceIdx) {
    await nextTick()
    autoSkipPunctuation()
    await nextTick()
    focusCurrent()
  }
}

function onKeydown(e) {
  if (e.code === 'Space') {
    e.preventDefault()
    submitBySpace()
    return
  }
  // ✅ 已删除左右键切换逻辑的话，这里保持空即可
}

// ── watchers ──
watch(
  () => practice.currentSentenceIndex,
  async () => {
    // 清理本句缓存
    for (const k of Object.keys(typedByRealIndex)) delete typedByRealIndex[k]
    text.value = ''

    // 确保有可聚焦的 input
    practice.setRevealText?.(false)

    // 强制从第一个词开始
    practice.setWordIndex?.(0)

    await nextTick()
    autoSkipPunctuation()
    await nextTick()

    // ✅ 如果是"完成上一句最后一个词"自动切过来的，播放新句子音频
    if (practice.autoAdvancedSentence) {
      practice.consumeAutoAdvancedSentence?.()
      emit('play-sentence')
    }

    // ✅ 用可重试聚焦，确保新句子的 input 已挂载后再 focus
    await focusCurrentWithRetry({ selectAll: false })
  }
)

// 这个 watch 可以保留原逻辑（切词时一般没那么极端）
watch(
  () => practice.currentWordIndex,
  () => {
    text.value = typedByRealIndex[practice.currentWordIndex] || ''
    focusCurrent()
  }
)

onMounted(async () => {
  await nextTick()
  autoSkipPunctuation()
  await nextTick()
  await focusCurrentWithRetry({ selectAll: false })
})
</script>

<style scoped>
/* ===== 布局：左侧 sidebar + 右侧 main ===== */
.layout {
  min-height: 100vh;
  background: #f6f7fb;
  color: #111827;
  display: flex;
}

/* 遮罩（移动端） */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
  z-index: 20;
}

/* 侧边栏 */
.sidebar {
  width: 320px;
  flex: 0 0 320px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  z-index: 30;
  transition: none;
  box-sizing: border-box;
}

.sidebarHeader {
  padding: 12px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #eef2f7;
}

.sidebarTitle {
  font-size: 14px;
  font-weight: 800;
}

.collapseBtn {
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.sidebarBody {
  padding: 10px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
  box-sizing: border-box;
}

.sentenceItem {
  width: 100%;
  height: 44px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid #eef2f7;
  background: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
}

.sentenceItem.active {
  border-color: #111827;
  background: #f3f4f6;
}

.sentenceIndex {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: #111827;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  line-height: 1;
}

.sidebarFooter {
  padding: 10px 12px;
  border-top: 1px solid #eef2f7;
}

.sidebarHint {
  font-size: 12px;
  color: #6b7280;
}

/* 主区域 */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ✅ 顶部：三列网格布局（左按钮 / 中间标题 / 右按钮） */
.top {
  width: 100%;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  padding: 14px 16px 0 16px;
  box-sizing: border-box;
}

.sidebarToggle {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-size: 18px;
  justify-self: start;
}

.meta {
  font-size: 12px;
  color: #6b7280;
  justify-self: center;
}

/* ✅ 重新开始按钮：右上角 */
.restartBtn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  cursor: pointer;
  font-size: 18px;
  justify-self: end;
  display: grid;
  place-items: center;
}

.restartBtn:hover {
  background: #f3f4f6;
}

.page {
  min-height: calc(100vh - 54px);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px 22px 16px;
}

.center {
  flex: 1;
  width: 100%;
  max-width: 980px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.blanks {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 20px;
  padding: 10px 6px;
}

.blankWrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: none;
  transform: none;
}

.blankWrap.current {
  cursor: text;
}

.bar {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: rgba(17, 24, 39, 0.3);
  margin-top: 4px;
  transition: none;
}

.blankWrap.current .bar {
  background: rgba(17, 24, 39, 0.7);
}

.blankWrap.good .bar {
  background: rgba(22, 163, 74, 0.7);
}

.blankWrap.bad .bar {
  background: rgba(220, 38, 38, 0.7);
}

.lineInput {
  display: block;
  text-align: center;
  font-size: 48px;
  font-weight: 800;
  color: #111827;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
  margin: 0;
  caret-color: #111827;
  transition: none;
  transform: none;
}

.answer,
.typed,
.placeholder {
  font-size: 48px;
  font-weight: 800;
  user-select: none;
  white-space: nowrap;
}

.answer {
  color: #6b7280;
}

.placeholder {
  visibility: hidden;
}

.blankWrap.good .typed {
  color: #16a34a;
}
.blankWrap.bad .typed {
  color: #dc2626;
}
.blankWrap:not(.good):not(.bad) .typed {
  color: rgba(17, 24, 39, 0.6);
}

.result {
  font-size: 14px;
  font-weight: 700;
}
.result.ok {
  color: #16a34a;
}

/* ✅ 工具栏：紧跟在 result 下方，居中排列 */
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
}

.tool {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #111827;
  color: #fff;
  cursor: pointer;
  font-size: 18px;
}

.tool.ghost {
  background: #fff;
  color: #111827;
}

.tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tip {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

/* ====== 响应式 ====== */
@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    width: 320px;
    flex-basis: 320px;
    box-shadow: 0 10px 30px rgba(17, 24, 39, 0.18);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}

@media (min-width: 901px) {
  .sidebar:not(.open) {
    width: 64px;
    flex: 0 0 64px;
  }

  .sidebar:not(.open) .sidebarTitle,
  .sidebar:not(.open) .sidebarHint {
    display: none;
  }

  .sidebar:not(.open) .sidebarBody {
    padding: 10px 8px;
    grid-template-columns: 1fr;
  }

  .sidebar:not(.open) .collapseBtn {
    width: 44px;
    padding: 0;
  }
}
</style>