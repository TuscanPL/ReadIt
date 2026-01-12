<script setup lang="ts">
import { ref } from 'vue';
import { parseEpub } from '../services/epubParser';

const emit = defineEmits<{
  fileLoaded: [fileName: string, content: string];
}>();

const isDragging = ref(false);
const isLoading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const SUPPORTED_EXTENSIONS = ['.txt', '.epub'];

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

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
}

async function processFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    alert(`Please select a supported file format: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    return;
  }

  isLoading.value = true;

  try {
    if (extension === '.epub') {
      const result = await parseEpub(file);
      const displayName = result.metadata.title || file.name;
      emit('fileLoaded', displayName, result.text);
    } else {
      // .txt file
      const content = await readTextFile(file);
      emit('fileLoaded', file.name, content);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    alert(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    isLoading.value = false;
  }
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function openFilePicker() {
  if (!isLoading.value) {
    fileInput.value?.click();
  }
}
</script>

<template>
  <div
    class="file-upload"
    :class="{ 'is-dragging': isDragging, 'is-loading': isLoading }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="openFilePicker"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".txt,.epub"
      @change="handleFileSelect"
      hidden
    />
    <div class="upload-content">
      <div class="upload-icon" v-if="!isLoading">📄</div>
      <div class="upload-spinner" v-else></div>
      <p class="upload-text">
        <span v-if="isLoading">Processing file...</span>
        <span v-else-if="isDragging">Drop your file here</span>
        <span v-else>Tap to select or drag a file</span>
      </p>
      <p class="upload-hint">Supported: .txt, .epub</p>
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

.file-upload.is-loading {
  cursor: wait;
  opacity: 0.8;
}

.upload-content {
  pointer-events: none;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
