const STORAGE_KEY = 'emojiBrowser';
const LEGACY_KEY = 'emojiData';
const CURRENT_SCHEMA = 1;

export const VALID_LANGS = ['ar', 'en'];
export const VALID_THEMES = ['light', 'dark', 'sepia', 'contrast', 'auto'];
export const VALID_SKIN_TONES = [
  'default',
  'light',
  'med-light',
  'medium',
  'med-dark',
  'dark',
];

export const MAX_COLLECTION_EMOJIS = 500;
const MAX_NAME_LENGTH = 100;
// The longest sequence in the dataset (a ZWJ family/flag) is well under 32
// UTF-16 units. Anything longer is not an emoji, and accepting it let a shared
// link or imported file park arbitrary-length strings in the storage quota.
const MAX_EMOJI_LENGTH = 32;

export function isEmojiString(e) {
  return typeof e === 'string' && e.length > 0 && e.length <= MAX_EMOJI_LENGTH;
}

// ---------------------------------------------------------------------------
// Validation
//
// Two untrusted sources feed this module: localStorage (which the user, an
// older build, or a partial write can corrupt) and imported JSON files. Both
// are coerced to a known shape before anything reaches the store — an
// unrecognized `prefs.lang` would otherwise make t() dereference an undefined
// translation table and take the whole app down on every subsequent load.
// ---------------------------------------------------------------------------

export function safePrefs(p) {
  const src = p && typeof p === 'object' ? p : {};
  const out = {};
  if (VALID_LANGS.includes(src.lang)) out.lang = src.lang;
  if (VALID_THEMES.includes(src.theme)) out.theme = src.theme;
  if (VALID_SKIN_TONES.includes(src.skinTone)) out.skinTone = src.skinTone;
  return out;
}

function safeString(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

export function safeCollection(c) {
  if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !c.id) return null;
  const name = c.name && typeof c.name === 'object' ? c.name : {};
  const ar = safeString(name.ar, MAX_NAME_LENGTH);
  const en = safeString(name.en, MAX_NAME_LENGTH);
  return {
    id: c.id.slice(0, MAX_NAME_LENGTH),
    name: { ar: ar || en, en: en || ar },
    emojis: Array.isArray(c.emojis)
      ? [...new Set(c.emojis.filter(isEmojiString))].slice(0, MAX_COLLECTION_EMOJIS)
      : [],
    color:
      typeof c.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c.color) ? c.color : '#2c6cb0',
    createdAt: Number.isFinite(c.createdAt) ? c.createdAt : Date.now(),
    updatedAt: Number.isFinite(c.updatedAt) ? c.updatedAt : Date.now(),
  };
}

function safeCollections(list) {
  return Array.isArray(list) ? list.map(safeCollection).filter(Boolean) : [];
}

function safeFavorites(list) {
  return Array.isArray(list) ? list.filter(isEmojiString) : [];
}

function safeRecent(list) {
  return Array.isArray(list)
    ? list
        .filter((r) => r && isEmojiString(r.e))
        .map((r) => ({
          e: r.e,
          t: Number.isFinite(r.t) ? r.t : Date.now(),
        }))
    : [];
}

function safeCountMap(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isEmojiString(k) && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function safeStats(s) {
  const src = s && typeof s === 'object' ? s : {};
  return {
    counts: safeCountMap(src.counts),
    firstSeen: safeCountMap(src.firstSeen),
    lastUsed: safeCountMap(src.lastUsed),
  };
}

// Merge any partially-valid persisted blob onto a known-good default so a
// corrupt entry degrades to defaults instead of crashing the boot sequence.
export function normalize(parsed) {
  const base = defaultState();
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    schemaVersion: CURRENT_SCHEMA,
    prefs: { ...base.prefs, ...safePrefs(p.prefs) },
    favorites: safeFavorites(p.favorites),
    recent: safeRecent(p.recent),
    collections: safeCollections(p.collections),
    stats: safeStats(p.stats),
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schemaVersion >= CURRENT_SCHEMA) {
        return normalize(parsed);
      }
    }
    const migrated = migrateLegacy();
    if (migrated) return migrated;
  } catch (err) {
    console.warn('Storage load failed:', err);
  }
  return defaultState();
}

// Returns false when the write failed (typically QuotaExceededError), so the
// caller can tell the user instead of silently dropping their changes.
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
    return true;
  } catch (err) {
    console.warn('Storage save failed:', err);
    return false;
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
        .filter((f) => typeof f === 'string');
    }
    if (Array.isArray(legacy.recent)) {
      const now = Date.now();
      state.recent = legacy.recent
        .map((r, i) => ({
          e: typeof r === 'string' ? r : r && r.emoji,
          t: now - i * 60000,
        }))
        .filter((r) => typeof r.e === 'string');
    }

    const html = document.documentElement;
    const legacyPrefs = safePrefs({
      theme: html.getAttribute('data-theme'),
      lang: html.getAttribute('lang'),
    });
    state.prefs = { ...state.prefs, ...legacyPrefs };

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
  // The schema tag says nothing about the payload — validate every field.
  const favorites = safeFavorites(data.favorites);
  const collections = safeCollections(data.collections);
  const prefs = { ...currentState.prefs, ...safePrefs(data.prefs) };

  if (mode === 'replace') {
    return {
      ...currentState,
      favorites,
      collections,
      prefs,
      stats: data.stats ? safeStats(data.stats) : currentState.stats,
    };
  }

  const favs = new Set([...safeFavorites(currentState.favorites), ...favorites]);
  const existingIds = new Set((currentState.collections || []).map((c) => c.id));
  const newColls = collections.filter((c) => !existingIds.has(c.id));
  return {
    ...currentState,
    favorites: [...favs],
    collections: [...(currentState.collections || []), ...newColls],
    prefs,
  };
}
