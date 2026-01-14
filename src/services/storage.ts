import type { StorageData, ReadingSession, StopPoint, AppSettings, TocEntry } from '../types';

const STORAGE_KEY = 'readit_data';
const MAX_STOP_POINTS = 10;

const defaultSettings: AppSettings = {
  speed: {
    baseWpm: 350,
    top1kMultiplier: 1.0,
    top10kMultiplier: 0.7,
    otherMultiplier: 0.5,
    punctuationMultiplier: 0.5,
    adaptiveSpeedEnabled: true,
    orpEnabled: false,
    orpOffset: 10,
  },
  theme: 'dark',
};

const defaultData: StorageData = {
  sessions: [],
  currentSessionId: null,
  stopPoints: {},
  settings: defaultSettings,
};

function loadData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as StorageData;
    // Ensure settings exist (migration)
    if (!parsed.settings) {
      parsed.settings = defaultSettings;
    }
    return parsed;
  } catch {
    return { ...defaultData };
  }
}

function saveData(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getSessions(): ReadingSession[] {
  return loadData().sessions;
}

export function getSession(id: string): ReadingSession | undefined {
  return loadData().sessions.find(s => s.id === id);
}

export function getCurrentSession(): ReadingSession | null {
  const data = loadData();
  if (!data.currentSessionId) return null;
  return data.sessions.find(s => s.id === data.currentSessionId) || null;
}

export function setCurrentSession(id: string | null): void {
  const data = loadData();
  data.currentSessionId = id;
  saveData(data);
}

export function createSession(fileName: string, content: string, toc?: TocEntry[]): ReadingSession {
  const data = loadData();
  const words = content.trim().split(/\s+/);

  const session: ReadingSession = {
    id: crypto.randomUUID(),
    fileName,
    content,
    currentWordIndex: 0,
    totalWords: words.length,
    toc,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  data.sessions.push(session);
  data.currentSessionId = session.id;
  data.stopPoints[session.id] = [];
  saveData(data);

  return session;
}

export function updateSessionProgress(sessionId: string, wordIndex: number): void {
  const data = loadData();
  const session = data.sessions.find(s => s.id === sessionId);
  if (session) {
    session.currentWordIndex = wordIndex;
    session.updatedAt = Date.now();
    saveData(data);
  }
}

export function deleteSession(id: string): void {
  const data = loadData();
  data.sessions = data.sessions.filter(s => s.id !== id);
  delete data.stopPoints[id];
  if (data.currentSessionId === id) {
    data.currentSessionId = null;
  }
  saveData(data);
}

export function addStopPoint(sessionId: string, stopPoint: Omit<StopPoint, 'timestamp'>): void {
  const data = loadData();
  if (!data.stopPoints[sessionId]) {
    data.stopPoints[sessionId] = [];
  }

  const fullStopPoint: StopPoint = {
    ...stopPoint,
    timestamp: Date.now(),
  };

  data.stopPoints[sessionId].push(fullStopPoint);

  // Keep only last MAX_STOP_POINTS
  if (data.stopPoints[sessionId].length > MAX_STOP_POINTS) {
    data.stopPoints[sessionId] = data.stopPoints[sessionId].slice(-MAX_STOP_POINTS);
  }

  saveData(data);
}

export function getStopPoints(sessionId: string): StopPoint[] {
  const data = loadData();
  return data.stopPoints[sessionId] || [];
}

export function getSettings(): AppSettings {
  return loadData().settings;
}

export function updateSettings(settings: Partial<AppSettings>): void {
  const data = loadData();
  data.settings = { ...data.settings, ...settings };
  saveData(data);
}

export function updateSpeedSettings(speedSettings: Partial<AppSettings['speed']>): void {
  const data = loadData();
  data.settings.speed = { ...data.settings.speed, ...speedSettings };
  saveData(data);
}
