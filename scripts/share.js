import { toBase64Url, fromBase64Url, copyText } from './utils.js';
import { t } from './i18n.js';
import { showNotification } from './notify.js';
import * as state from './state.js';
import { addManyToCollection, createCollection, getCollectionName } from './collections.js';
import { getLang } from './i18n.js';

export function buildShareUrl(collection) {
  const payload = {
    n: collection.name,
    e: collection.emojis,
    c: collection.color,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const base = window.location.origin + window.location.pathname;
  return `${base}?share=${encoded}`;
}

export async function shareCollection(collection) {
  const url = buildShareUrl(collection);
  if (url.length > 2000) {
    showNotification('Collection too large to share via URL', 'error');
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({
        title: getCollectionName(collection, getLang()),
        url,
      });
      return;
    } catch (err) {
      /* fall through to clipboard */
    }
  }
  await copyText(url);
  showNotification(t('notificationCollectionShared'));
}

export function parseShareUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('share');
  if (!encoded) return null;
  try {
    return JSON.parse(fromBase64Url(encoded));
  } catch (err) {
    console.warn('Failed to parse share URL:', err);
    return null;
  }
}

export function clearShareParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url.toString());
}

export function importSharedCollection(payload) {
  const name = payload.n || { ar: 'مجموعة مشتركة', en: 'Shared Collection' };
  const lang = getLang();
  const coll = createCollection(name[lang] || name.ar || name.en || 'Shared', payload.e || []);
  if (payload.c) {
    state.set(
      'collections',
      state.get('collections').map((c) => (c.id === coll.id ? { ...c, color: payload.c } : c))
    );
  }
  return coll;
}
