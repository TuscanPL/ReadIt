import { ref, computed, onUnmounted } from 'vue';
import type { SpeedSettings } from '../types';
import { getWordCategory } from '../data/wordLists';

export function useReader(
  content: () => string,
  settings: () => SpeedSettings,
  onProgress: (wordIndex: number) => void,
  onStop: (wordIndex: number, context: string) => void
) {
  const words = computed(() => {
    const text = content();
    if (!text) return [];
    return text.trim().split(/\s+/);
  });

  const currentWordIndex = ref(0);
  const isReading = ref(false);
  const isPressing = ref(false);

  let animationFrameId: number | null = null;
  let lastWordTime = 0;

  const currentWord = computed(() => words.value[currentWordIndex.value] || '');

  const totalWords = computed(() => words.value.length);

  const progress = computed(() => {
    if (totalWords.value === 0) return 0;
    return (currentWordIndex.value / totalWords.value) * 100;
  });

  const estimatedPagesRemaining = computed(() => {
    const wordsPerPage = 250; // Standard words per page
    const remaining = totalWords.value - currentWordIndex.value;
    return Math.ceil(remaining / wordsPerPage);
  });

  const wordsRemaining = computed(() => totalWords.value - currentWordIndex.value);

  function getWordContext(index: number): string {
    const contextSize = 3;
    const start = Math.max(0, index - contextSize);
    const end = Math.min(words.value.length, index + contextSize + 1);
    const contextWords = words.value.slice(start, end);
    const currentPos = index - start;

    return contextWords
      .map((w, i) => (i === currentPos ? `[${w}]` : w))
      .join(' ');
  }

  function getDelayForWord(word: string): number {
    const baseDelay = 60000 / settings().baseWpm; // ms per word at base WPM

    if (!settings().adaptiveSpeedEnabled) {
      return baseDelay;
    }

    const category = getWordCategory(word);
    let multiplier = 1;

    switch (category) {
      case 'top1k':
        multiplier = settings().top1kMultiplier;
        break;
      case 'top10k':
        multiplier = settings().top10kMultiplier;
        break;
      case 'other':
        multiplier = settings().otherMultiplier;
        break;
    }

    // Lower multiplier = faster, so we divide
    // If top1k is 1.0, delay stays same
    // If other is 0.5, delay becomes 2x (slower)
    return baseDelay / multiplier;
  }

  function tick(timestamp: number) {
    if (!isPressing.value || currentWordIndex.value >= words.value.length) {
      isReading.value = false;
      return;
    }

    if (!lastWordTime) {
      lastWordTime = timestamp;
    }

    const currentDelay = getDelayForWord(currentWord.value);
    const elapsed = timestamp - lastWordTime;

    if (elapsed >= currentDelay) {
      currentWordIndex.value++;
      lastWordTime = timestamp;
      onProgress(currentWordIndex.value);
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  function startReading() {
    if (currentWordIndex.value >= words.value.length) {
      return;
    }
    isPressing.value = true;
    isReading.value = true;
    lastWordTime = 0;
    animationFrameId = requestAnimationFrame(tick);
  }

  function stopReading() {
    if (isPressing.value && isReading.value) {
      const context = getWordContext(currentWordIndex.value);
      onStop(currentWordIndex.value, context);
    }
    isPressing.value = false;
    isReading.value = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function jumpToWord(index: number) {
    currentWordIndex.value = Math.max(0, Math.min(index, words.value.length - 1));
    onProgress(currentWordIndex.value);
  }

  function reset() {
    stopReading();
    currentWordIndex.value = 0;
  }

  function setWordIndex(index: number) {
    currentWordIndex.value = index;
  }

  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  return {
    words,
    currentWord,
    currentWordIndex,
    isReading,
    isPressing,
    totalWords,
    progress,
    estimatedPagesRemaining,
    wordsRemaining,
    startReading,
    stopReading,
    jumpToWord,
    reset,
    setWordIndex,
    getWordContext,
  };
}
