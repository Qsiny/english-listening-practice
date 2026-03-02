import { ref } from 'vue';

export function useAudioPlayer() {
    const audio = ref(new Audio());
    const isPlaying = ref(false);
    const currentSentenceIndex = ref(0);
    const sentences = ref([]);

    const loadAudio = (url) => {
        audio.value.src = url;
        audio.value.load();
    };

    const play = () => {
        audio.value.play();
        isPlaying.value = true;
    };

    const pause = () => {
        audio.value.pause();
        isPlaying.value = false;
    };

    const playCurrentSentence = () => {
        if (sentences.value[currentSentenceIndex.value]) {
            const { start, end } = sentences.value[currentSentenceIndex.value];
            audio.value.currentTime = start;
            audio.value.play();
            setTimeout(() => {
                pause();
            }, (end - start) * 1000);
        }
    };

    const nextSentence = () => {
        if (currentSentenceIndex.value < sentences.value.length - 1) {
            currentSentenceIndex.value++;
            playCurrentSentence();
        }
    };

    const previousSentence = () => {
        if (currentSentenceIndex.value > 0) {
            currentSentenceIndex.value--;
            playCurrentSentence();
        }
    };

    const setSentences = (newSentences) => {
        sentences.value = newSentences;
        currentSentenceIndex.value = 0;
    };

    return {
        audio,
        isPlaying,
        loadAudio,
        play,
        pause,
        playCurrentSentence,
        nextSentence,
        previousSentence,
        setSentences,
    };
}