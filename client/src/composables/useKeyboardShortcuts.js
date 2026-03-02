// This file contains the implementation of keyboard shortcuts for the application.

import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useKeyboardShortcuts(playAudio, replaySentence, nextSentence, previousSentence) {
    const isPlaying = ref(false);

    const handleKeydown = (event) => {
        switch (event.code) {
            case 'Space':
                isPlaying.value = !isPlaying.value;
                playAudio(isPlaying.value);
                break;
            case 'KeyR':
                replaySentence();
                break;
            case 'ArrowUp':
                previousSentence();
                break;
            case 'ArrowDown':
                nextSentence();
                break;
            default:
                break;
        }
    };

    onMounted(() => {
        window.addEventListener('keydown', handleKeydown);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('keydown', handleKeydown);
    });
}