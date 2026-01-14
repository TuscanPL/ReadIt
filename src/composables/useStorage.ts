import { ref, onMounted } from 'vue';
import type { ReadingSession, StopPoint, AppSettings, TocEntry } from '../types';
import * as storage from '../services/storage';

export function useStorage() {
  const sessions = ref<ReadingSession[]>([]);
  const currentSession = ref<ReadingSession | null>(null);
  const stopPoints = ref<StopPoint[]>([]);
  const settings = ref<AppSettings>(storage.getSettings());

  function loadSessions() {
    sessions.value = storage.getSessions();
    currentSession.value = storage.getCurrentSession();
    if (currentSession.value) {
      stopPoints.value = storage.getStopPoints(currentSession.value.id);
    }
  }

  function createSession(fileName: string, content: string, toc?: TocEntry[]): ReadingSession {
    const session = storage.createSession(fileName, content, toc);
    loadSessions();
    return session;
  }

  function selectSession(id: string) {
    storage.setCurrentSession(id);
    loadSessions();
  }

  function deleteSession(id: string) {
    storage.deleteSession(id);
    loadSessions();
  }

  function updateProgress(wordIndex: number) {
    if (currentSession.value) {
      storage.updateSessionProgress(currentSession.value.id, wordIndex);
      currentSession.value.currentWordIndex = wordIndex;
    }
  }

  function addStopPoint(wordIndex: number, wordContext: string) {
    if (currentSession.value) {
      storage.addStopPoint(currentSession.value.id, { wordIndex, wordContext });
      stopPoints.value = storage.getStopPoints(currentSession.value.id);
    }
  }

  function jumpToStopPoint(wordIndex: number) {
    updateProgress(wordIndex);
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    storage.updateSettings(newSettings);
    settings.value = storage.getSettings();
  }

  function updateSpeedSettings(speedSettings: Partial<AppSettings['speed']>) {
    storage.updateSpeedSettings(speedSettings);
    settings.value = storage.getSettings();
  }

  onMounted(() => {
    loadSessions();
  });

  return {
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
    jumpToStopPoint,
    updateSettings,
    updateSpeedSettings,
  };
}
