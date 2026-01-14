<script setup lang="ts">
import type { TocEntry } from '../types';

const props = defineProps<{
  toc: TocEntry[];
  currentWordIndex: number;
}>();

const emit = defineEmits<{
  jump: [wordIndex: number];
  close: [];
}>();

// Find the current chapter based on word index
function getCurrentChapter(): number {
  for (let i = props.toc.length - 1; i >= 0; i--) {
    const entry = props.toc[i];
    if (entry && props.currentWordIndex >= entry.wordIndex) {
      return i;
    }
  }
  return 0;
}

function handleChapterClick(entry: TocEntry) {
  emit('jump', entry.wordIndex);
  emit('close');
}
</script>

<template>
  <div class="toc-overlay" @click.self="emit('close')">
    <div class="toc-panel">
      <header class="toc-header">
        <h2>Table of Contents</h2>
        <button class="close-button" @click="emit('close')">×</button>
      </header>

      <div class="toc-content">
        <ul class="toc-list">
          <li
            v-for="(entry, index) in toc"
            :key="index"
            class="toc-item"
            :class="{
              'is-current': index === getCurrentChapter(),
              [`level-${entry.level}`]: true
            }"
            @click="handleChapterClick(entry)"
          >
            <span class="toc-title">{{ entry.title }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.toc-panel {
  background: var(--color-background);
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toc-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.toc-content {
  overflow-y: auto;
  padding: 0.5rem 0;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-item {
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--color-text);
  border-left: 3px solid transparent;
}

.toc-item:hover {
  background: var(--color-surface-hover);
}

.toc-item.is-current {
  background: var(--color-primary-dim);
  border-left-color: var(--color-primary);
  font-weight: 600;
}

/* Indentation for nested levels */
.toc-item.level-1 {
  padding-left: 1.25rem;
}

.toc-item.level-2 {
  padding-left: 2rem;
  font-size: 0.95rem;
}

.toc-item.level-3 {
  padding-left: 2.75rem;
  font-size: 0.9rem;
}

.toc-item.level-4 {
  padding-left: 3.5rem;
  font-size: 0.85rem;
}

.toc-title {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
