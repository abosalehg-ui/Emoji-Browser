import * as state from './state.js';

const MAX_RECENT = 20;

export function addToRecent(emojiObj) {
  const ch = emojiObj.emoji;
  const recent = state.get('recent').filter((r) => r.e !== ch);
  recent.unshift({ e: ch, t: Date.now() });
  state.set('recent', recent.slice(0, MAX_RECENT));
}
