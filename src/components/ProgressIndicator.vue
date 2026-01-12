<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  progress: number;
  currentWord: number;
  totalWords: number;
  pagesRemaining: number;
  wordsRemaining: number;
}>();

const progressPercent = computed(() => props.progress.toFixed(1));
</script>

<template>
  <div class="progress-indicator">
    <div class="progress-bar-container">
      <div
        class="progress-bar"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <div class="progress-stats">
      <span class="stat">
        <span class="stat-value">{{ progressPercent }}%</span>
        <span class="stat-label">complete</span>
      </span>
      <span class="stat">
        <span class="stat-value">{{ currentWord }}</span>
        <span class="stat-label">/ {{ totalWords }} words</span>
      </span>
      <span class="stat">
        <span class="stat-value">~{{ pagesRemaining }}</span>
        <span class="stat-label">pages left</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.progress-indicator {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1rem;
}

.progress-bar-container {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 100%;
  background: var(--color-primary);
  border-radius: 4px;
  transition: width 0.1s ease-out;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>
