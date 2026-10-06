import { toBase64Url, fromBase64Url, copyText } from './utils.js';
import { isEmojiString, MAX_COLLECTION_EMOJIS } from './storage.js';
import { t, getLang } from './i18n.js';
import { showNotification } from './notify.js';
import * as state from './state.js';
import { createCollection, getCollectionName } from './collections.js';

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
    showNotification(t('errCollectionTooLarge'), 'error');
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({
        title: getCollectionName(collection, getLang()),
        url,
      });
      return;
    } catch {
      /* fall through to clipboard */
    }
  }
  try {
    await copyText(url);
    showNotification(t('notificationCollectionShared'));
  } catch (err) {
    console.warn('Copy failed:', err);
    showNotification(t('errCopyFailed'), 'error');
  }
}

export function parseShareUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('share');
  if (!encoded) return null;
  try {
    return sanitizeSharePayload(JSON.parse(fromBase64Url(encoded)));
  } catch (err) {
    console.warn('Failed to parse share URL:', err);
    return null;
  }
}

// Shared payloads come from untrusted URLs. Coerce every field to a known,
// safe shape before it ever reaches state or the DOM. Exported so the
// sanitizer can be tested directly rather than only through window.location.
export function sanitizeSharePayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = raw.n && typeof raw.n === 'object' ? raw.n : {};
  const emojis = Array.isArray(raw.e)
    ? raw.e.filter(isEmojiString).slice(0, MAX_COLLECTION_EMOJIS)
    : [];
  return {
    n: {
      ar: typeof name.ar === 'string' ? name.ar.slice(0, 100) : '',
      en: typeof name.en === 'string' ? name.en.slice(0, 100) : '',
    },
    e: emojis,
    c: typeof raw.c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.c) ? raw.c : '',
  };
}

export function clearShareParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url.toString());
}

export function importSharedCollection(payload) {
  const fallback = t('sharedCollectionDefault');
  const n = payload.n || {};
  const ar = n.ar || n.en || fallback;
  const en = n.en || n.ar || fallback;
  // Keep both language variants of the shared name (createCollection would
  // copy the current-language one into both), and the sender's colour.
  const coll = createCollection(ar, payload.e || []);
  state.set(
    'collections',
    state
      .get('collections')
      .map((c) =>
        c.id === coll.id ? { ...c, name: { ar, en }, color: payload.c || c.color } : c
      )
  );
  return coll;
}
