<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref, nextTick } from 'vue';
import { useReader } from '../composables/useReader';
import type { SpeedSettings, ReadingSession, StopPoint } from '../types';
import ProgressIndicator from './ProgressIndicator.vue';
import StopPointsHistory from './StopPointsHistory.vue';

const WORDS_PER_PAGE = 250;
const PREVIEW_CONTEXT_WORDS = 100;

const props = defineProps<{
  session: ReadingSession;
  settings: SpeedSettings;
  stopPoints: StopPoint[];
}>();

const emit = defineEmits<{
  progress: [wordIndex: number];
  stop: [wordIndex: number, context: string];
  back: [];
}>();

const showSkipControls = ref(false);
const showPreview = ref(false);
const previewRef = ref<HTMLElement | null>(null);

const {
  words,
  currentWord,
  currentWordIndex,
  isReading,
  totalWords,
  progress,
  estimatedPagesRemaining,
  wordsRemaining,
  startReading,
  stopReading,
  jumpToWord,
  setWordIndex,
} = useReader(
  () => props.session.content,
  () => props.settings,
  (index) => emit('progress', index),
  (index, context) => emit('stop', index, context)
);

// Initialize position from session
onMounted(() => {
  setWordIndex(props.session.currentWordIndex);
});

// Watch for session changes
watch(() => props.session.currentWordIndex, (newIndex) => {
  if (newIndex !== currentWordIndex.value) {
    setWordIndex(newIndex);
  }
});

// Preview window calculation
const previewStart = computed(() => Math.max(0, currentWordIndex.value - PREVIEW_CONTEXT_WORDS));
const previewEnd = computed(() => Math.min(words.value.length, currentWordIndex.value + PREVIEW_CONTEXT_WORDS + 1));

const previewWords = computed(() => {
  return words.value.slice(previewStart.value, previewEnd.value).map((word, i) => ({
    word,
    index: previewStart.value + i,
    isCurrent: previewStart.value + i === currentWordIndex.value,
  }));
});

