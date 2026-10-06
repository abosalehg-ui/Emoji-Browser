import * as state from './state.js';
import { t } from './i18n.js';
import { copyText } from './utils.js';
import { showNotification } from './notify.js';
import { applyTone, supports } from './skinTone.js';
import { recordUsage } from './stats.js';

export function enterSelectMode() {
  state.set('selectMode', true);
  state.set('selected', new Set());
  document.body.classList.add('select-mode');
  updateBar();
}

export function exitSelectMode() {
  state.set('selectMode', false);
  state.set('selected', new Set());
  document.body.classList.remove('select-mode');
  updateBar();
}

export function toggleSelected(emojiObj) {
  const sel = new Set(state.get('selected'));
  if (sel.has(emojiObj.emoji)) sel.delete(emojiObj.emoji);
  else sel.add(emojiObj.emoji);
  state.set('selected', sel);
  updateBar();
}

export function clearSelection() {
  state.set('selected', new Set());
  updateBar();
}

function getSeparator() {
  const sel = document.getElementById('separatorSelect');
  if (!sel) return '';
  switch (sel.value) {
    case 'space':
      return ' ';
    case 'newline':
      return '\n';
    default:
      return '';
  }
}

export async function copyAllSelected() {
  const sel = state.get('selected');
  if (!sel.size) return;
  // Selection stores base characters; apply the chosen skin tone on the way
  // out so "copy all" matches what the grid and the modal show.
  const byChar = state.get('emojisByChar');
  const tone = state.get('skinTone');
  const chars = [...sel].map((ch) => {
    const obj = byChar.get(ch);
    return obj && supports(obj) ? applyTone(ch, tone) : ch;
  });
  try {
    await copyText(chars.join(getSeparator()));
  } catch (err) {
    console.warn('Copy failed:', err);
    showNotification(t('errCopyFailed'), 'error');
    return;
  }
  sel.forEach((ch) => recordUsage(ch));
  showNotification(t('notificationCopied'));
}

function updateBar() {
  const bar = document.getElementById('selectionBar');
  if (!bar) return;
  const sel = state.get('selected');
  const inMode = state.get('selectMode');
  if (inMode) {
    bar.classList.add('show');
    const count = document.getElementById('selectedCount');
    if (count) count.textContent = `${sel.size} ${t('selectedCount')}`;
  } else {
    bar.classList.remove('show');
  }
}

export function refreshBar() {
  updateBar();
}
