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

function applyTheme(theme) {
  setTheme(theme);
  state.set('theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = themeIcon(theme);
}

// The DOM and i18n module are updated before the store emits, so 'lang'
// subscribers (main.js re-renders every view on it) already see the new
// language when they call t()/getLang().
function applyLang(lang) {
  setLang(lang);
  applyTranslations();
  state.set('lang', lang);
}

export function toggleTheme() {
  const next = cycleTheme(state.get('theme'));
  applyTheme(next);
  persistPref('theme', next);
  return next;
}

export function toggleLang() {
  const next = getLang() === 'ar' ? 'en' : 'ar';
  applyLang(next);
  persistPref('lang', next);
  return next;
}

export function setSkinTone(tone) {
  state.set('skinTone', tone);
  persistPref('skinTone', tone);
}

// Makes a prefs object (e.g. from an imported file) take effect immediately.
// Writing it to the store alone only persisted it: the theme attribute, the
// UI language and the runtime theme/lang/skinTone keys all kept their old
// values, and the next theme toggle overwrote the imported choice.
export function applyPrefs(prefs) {
  if (!prefs) return;
  state.set('prefs', { ...(state.get('prefs') || {}), ...prefs });
  if (prefs.theme && prefs.theme !== state.get('theme')) applyTheme(prefs.theme);
  if (prefs.skinTone && prefs.skinTone !== state.get('skinTone')) {
    state.set('skinTone', prefs.skinTone);
  }
  if (prefs.lang && prefs.lang !== getLang()) applyLang(prefs.lang);
}
