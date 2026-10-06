import * as state from './state.js';
import { enterSelectMode, exitSelectMode } from './selection.js';
import { closeModal } from './modal.js';
import { toggleTheme, toggleLang } from './prefs.js';

// Language changes need no callback: main.js re-renders on the store's 'lang'.
export function registerShortcuts({ onSearchFocus, onThemeChange, onStatsToggle }) {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const inField =
      tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

    // A native <dialog> (dialog.js) handles its own Escape and must not let
    // the page-level shortcuts act behind it.
    if (document.querySelector('dialog[open]')) return;

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
    // Single-key shortcuts must never hijack browser/OS chords (Ctrl+L,
    // Alt+S…), and must not act on the page hidden behind the open modal.
    // WCAG 2.1.4 (Character Key Shortcuts).
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const modal = document.getElementById('emojiModal');
    if (modal && modal.classList.contains('show')) return;

    if (e.key === '/') {
      e.preventDefault();
      if (onSearchFocus) onSearchFocus();
    } else if (e.key.toLowerCase() === 't') {
      const next = toggleTheme();
      if (onThemeChange) onThemeChange(next);
    } else if (e.key.toLowerCase() === 'l') {
      toggleLang();
    } else if (e.key.toLowerCase() === 's') {
      if (state.get('selectMode')) exitSelectMode();
      else enterSelectMode();
    } else if (e.key.toLowerCase() === 'i') {
      if (onStatsToggle) onStatsToggle();
    }
  });
}