// Scroll to keep current word in view
watch(currentWordIndex, () => {
  if (showPreview.value) {
    nextTick(() => {
      const currentEl = previewRef.value?.querySelector('.preview-word.current');
      if (currentEl) {
        currentEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }
});

// Skip controls
function skipPages(pages: number) {
  const wordsToSkip = pages * WORDS_PER_PAGE;
  const newIndex = Math.max(0, Math.min(totalWords.value - 1, currentWordIndex.value + wordsToSkip));
  jumpToWord(newIndex);
}

function jumpToPercent(percent: number) {
  const targetIndex = Math.floor((percent / 100) * totalWords.value);
  jumpToWord(Math.max(0, Math.min(totalWords.value - 1, targetIndex)));
}

function toggleSkipControls() {
  showSkipControls.value = !showSkipControls.value;
}

function togglePreview() {
  showPreview.value = !showPreview.value;
  if (showPreview.value) {
    nextTick(() => {
      const currentEl = previewRef.value?.querySelector('.preview-word.current');
      if (currentEl) {
        currentEl.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    });
  }
}

function handlePreviewWordClick(index: number) {
  jumpToWord(index);
}

// Touch/mouse handlers
function handleTouchStart(e: TouchEvent | MouseEvent) {
  e.preventDefault();
  startReading();
}

function handleTouchEnd(e: TouchEvent | MouseEvent) {
  e.preventDefault();
  stopReading();
}

// Keyboard support for testing
function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault();
    startReading();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault();
    stopReading();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});

function handleJumpToStop(wordIndex: number) {
  jumpToWord(wordIndex);
}

const currentPage = computed(() => Math.floor(currentWordIndex.value / WORDS_PER_PAGE) + 1);
const totalPages = computed(() => Math.ceil(totalWords.value / WORDS_PER_PAGE));
const isComplete = computed(() => currentWordIndex.value >= totalWords.value);

// Dynamic font size based on word length
const wordFontSize = computed(() => {
  const word = currentWord.value;
  const len = word.length;

  // Base size for short words (1-6 chars), shrink for longer words
  if (len <= 6) return '3rem';
  if (len <= 10) return '2.5rem';
  if (len <= 14) return '2rem';
  if (len <= 18) return '1.6rem';
  if (len <= 24) return '1.3rem';
  return '1rem';
});
</script>

<template>
  <div class="reader">
    <header class="reader-header">
      <button class="back-button" @click="emit('back')">
        ← Back
      </button>
      <h2 class="file-name">{{ session.fileName }}</h2>
      <button class="header-btn" @click="togglePreview" :class="{ active: showPreview }">
        Preview
      </button>
      <button class="header-btn" @click="toggleSkipControls" :class="{ active: showSkipControls }">
        Skip
      </button>
    </header>

    <ProgressIndicator
      :progress="progress"
      :current-word="currentWordIndex"
      :total-words="totalWords"
      :pages-remaining="estimatedPagesRemaining"
      :words-remaining="wordsRemaining"
    />

    <!-- Skip Controls Panel -->
    <div class="skip-controls" v-if="showSkipControls">
      <div class="skip-row">
        <button class="skip-btn" @click="skipPages(-10)">-10p</button>
        <button class="skip-btn" @click="skipPages(-5)">-5p</button>
        <button class="skip-btn" @click="skipPages(-1)">-1p</button>
        <span class="page-indicator">{{ currentPage }}/{{ totalPages }}</span>
        <button class="skip-btn" @click="skipPages(1)">+1p</button>
        <button class="skip-btn" @click="skipPages(5)">+5p</button>
        <button class="skip-btn" @click="skipPages(10)">+10p</button>
      </div>
      <div class="jump-row">
        <button class="jump-btn" @click="jumpToPercent(0)">Start</button>
        <button class="jump-btn" @click="jumpToPercent(10)">10%</button>
        <button class="jump-btn" @click="jumpToPercent(25)">25%</button>
        <button class="jump-btn" @click="jumpToPercent(50)">50%</button>
        <button class="jump-btn" @click="jumpToPercent(75)">75%</button>
        <button class="jump-btn" @click="jumpToPercent(90)">90%</button>
      </div>
    </div>

    <!-- Text Preview (collapsible, above reader) -->
    <div class="text-preview" v-if="showPreview" ref="previewRef">
      <span
        v-for="item in previewWords"
        :key="item.index"
        class="preview-word"
        :class="{ current: item.isCurrent }"
        @click="handlePreviewWordClick(item.index)"
      >{{ item.word }}</span>
    </div>

    <div
      class="reader-area"
      :class="{ 'is-reading': isReading, 'is-complete': isComplete }"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      @mousedown="handleTouchStart"
      @mouseup="handleTouchEnd"
      @mouseleave="stopReading"
    >
      <div class="word-display">
        <span v-if="isComplete" class="complete-message">
          Finished!
        </span>
        <span v-else class="current-word" :style="{ fontSize: wordFontSize }">{{ currentWord }}</span>
      </div>

      <p class="reader-hint" v-if="!isReading && !isComplete">
        Hold to read
      </p>
      <p class="reader-hint" v-else-if="!isComplete">
        Reading...
      </p>
    </div>

    <StopPointsHistory
      :stop-points="stopPoints"
      @jump="handleJumpToStop"
    />
  </div>
</template>

<style scoped>
.reader {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  gap: 1rem;
}

.reader-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.back-button {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.back-button:hover {
  background: var(--color-surface-hover);
}

.file-name {
  flex: 1;
  font-size: 1rem;
  color: var(--color-text-secondary);
  font-weight: normal;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.header-btn:hover,
.header-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.skip-controls {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skip-row,
.jump-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.skip-btn,
.jump-btn {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  min-width: 44px;
}

.skip-btn:hover,
.jump-btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.page-indicator {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  min-width: 60px;
  text-align: center;
}

/* Text Preview */
.text-preview {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
  max-height: 150px;
  overflow-y: auto;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.preview-word {
  cursor: pointer;
  padding: 0.1rem 0.15rem;
  border-radius: 2px;
  transition: background 0.1s;
}

.preview-word:hover {
  background: var(--color-surface-hover);
}

.preview-word.current {
  color: #ef4444;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.15);
}

.preview-word + .preview-word::before {
  content: ' ';
}

.reader-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  transition: all 0.15s ease;
  min-height: 150px;
  overflow: hidden;
}

.reader-area.is-reading {
  background: var(--color-primary-dim);
}

.reader-area.is-complete {
  background: var(--color-success-dim);
}

.word-display {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  max-width: 100%;
  overflow: hidden;
}

.current-word {
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  white-space: nowrap;
  line-height: 1.2;
}

.complete-message {
  font-size: 2rem;
  color: var(--color-success);
}

.reader-hint {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
</style>
