import { exportData, importData } from './storage.js';
import * as state from './state.js';
import { t } from './i18n.js';
import { showNotification } from './notify.js';
import { applyPrefs } from './prefs.js';
import { choiceDialog } from './dialog.js';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function downloadExport() {
  const stateSnapshot = {
    prefs: state.get('prefs') || {
      lang: 'ar',
      theme: 'light',
      skinTone: 'default',
    },
    favorites: state.get('favorites'),
    collections: state.get('collections'),
    stats: state.get('stats'),
  };
  const data = exportData(stateSnapshot);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.download = `emoji-browser-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification(t('notificationExported'));
}

export function triggerImport(mode = 'merge') {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      showNotification(t('errFileTooLarge'), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showNotification(t('errImportFailed'), 'error');
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const currentState = {
          prefs: state.get('prefs'),
          favorites: state.get('favorites'),
          collections: state.get('collections'),
          stats: state.get('stats'),
        };
        const next = importData(parsed, currentState, mode);
        state.set('favorites', next.favorites);
        state.set('collections', next.collections);
        applyPrefs(next.prefs);
        if (mode === 'replace' && next.stats) state.set('stats', next.stats);
        showNotification(t('notificationImported'));
      } catch (err) {
        // The raw parser message ("Unexpected token < in JSON at position 0")
        // means nothing to a user; keep it for the console only.
        console.warn('Import failed:', err);
        showNotification(t('errImportFailed'), 'error');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// Asks which import mode to use. Resolves with 'merge', 'replace', or null
// when cancelled.
export function promptImportMode() {
  return choiceDialog({
    title: t('importPrompt'),
    options: [
      { label: t('btnMerge'), description: t('importMergeDesc'), value: 'merge' },
      { label: t('btnReplace'), description: t('importReplaceDesc'), value: 'replace' },
    ],
  });
}
