import * as state from './state.js';
import { setTheme, cycleTheme, themeIcon } from './theme.js';
import { setLang, applyTranslations } from './i18n.js';
import { enterSelectMode, exitSelectMode } from './selection.js';
import { closeModal } from './modal.js';

export function registerShortcuts({ onLangChange, onSearchFocus, onThemeChange, onStatsToggle }) {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (onSearchFocus) onSearchFocus();
      return;
    }

    if (e.key === 'Escape') {
      const modal = document.getElementById('emojiModal');
      if (modal && modal.classList.contains('show')) {
        closeModal();
        return;
      }
      if (state.get('selectMode')) {
        exitSelectMode();
        return;
      }
      const input = document.getElementById('searchInput');
      if (input && input.value) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        return;
      }
    }

    if (inField) return;

    if (e.key === '/') {
      e.preventDefault();
      if (onSearchFocus) onSearchFocus();
    } else if (e.key.toLowerCase() === 't') {
      const next = cycleTheme(state.get('theme'));
      state.set('theme', next);
      setTheme(next);
      const prefs = state.get('prefs') || {};
      prefs.theme = next;
      state.set('prefs', prefs);
      const btn = document.getElementById('themeToggle');
      if (btn) btn.textContent = themeIcon(next);
      if (onThemeChange) onThemeChange(next);
    } else if (e.key.toLowerCase() === 'l') {
      const nextLang = state.get('lang') === 'ar' ? 'en' : 'ar';
      state.set('lang', nextLang);
      const prefs = state.get('prefs') || {};
      prefs.lang = nextLang;
      state.set('prefs', prefs);
      setLang(nextLang);
      applyTranslations();
      if (onLangChange) onLangChange(nextLang);
    } else if (e.key.toLowerCase() === 's') {
      if (state.get('selectMode')) exitSelectMode();
      else enterSelectMode();
    } else if (e.key.toLowerCase() === 'i') {
      if (onStatsToggle) onStatsToggle();
    }
  });
}
