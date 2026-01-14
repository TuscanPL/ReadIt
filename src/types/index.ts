export interface TocEntry {
  title: string;
  wordIndex: number;
  level: number;
}

export interface ReadingSession {
  id: string;
  fileName: string;
  content: string;
  currentWordIndex: number;
  totalWords: number;
  toc?: TocEntry[];  // Table of contents (for EPUBs)
  createdAt: number;
  updatedAt: number;
}

export interface StopPoint {
  wordIndex: number;
  timestamp: number;
  wordContext: string; // The word and surrounding context
}

export interface SpeedSettings {
  baseWpm: number;
  top1kMultiplier: number;    // Default 1.0
  top10kMultiplier: number;   // Default 0.7
  otherMultiplier: number;    // Default 0.5
  punctuationMultiplier: number; // Default 0.5 (slower for sentence endings)
  adaptiveSpeedEnabled: boolean;
  orpEnabled: boolean;        // Optimal Recognition Point mode
  orpOffset: number;          // Left offset percentage (0-50), default 10
}

export interface AppSettings {
  speed: SpeedSettings;
  theme: 'dark' | 'light' | 'system';
}

export interface StorageData {
  sessions: ReadingSession[];
  currentSessionId: string | null;
  stopPoints: Record<string, StopPoint[]>; // sessionId -> stopPoints
  settings: AppSettings;
}

export type WordCategory = 'top1k' | 'top10k' | 'other';
