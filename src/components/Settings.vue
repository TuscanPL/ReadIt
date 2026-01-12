<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AppSettings, SpeedSettings } from '../types';

const props = defineProps<{
  settings: AppSettings;
}>();

const emit = defineEmits<{
  updateSettings: [settings: Partial<AppSettings>];
  updateSpeedSettings: [settings: Partial<SpeedSettings>];
  close: [];
}>();

// Local copies for editing
const baseWpm = ref(props.settings.speed.baseWpm);
const top1kMultiplier = ref(props.settings.speed.top1kMultiplier);
const top10kMultiplier = ref(props.settings.speed.top10kMultiplier);
const otherMultiplier = ref(props.settings.speed.otherMultiplier);
const punctuationMultiplier = ref(props.settings.speed.punctuationMultiplier);
const adaptiveSpeedEnabled = ref(props.settings.speed.adaptiveSpeedEnabled);
const orpOffset = ref(props.settings.speed.orpOffset ?? 10);
const theme = ref(props.settings.theme);

// Watch for prop changes
watch(() => props.settings, (newSettings) => {
  baseWpm.value = newSettings.speed.baseWpm;
  top1kMultiplier.value = newSettings.speed.top1kMultiplier;
  top10kMultiplier.value = newSettings.speed.top10kMultiplier;
  otherMultiplier.value = newSettings.speed.otherMultiplier;
  punctuationMultiplier.value = newSettings.speed.punctuationMultiplier;
  adaptiveSpeedEnabled.value = newSettings.speed.adaptiveSpeedEnabled;
  orpOffset.value = newSettings.speed.orpOffset ?? 10;
  theme.value = newSettings.theme;
}, { deep: true });

function handleWpmChange(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value) || 350;
  baseWpm.value = Math.max(1, value);
  emit('updateSpeedSettings', { baseWpm: baseWpm.value });
}

function handleMultiplierChange(type: 'top1k' | 'top10k' | 'other' | 'punctuation', e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value) || 1;
  const clamped = Math.max(0.1, Math.min(2, value));

  switch (type) {
    case 'top1k':
      top1kMultiplier.value = clamped;
      emit('updateSpeedSettings', { top1kMultiplier: clamped });
      break;
    case 'top10k':
      top10kMultiplier.value = clamped;
      emit('updateSpeedSettings', { top10kMultiplier: clamped });
      break;
    case 'other':
      otherMultiplier.value = clamped;
      emit('updateSpeedSettings', { otherMultiplier: clamped });
      break;
    case 'punctuation':
      punctuationMultiplier.value = clamped;
      emit('updateSpeedSettings', { punctuationMultiplier: clamped });
      break;
  }
}

function toggleAdaptiveSpeed() {
  adaptiveSpeedEnabled.value = !adaptiveSpeedEnabled.value;
  emit('updateSpeedSettings', { adaptiveSpeedEnabled: adaptiveSpeedEnabled.value });
}

function handleOrpOffsetChange(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value) || 10;
  orpOffset.value = Math.max(0, Math.min(50, value));
  emit('updateSpeedSettings', { orpOffset: orpOffset.value });
}

function handleThemeChange(newTheme: 'dark' | 'light' | 'system') {
  theme.value = newTheme;
  emit('updateSettings', { theme: newTheme });
}
</script>

<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-panel">
      <header class="settings-header">
        <h2>Settings</h2>
        <button class="close-button" @click="emit('close')">×</button>
      </header>

      <div class="settings-content">
        <section class="settings-section">
          <h3>Reading Speed</h3>

          <div class="setting-item">
            <label for="wpm">Base WPM</label>
            <input
              id="wpm"
              type="number"
              :value="baseWpm"
              @change="handleWpmChange"
              min="1"
              class="input-field"
            />
          </div>
        </section>

        <section class="settings-section">
          <h3>Adaptive Speed</h3>

          <div class="setting-item toggle-item">
            <label for="adaptive">Enable adaptive speed</label>
            <button
              id="adaptive"
              class="toggle-button"
              :class="{ active: adaptiveSpeedEnabled }"
              @click="toggleAdaptiveSpeed"
            >
              {{ adaptiveSpeedEnabled ? 'ON' : 'OFF' }}
            </button>
          </div>

          <p class="setting-hint">
            Adjusts reading speed based on word complexity. Lower multiplier = slower reading.
          </p>

          <div class="multipliers" :class="{ disabled: !adaptiveSpeedEnabled }">
            <div class="setting-item">
              <label for="top1k">Top 1k words (common)</label>
              <input
                id="top1k"
                type="number"
                step="0.1"
                min="0.1"
                max="2"
                :value="top1kMultiplier"
                @change="handleMultiplierChange('top1k', $event)"
                :disabled="!adaptiveSpeedEnabled"
                class="input-field small"
              />
            </div>

            <div class="setting-item">
              <label for="top10k">Top 10k words (medium)</label>
              <input
                id="top10k"
                type="number"
                step="0.1"
                min="0.1"
                max="2"
                :value="top10kMultiplier"
                @change="handleMultiplierChange('top10k', $event)"
                :disabled="!adaptiveSpeedEnabled"
                class="input-field small"
              />
            </div>

            <div class="setting-item">
              <label for="other">Other words (rare)</label>
              <input
                id="other"
                type="number"
                step="0.1"
                min="0.1"
                max="2"
                :value="otherMultiplier"
                @change="handleMultiplierChange('other', $event)"
                :disabled="!adaptiveSpeedEnabled"
                class="input-field small"
              />
            </div>

            <div class="setting-item">
              <label for="punctuation">Sentence endings (.!?;:)</label>
              <input
                id="punctuation"
                type="number"
                step="0.1"
                min="0.1"
                max="2"
                :value="punctuationMultiplier"
                @change="handleMultiplierChange('punctuation', $event)"
                :disabled="!adaptiveSpeedEnabled"
                class="input-field small"
              />
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>ORP Mode</h3>

          <div class="setting-item">
            <label for="orpOffset">Left offset (%)</label>
            <input
              id="orpOffset"
              type="number"
              min="0"
              max="50"
              :value="orpOffset"
              @change="handleOrpOffsetChange"
              class="input-field small"
            />
          </div>

          <p class="setting-hint">
            Shifts the focal point left of center. 0 = centered, higher = more left.
          </p>
        </section>

        <section class="settings-section">
          <h3>Theme</h3>

          <div class="theme-buttons">
            <button
              class="theme-button"
              :class="{ active: theme === 'dark' }"
              @click="handleThemeChange('dark')"
            >
              Dark
            </button>
            <button
              class="theme-button"
              :class="{ active: theme === 'light' }"
              @click="handleThemeChange('light')"
            >
              Light
            </button>
            <button
              class="theme-button"
              :class="{ active: theme === 'system' }"
              @click="handleThemeChange('system')"
            >
              System
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.settings-panel {
  background: var(--color-background);
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-background);
}

.settings-header h2 {
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

.settings-content {
  padding: 1rem 1.25rem 2rem;
}

.settings-section {
  margin-bottom: 1.5rem;
}

.settings-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.setting-item label {
  font-size: 1rem;
  color: var(--color-text);
}

.input-field {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  color: var(--color-text);
  width: 100px;
  text-align: right;
}

.input-field.small {
  width: 80px;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
}

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-button {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.multipliers {
  transition: opacity 0.2s;
}

.multipliers.disabled {
  opacity: 0.5;
}

.theme-buttons {
  display: flex;
  gap: 0.5rem;
}

.theme-button {
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-button:hover {
  background: var(--color-surface-hover);
}

.theme-button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
</style>
