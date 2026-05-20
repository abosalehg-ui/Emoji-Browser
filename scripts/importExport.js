import { exportData, importData } from './storage.js';
import * as state from './state.js';
import { t } from './i18n.js';
import { showNotification } from './notify.js';

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
    const reader = new FileReader();
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
        if (next.prefs) state.set('prefs', next.prefs);
        if (mode === 'replace' && next.stats) state.set('stats', next.stats);
        showNotification(t('notificationImported'));
      } catch (err) {
        showNotification('Import failed: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}
