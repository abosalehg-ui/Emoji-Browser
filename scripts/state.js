const listeners = new Map();
const data = {
  lang: 'ar',
  theme: 'light',
  skinTone: 'default',
  currentCategory: 'all',
  currentCollection: null,
  selectMode: false,
  selected: new Set(),
  emojis: [],
  emojisByChar: new Map(),
  emojisLoaded: new Set(),
  filtered: [],
  favorites: [],
  recent: [],
  collections: [],
  stats: { counts: {}, firstSeen: {}, lastUsed: {} },
  categories: [],
  query: '',
};

export function get(key) {
  return data[key];
}

export function set(key, value) {
  data[key] = value;
  emit(key, value);
}

export function update(key, updater) {
  const next = typeof updater === 'function' ? updater(data[key]) : updater;
  data[key] = next;
  emit(key, next);
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

function emit(key, value) {
  const set = listeners.get(key);
  if (set) set.forEach((fn) => fn(value));
}

export function getAll() {
  return data;
}
