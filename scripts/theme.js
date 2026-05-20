const THEMES = ['light', 'dark', 'sepia', 'contrast'];
const ICONS = { light: '🌙', dark: '☀️', sepia: '📜', contrast: '🌓' };

export function setTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colors = {
      light: '#4a90e2',
      dark: '#252525',
      sepia: '#b07d3a',
      contrast: '#000000',
    };
    meta.setAttribute('content', colors[theme]);
  }
}

export function cycleTheme(current) {
  const idx = THEMES.indexOf(current);
  return THEMES[(idx + 1) % THEMES.length];
}

export function themeIcon(theme) {
  return ICONS[theme] || '🌙';
}

export function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
