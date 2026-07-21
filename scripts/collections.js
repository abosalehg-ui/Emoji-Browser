import * as state from './state.js';
import { uuid } from './utils.js';
import { t, getLang } from './i18n.js';
import { showNotification } from './notify.js';

export function createCollection(name, emojis = []) {
  const colls = state.get('collections');
  const coll = {
    id: uuid(),
    name: { ar: name, en: name },
    emojis: Array.from(new Set(emojis)),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    color: pickColor(),
  };
  state.set('collections', [...colls, coll]);
  showNotification(t('notificationCollectionCreated'));
  return coll;
}

export function renameCollection(id, newName) {
  const colls = state.get('collections');
  const lang = getLang();
  state.set(
    'collections',
    colls.map((c) =>
      c.id === id ? { ...c, name: { ...c.name, [lang]: newName }, updatedAt: Date.now() } : c
    )
  );
}

export function deleteCollection(id) {
  state.set(
    'collections',
    state.get('collections').filter((c) => c.id !== id)
  );
  if (state.get('currentCollection') === id) {
    state.set('currentCollection', null);
  }
}

export function addToCollection(id, emoji) {
  const colls = state.get('collections');
  state.set(
    'collections',
    colls.map((c) => {
      if (c.id !== id) return c;
      if (c.emojis.includes(emoji)) return c;
      return { ...c, emojis: [...c.emojis, emoji], updatedAt: Date.now() };
    })
  );
}

export function addManyToCollection(id, emojis) {
  const colls = state.get('collections');
  state.set(
    'collections',
    colls.map((c) => {
      if (c.id !== id) return c;
      const set = new Set([...c.emojis, ...emojis]);
      return { ...c, emojis: [...set], updatedAt: Date.now() };
    })
  );
}

export function removeFromCollection(id, emoji) {
  const colls = state.get('collections');
  state.set(
    'collections',
    colls.map((c) =>
      c.id === id
        ? { ...c, emojis: c.emojis.filter((e) => e !== emoji), updatedAt: Date.now() }
        : c
    )
  );
}

export function getCollection(id) {
  return state.get('collections').find((c) => c.id === id);
}

const PALETTE = ['#4a90e2', '#e57373', '#81c784', '#ffb74d', '#ba68c8', '#4dd0e1', '#f06292'];
function pickColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

export function getCollectionName(coll, lang) {
  if (!coll || !coll.name) return '';
  return coll.name[lang] || coll.name.ar || coll.name.en || '';
}
