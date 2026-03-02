<template>
  <div class="keyboard-shortcuts">
    <h2>快捷键操作</h2>
    <ul>
      <li><strong>Space</strong>: 播放 / 暂停</li>
      <li><strong>R</strong>: 重播当前句子</li>
      <li><strong>↑</strong>: 上一句</li>
      <li><strong>↓</strong>: 下一句</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'KeyboardShortcuts',
};
</script>

<style scoped>
.keyboard-shortcuts {
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.keyboard-shortcuts h2 {
  margin-bottom: 10px;
}

.keyboard-shortcuts ul {
  list-style-type: none;
  padding: 0;
}

.keyboard-shortcuts li {
  margin: 5px 0;
}
</style>