import * as state from './state.js';
import { t } from './i18n.js';
import { showNotification } from './notify.js';

export function toggleFavorite(emojiObj) {
  const favs = state.get('favorites');
  const ch = emojiObj.emoji;
  let next;
  if (favs.includes(ch)) {
    next = favs.filter((f) => f !== ch);
    showNotification(t('notificationRemoved'));
  } else {
    next = [...favs, ch];
    showNotification(t('notificationAdded'));
  }
  state.set('favorites', next);
}

export function isFavorite(emoji) {
  return state.get('favorites').includes(emoji);
}
