// Single source of truth for preference toggles (theme, language) shared by
// both the header buttons (main.js) and keyboard shortcuts (shortcuts.js).
import * as state from './state.js';
import { setTheme, cycleTheme, themeIcon } from './theme.js';
import { setLang, applyTranslations, getLang } from './i18n.js';

export function persistPref(key, value) {
  const prefs = { ...(state.get('prefs') || {}) };
  prefs[key] = value;
  state.set('prefs', prefs);
}

export function toggleTheme() {
  const next = cycleTheme(state.get('theme'));
  state.set('theme', next);
  setTheme(next);
  persistPref('theme', next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = themeIcon(next);
  return next;
}

export function toggleLang() {
  const next = getLang() === 'ar' ? 'en' : 'ar';
  state.set('lang', next);
  persistPref('lang', next);
  setLang(next);
  applyTranslations();
  return next;
}
