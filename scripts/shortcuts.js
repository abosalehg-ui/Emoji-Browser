import * as state from './state.js';
import { enterSelectMode, exitSelectMode } from './selection.js';
import { closeModal } from './modal.js';
import { toggleTheme, toggleLang } from './prefs.js';

export function registerShortcuts({
  onLangChange,
  onSearchFocus,
  onThemeChange,
  onStatsToggle,
}) {
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
      const next = toggleTheme();
      if (onThemeChange) onThemeChange(next);
    } else if (e.key.toLowerCase() === 'l') {
      const nextLang = toggleLang();
      if (onLangChange) onLangChange(nextLang);
    } else if (e.key.toLowerCase() === 's') {
      if (state.get('selectMode')) exitSelectMode();
      else enterSelectMode();
    } else if (e.key.toLowerCase() === 'i') {
      if (onStatsToggle) onStatsToggle();
    }
  });
}
