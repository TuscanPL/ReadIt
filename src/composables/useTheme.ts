import { ref, onMounted } from 'vue';

export type Theme = 'dark' | 'light' | 'system';

const THEME_KEY = 'readit_theme';

export function useTheme() {
  const theme = ref<Theme>('dark');
  const effectiveTheme = ref<'dark' | 'light'>('dark');

  function getSystemTheme(): 'dark' | 'light' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  function updateEffectiveTheme() {
    if (theme.value === 'system') {
      effectiveTheme.value = getSystemTheme();
    } else {
      effectiveTheme.value = theme.value;
    }
    applyTheme();
  }

  function applyTheme() {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effectiveTheme.value);
    }
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
    localStorage.setItem(THEME_KEY, newTheme);
    updateEffectiveTheme();
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    theme.value = saved || 'dark';
    updateEffectiveTheme();
  }

  onMounted(() => {
    loadTheme();

    // Listen for system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (theme.value === 'system') {
          updateEffectiveTheme();
        }
      });
    }
  });

  return {
    theme,
    effectiveTheme,
    setTheme,
  };
}
