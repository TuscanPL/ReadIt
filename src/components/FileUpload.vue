<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  fileLoaded: [fileName: string, content: string];
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;

  const file = e.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    processFile(file);
  }
}

function processFile(file: File) {
  if (!file.name.endsWith('.txt')) {
    alert('Please select a .txt file');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    emit('fileLoaded', file.name, content);
  };
  reader.readAsText(file);
}

function openFilePicker() {
  fileInput.value?.click();
}
</script>

<template>
  <div
    class="file-upload"
    :class="{ 'is-dragging': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="openFilePicker"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".txt"
      @change="handleFileSelect"
      hidden
    />
    <div class="upload-content">
      <div class="upload-icon">📄</div>
      <p class="upload-text">
        <span v-if="isDragging">Drop your file here</span>
        <span v-else>Tap to select or drag a .txt file</span>
      </p>
      <p class="upload-hint">Supported format: .txt</p>
    </div>
  </div>
</template>

<style scoped>
.file-upload {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-surface);
}

.file-upload:hover,
.file-upload.is-dragging {
  border-color: var(--color-primary);
  background: var(--color-surface-hover);
}

.upload-content {
  pointer-events: none;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-text {
  font-size: 1.125rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.upload-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
</style>
