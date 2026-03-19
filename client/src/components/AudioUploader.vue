<template>
  <div class="audio-uploader">
    <div
      class="upload-area"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
      :class="{ dragging: isDragging }"
    >
      <input
        type="file"
        ref="fileInput"
        accept=".mp3,.wav,.m4a"
        @change="handleFileSelect"
        style="display: none"
      />
      <div v-if="!uploading && !uploaded && !errorMsg" class="upload-prompt" @click="$refs.fileInput.click()">
        <p class="upload-icon">📁</p>
        <p>点击或拖拽上传音频文件</p>
        <p class="upload-hint">支持 mp3 / wav / m4a 格式</p>
      </div>
      <div v-if="uploading" class="upload-status">
        <p class="loading-icon">⏳</p>
        <p>正在转写中，请耐心等待...</p>
        <p class="upload-hint">{{ statusText }}</p>
        <p class="upload-hint">已等待 {{ elapsedTime }} 秒</p>
      </div>
      <div v-if="uploaded" class="upload-success">
        <p>✅ 转写完成！共 {{ sentenceCount }} 个句子</p>
        <button class="btn-secondary" @click="reset">重新上传</button>
      </div>
      <div v-if="errorMsg" class="upload-error">
        <p>❌ {{ errorMsg }}</p>
        <button @click="reset">重试</button>
      </div>
    </div>
  </div>

  <div class="history">
    <div class="history-header">
      <h3>历史记录</h3>
      <button class="btn-secondary" @click="loadHistory" :disabled="historyLoading">刷新</button>
    </div>

    <div v-if="historyLoading" class="history-hint">加载中...</div>
    <div v-else-if="historyError" class="history-error">{{ historyError }}</div>
    <div v-else-if="historyItems.length === 0" class="history-hint">暂无历史记录</div>

    <ul v-else class="history-list">
      <li v-for="item in historyItems" :key="item.id" class="history-item">
        <div class="history-main" @click="openHistory(item)">
          <div class="history-name">{{ item.originalname }}</div>
          <div class="history-meta">
            <span>{{ formatTime(item.uploadedAt) }}</span>
            <span> · {{ item.sentenceCount }} 句</span>
            <span> · {{ (item.size / 1024).toFixed(1) }} KB</span>
          </div>
        </div>
        <button @click="openHistory(item)">开始练习</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePracticeStore } from '../stores/practiceStore'
import { useAudioStore } from '../stores/audioStore'

const practiceStore = usePracticeStore()
const audioStore = useAudioStore()

const fileInput = ref(null)
const isDragging = ref(false)
const uploading = ref(false)
const uploaded = ref(false)
const errorMsg = ref('')
const sentenceCount = ref(0)
const statusText = ref('正在上传文件...')
const elapsedTime = ref(0)
let timer = null

const historyItems = ref([])
const historyLoading = ref(false)
const historyError = ref('')

function startTimer() {
  elapsedTime.value = 0
  timer = setInterval(() => {
    elapsedTime.value++
    if (elapsedTime.value < 5) {
      statusText.value = '正在上传文件...'
    } else if (elapsedTime.value < 15) {
      statusText.value = '文件已上传，AI 正在识别语音...'
    } else if (elapsedTime.value < 60) {
      statusText.value = '正在转写中，较长音频需要更多时间...'
    } else {
      statusText.value = '仍在处理中，请继续等待...'
    }
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(() => loadHistory())
onUnmounted(() => stopTimer())

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString()
}

async function loadHistory() {
  historyLoading.value = true
  historyError.value = ''
  try {
    const resp = await fetch('/api/history')
    if (!resp.ok) throw new Error(`服务器返回 ${resp.status}`)
    const json = await resp.json()
    historyItems.value = json?.data || []
  } catch (e) {
    historyError.value = e?.message || '历史记录加载失败'
  } finally {
    historyLoading.value = false
  }
}

async function openHistory(item) {
  try {
    const resp = await fetch(`/api/history/${encodeURIComponent(item.id)}`)
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.error || `服务器返回 ${resp.status}`)
    }
    const json = await resp.json()
    practiceStore.setSentences(json.data.sentences)
    audioStore.setAudioUrl(json.data.audioUrl)
  } catch (e) {
    errorMsg.value = e?.message || '打开历史失败'
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) uploadFile(file)
}

function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) uploadFile(file)
}

async function uploadFile(file) {
  const validExts = ['.mp3', '.wav', '.m4a']
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!validExts.includes(ext)) {
    errorMsg.value = '不支持的文件格式，请上传 mp3/wav/m4a 文件'
    return
  }

  uploading.value = true
  uploaded.value = false
  errorMsg.value = ''
  startTimer()

  try {
    const formData = new FormData()
    formData.append('audio', file)

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `服务器返回 ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      practiceStore.setSentences(result.data.sentences)
      audioStore.setAudioFile(file)
      sentenceCount.value = result.data.sentences.length
      uploaded.value = true
    } else {
      throw new Error(result.error || '转写失败')
    }
  } catch (err) {
    errorMsg.value = err.message || '上传失败，请检查服务器是否启动'
  } finally {
    uploading.value = false
    stopTimer()
  }
}

function reset() {
  uploading.value = false
  uploaded.value = false
  errorMsg.value = ''
  sentenceCount.value = 0
  statusText.value = '正在上传文件...'
  elapsedTime.value = 0
  if (fileInput.value) fileInput.value.value = ''
  loadHistory()
}
</script>

<style scoped>
.audio-uploader {
  margin: 20px 0;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-area:hover,
.upload-area.dragging {
  border-color: #409eff;
  background: #ecf5ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.loading-icon {
  font-size: 36px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.upload-hint {
  color: #999;
  font-size: 13px;
  margin-top: 6px;
}

.upload-status {
  color: #e6a23c;
  font-size: 16px;
}

.upload-success {
  color: #67c23a;
  font-size: 16px;
}

.upload-error {
  color: #f56c6c;
  font-size: 16px;
}

button {
  margin-top: 12px;
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: #409eff;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #66b1ff;
}

.btn-secondary {
  background: #909399;
}

.btn-secondary:hover {
  background: #a6a9ad;
}

.history {
  margin-top: 24px;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 16px;
  background: white;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid #f1f1f1;
}

.history-item:first-child {
  border-top: none;
}

.history-main {
  flex: 1;
  cursor: pointer;
}

.history-name {
  font-weight: 600;
}

.history-meta {
  color: #888;
  font-size: 12px;
  margin-top: 4px;
}

.history-hint {
  color: #999;
  font-size: 13px;
}

.history-error {
  color: #f56c6c;
  font-size: 13px;
}
</style>