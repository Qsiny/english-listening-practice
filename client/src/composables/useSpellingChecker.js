// This file contains the spelling checker composable function for handling user input and providing feedback.

import { ref } from 'vue';

export function useSpellingChecker(correctWords) {
    const userInput = ref('');
    const currentWordIndex = ref(0);
    const feedback = ref([]);
    
    const checkSpelling = (input) => {
        const currentWord = correctWords[currentWordIndex.value];
        const isCorrect = input.trim().toLowerCase() === currentWord.toLowerCase();
        
        if (isCorrect) {
            feedback.value[currentWordIndex.value] = { word: currentWord, correct: true };
            currentWordIndex.value++;
            userInput.value = '';
        } else {
            feedback.value[currentWordIndex.value] = { word: currentWord, correct: false };
        }
    };

    const reset = () => {
        userInput.value = '';
        currentWordIndex.value = 0;
        feedback.value = [];
    };

    return {
        userInput,
        currentWordIndex,
        feedback,
        checkSpelling,
        reset
    };
}