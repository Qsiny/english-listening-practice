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
      <!-- 顶部条：增加一个打开侧边栏按钮 -->
      <div class="top">
        <button class="sidebarToggle" @click="sidebarOpen = !sidebarOpen" title="句子列表">
          ☰
        </button>

        <div class="meta">
          句子 {{ practice.currentSentenceIndex + 1 }} / {{ practice.sentences.length }}
        </div>
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

          <div
            class="result"
            v-if="practice.lastResult"
            :class="{ ok: practice.lastResult.ok, bad: !practice.lastResult.ok }"
          >
            <span v-if="practice.lastResult.ok">✓ 正确</span>
            <span v-else>✗ 错误</span>
          </div>
        </div>

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

          <div class="spacer"></div>

          <button class="tool ghost" @click="$emit('restart')">↩</button>
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

  typedByRealIndex[practice.currentWordIndex] = text.value

  const r = practice.submitWord(text.value)

  if (r.ok) {
    text.value = ''
    autoSkipPunctuation()
    await nextTick()
    focusCurrent()
  } else {
    await nextTick()
    focusCurrent(true)
  }
}

function onKeydown(e) {
  if (e.code === 'Space') {
    e.preventDefault()
    submitBySpace()
    return
  }
}

// ── watchers ──
watch(
  () => practice.currentSentenceIndex,
  () => {
    for (const k of Object.keys(typedByRealIndex)) delete typedByRealIndex[k]
    text.value = ''
    nextTick(() => {
      autoSkipPunctuation()
      focusCurrent()
    })
  }
)

watch(
  () => practice.currentWordIndex,
  () => {
    text.value = typedByRealIndex[practice.currentWordIndex] || ''
    focusCurrent()
  }
)

onMounted(() => {
  // 小屏默认收起
  if (window.innerWidth <= 900) sidebarOpen.value = false
  autoSkipPunctuation()
  focusCurrent()
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

/* 句子列表：用网格，更稳定；展开时显示两列 */
.sidebarBody {
  padding: 10px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
  box-sizing: border-box;
}

/* 句子按钮：做成正方形/圆角块，只显示数字，避免内外层边框“挤压重叠” */
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

  /* 去掉默认按钮样式差异（Safari 上尤其明显） */
  appearance: none;
  -webkit-appearance: none;
}

.sentenceItem.active {
  border-color: #111827;
  background: #f3f4f6;
}

/* 数字徽标：不要再用额外 margin，避免收起时与按钮边框重叠 */
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
}

/* 顶部：加一个 toggle */
.top {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 0 16px;
  justify-content: center;
}

.sidebarToggle {
  position: absolute;
  left: 14px;
  top: 14px;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
}

.meta {
  font-size: 12px;
  color: #6b7280;
}

/* 你的原 page 内容容器稍微调整到 main 内 */
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

/* ====== 你原来的样式（基本不动） ====== */
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
.result.bad {
  color: #dc2626;
}

.toolbar {
  width: 100%;
  max-width: 980px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 12px 0;
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

.spacer {
  width: 18px;
}

.tip {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

/* ====== 响应式：小屏侧边栏变抽屉，可收起 ====== */
@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    width: 320px;
    flex-basis: 320px;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebarToggle {
    position: fixed;
    left: 12px;
    top: 12px;
    z-index: 10;
  }

  .top {
    padding-top: 14px;
  }
}

/* 桌面：允许“收起”成窄条（不占太多空间） */
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

/* 移动端抽屉：保持原逻辑，只补一个阴影便于分层 */
@media (max-width: 900px) {
  .sidebar {
    box-shadow: 0 10px 30px rgba(17, 24, 39, 0.18);
  }
}
</style>