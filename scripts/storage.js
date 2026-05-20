const STORAGE_KEY = 'emojiBrowser';
const LEGACY_KEY = 'emojiData';
const CURRENT_SCHEMA = 1;

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.schemaVersion >= CURRENT_SCHEMA) {
        return parsed;
      }
    }
    const migrated = migrateLegacy();
    if (migrated) return migrated;
  } catch (err) {
    console.warn('Storage load failed:', err);
  }
  return defaultState();
}

export function save(state) {
  try {
    const payload = {
      schemaVersion: CURRENT_SCHEMA,
      prefs: state.prefs,
      favorites: state.favorites,
      recent: state.recent,
      collections: state.collections,
      stats: state.stats,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Storage save failed:', err);
  }
}

function migrateLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw);
    const state = defaultState();

    if (Array.isArray(legacy.favorites)) {
      state.favorites = legacy.favorites
        .map((f) => (typeof f === 'string' ? f : f && f.emoji))
        .filter(Boolean);
    }
    if (Array.isArray(legacy.recent)) {
      const now = Date.now();
      state.recent = legacy.recent
        .map((r, i) => ({
          e: typeof r === 'string' ? r : r && r.emoji,
          t: now - i * 60000,
        }))
        .filter((r) => r.e);
    }

    const html = document.documentElement;
    state.prefs.theme = html.getAttribute('data-theme') || 'light';
    state.prefs.lang = html.getAttribute('lang') || 'ar';

    save(state);
    return state;
  } catch (err) {
    console.warn('Legacy migration failed:', err);
    return null;
  }
}

export function defaultState() {
  return {
    schemaVersion: CURRENT_SCHEMA,
    prefs: { lang: 'ar', theme: 'light', skinTone: 'default' },
    favorites: [],
    recent: [],
    collections: [],
    stats: { counts: {}, firstSeen: {}, lastUsed: {} },
  };
}

export function exportData(state) {
  return {
    schema: 'emoji-browser/v1',
    exportedAt: new Date().toISOString(),
    favorites: state.favorites,
    collections: state.collections,
    prefs: state.prefs,
    stats: state.stats,
  };
}

export function importData(data, currentState, mode = 'merge') {
  if (!data || data.schema !== 'emoji-browser/v1') {
    throw new Error('Invalid file format');
  }
  if (mode === 'replace') {
    return {
      ...currentState,
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      collections: Array.isArray(data.collections) ? data.collections : [],
      prefs: { ...currentState.prefs, ...(data.prefs || {}) },
      stats: data.stats || currentState.stats,
    };
  }
  const favs = new Set([...(currentState.favorites || []), ...(data.favorites || [])]);
  const existingIds = new Set((currentState.collections || []).map((c) => c.id));
  const newColls = (data.collections || []).filter((c) => !existingIds.has(c.id));
  return {
    ...currentState,
    favorites: [...favs],
    collections: [...(currentState.collections || []), ...newColls],
    prefs: { ...currentState.prefs, ...(data.prefs || {}) },
  };
}
