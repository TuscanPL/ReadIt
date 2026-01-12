<script setup lang="ts">
import { computed } from 'vue';
import type { StopPoint } from '../types';

const props = defineProps<{
  stopPoints: StopPoint[];
}>();

const emit = defineEmits<{
  jump: [wordIndex: number];
}>();

const sortedStopPoints = computed(() => {
  return [...props.stopPoints].sort((a, b) => b.timestamp - a.timestamp);
});

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function handleJump(wordIndex: number) {
  emit('jump', wordIndex);
}
</script>

<template>
  <div class="stop-points" v-if="stopPoints.length > 0">
    <h3 class="stop-points-title">Recent Stops</h3>
    <div class="stop-points-list">
      <button
        v-for="point in sortedStopPoints"
        :key="point.timestamp"
        class="stop-point-item"
        @click="handleJump(point.wordIndex)"
      >
        <span class="stop-point-time">{{ formatTime(point.timestamp) }}</span>
        <span class="stop-point-context">{{ point.wordContext }}</span>
        <span class="stop-point-word">Word #{{ point.wordIndex }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.stop-points {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.stop-points-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}

.stop-points-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stop-point-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  color: var(--color-text);
}

.stop-point-item:hover {
  background: var(--color-surface-hover);
}

.stop-point-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.stop-point-context {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stop-point-word {
  font-size: 0.75rem;
  color: var(--color-primary);
  white-space: nowrap;
}
</style>
