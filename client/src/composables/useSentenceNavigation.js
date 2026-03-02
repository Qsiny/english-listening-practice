import { ref } from 'vue';

export function useSentenceNavigation(sentences) {
    const currentIndex = ref(0);

    const nextSentence = () => {
        if (currentIndex.value < sentences.value.length - 1) {
            currentIndex.value++;
        }
    };

    const previousSentence = () => {
        if (currentIndex.value > 0) {
            currentIndex.value--;
        }
    };

    const getCurrentSentence = () => {
        return sentences.value[currentIndex.value];
    };

    return {
        currentIndex,
        nextSentence,
        previousSentence,
        getCurrentSentence,
    };
}