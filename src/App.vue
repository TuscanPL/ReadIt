<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import FileUpload from './components/FileUpload.vue';
import Reader from './components/Reader.vue';
import Settings from './components/Settings.vue';
import SessionList from './components/SessionList.vue';
import { useStorage } from './composables/useStorage';
import { useTheme } from './composables/useTheme';

const {
  sessions,
  currentSession,
  stopPoints,
  settings,
  loadSessions,
  createSession,
  selectSession,
  deleteSession,
  updateProgress,
  addStopPoint,
  updateSettings,
  updateSpeedSettings,
} = useStorage();

const { setTheme } = useTheme();

const showSettings = ref(false);

type View = 'home' | 'reader';
const currentView = ref<View>('home');

// Watch settings.theme and sync with theme composable
watch(() => settings.value.theme, (newTheme) => {
  setTheme(newTheme);
}, { immediate: true });

onMounted(() => {
  loadSessions();
  // If there's a current session, go to reader
  if (currentSession.value) {
    currentView.value = 'reader';
  }
});

function handleFileLoaded(fileName: string, content: string, toc?: import('./types').TocEntry[]) {
  createSession(fileName, content, toc);
  currentView.value = 'reader';
}

function handleSelectSession(id: string) {
  selectSession(id);
  currentView.value = 'reader';
}

function handleDeleteSession(id: string) {
  deleteSession(id);
}

function handleProgress(wordIndex: number) {
  updateProgress(wordIndex);
}

function handleStop(wordIndex: number, context: string) {
  addStopPoint(wordIndex, context);
}

function handleBack() {
  currentView.value = 'home';
}

function handleUpdateSettings(newSettings: Parameters<typeof updateSettings>[0]) {
  updateSettings(newSettings);
}

function handleUpdateSpeedSettings(newSettings: Parameters<typeof updateSpeedSettings>[0]) {
  updateSpeedSettings(newSettings);
}

function openSettings() {
  showSettings.value = true;
}

function closeSettings() {
  showSettings.value = false;
}
</script>

<template>
  <div class="app">
    <!-- Home View -->
    <div v-if="currentView === 'home'" class="home-view">
      <header class="app-header">
        <h1 class="app-title">ReadIt</h1>
        <button class="settings-button" @click="openSettings" title="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </header>

      <main class="home-content">
        <FileUpload @file-loaded="handleFileLoaded" />

        <SessionList
          :sessions="sessions"
          @select="handleSelectSession"
          @delete="handleDeleteSession"
        />
      </main>
    </div>

    <!-- Reader View -->
    <Reader
      v-else-if="currentView === 'reader' && currentSession"
      :session="currentSession"
      :settings="settings.speed"
      :stop-points="stopPoints"
      @progress="handleProgress"
      @stop="handleStop"
      @back="handleBack"
      @update-settings="handleUpdateSpeedSettings"
    />

    <!-- Settings Panel -->
    <Settings
      v-if="showSettings"
      :settings="settings"
      @update-settings="handleUpdateSettings"
      @update-speed-settings="handleUpdateSpeedSettings"
      @close="closeSettings"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.home-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.app-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.settings-button {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-button:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.home-content {
  flex: 1;
}
</style>
