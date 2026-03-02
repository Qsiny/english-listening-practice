<template>
  <div class="spelling-feedback">
    <div v-if="feedback.length" class="feedback-container">
      <p v-for="(item, index) in feedback" :key="index" :class="{'correct': item.isCorrect, 'incorrect': !item.isCorrect}">
        {{ item.word }} <span v-if="!item.isCorrect" class="error-message">({{ item.errorMessage }})</span>
      </p>
    </div>
    <div v-else>
      <p>No feedback available.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SpellingFeedback',
  props: {
    feedback: {
      type: Array,
      required: true
    }
  }
}
</script>

<style scoped>
.spelling-feedback {
  margin-top: 20px;
}

.feedback-container {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
}

.correct {
  color: green;
}

.incorrect {
  color: red;
}

.error-message {
  font-style: italic;
}
</style>