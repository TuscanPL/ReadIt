<script setup lang="ts">
import { computed } from 'vue';
import type { ReadingSession } from '../types';

const props = defineProps<{
  sessions: ReadingSession[];
}>();

const emit = defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();

const sortedSessions = computed(() => {
  return [...props.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
});

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getProgress(session: ReadingSession): number {
  if (session.totalWords === 0) return 0;
  return Math.round((session.currentWordIndex / session.totalWords) * 100);
}

function handleDelete(e: Event, id: string) {
  e.stopPropagation();
  if (confirm('Delete this reading session?')) {
    emit('delete', id);
  }
}
</script>

<template>
  <div class="session-list" v-if="sessions.length > 0">
    <h3 class="session-list-title">Continue Reading</h3>
    <div class="sessions">
      <button
        v-for="session in sortedSessions"
        :key="session.id"
        class="session-item"
        @click="emit('select', session.id)"
      >
        <div class="session-info">
          <span class="session-name">{{ session.fileName }}</span>
          <span class="session-meta">
            {{ getProgress(session) }}% • {{ formatDate(session.updatedAt) }}
          </span>
        </div>
        <div class="session-progress">
          <div
            class="session-progress-bar"
            :style="{ width: `${getProgress(session)}%` }"
          ></div>
        </div>
        <button
          class="delete-button"
          @click="handleDelete($event, session.id)"
          title="Delete session"
        >
          ×
        </button>
      </button>
    </div>
  </div>
</template>

<style scoped>
.session-list {
  margin-top: 2rem;
}

.session-list-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.sessions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  color: var(--color-text);
}

.session-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.session-progress {
  width: 60px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.session-progress-bar {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.delete-button {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.2s, color 0.2s;
}

.delete-button:hover {
  opacity: 1;
  color: var(--color-error);
}
</style>
