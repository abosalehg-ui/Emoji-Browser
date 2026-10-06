import { t, getLang } from './i18n.js';
import { copyText, htmlEntity } from './utils.js';
import * as state from './state.js';
import { TONES, applyTone, supports } from './skinTone.js';
import { showNotification } from './notify.js';
import { setSkinTone } from './prefs.js';
import { recordUsage } from './stats.js';

let currentEmoji = null;
let lastFocusedElement = null;
let trapHandler = null;

export function openEmojiModal(emojiObj) {
  currentEmoji = emojiObj;
  lastFocusedElement = document.activeElement;

  const modal = document.getElementById('emojiModal');
  const lang = getLang();
  const skinTone = state.get('skinTone');

  const displayEmoji = supports(emojiObj)
    ? applyTone(emojiObj.emoji, skinTone)
    : emojiObj.emoji;

  document.getElementById('modalEmoji').textContent = displayEmoji;
  document.getElementById('emojiArName').textContent = emojiObj.arName || '-';
  document.getElementById('emojiEnName').textContent = emojiObj.enName || '-';
  document.getElementById('emojiUnicode').textContent = emojiObj.unicode || '-';
  document.getElementById('emojiDesc').textContent =
    (lang === 'ar' ? emojiObj.desc : emojiObj.descEn || emojiObj.desc) || '-';

  const keywordsRow = document.getElementById('keywordsRow');
  const keywordsEl = document.getElementById('emojiKeywords');
  if (emojiObj.keywords && emojiObj.keywords.length) {
    keywordsEl.textContent = emojiObj.keywords.join('، ');
    keywordsRow.hidden = false;
  } else {
    keywordsRow.hidden = true;
  }

  const skinRow = document.getElementById('skinToneRow');
  if (supports(emojiObj)) {
    skinRow.hidden = false;
    renderSkinTones(emojiObj);
  } else {
    skinRow.hidden = true;
  }

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  trapFocus(modal);
}

function renderSkinTones(emojiObj) {
  const container = document.getElementById('skinToneRow');
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'emoji-info-label';
  label.textContent = t('skinToneLabel');
  container.appendChild(label);
  const row = document.createElement('div');
  row.className = 'skintone-row';
  const currentTone = state.get('skinTone');
  TONES.forEach((tone) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = tone.id === currentTone;
    btn.className = 'skintone-swatch' + (isActive ? ' active' : '');
    btn.setAttribute('aria-pressed', String(isActive));
    btn.dataset.tone = tone.id;
    btn.textContent = applyTone(emojiObj.emoji, tone.id);
    btn.setAttribute('aria-label', getLang() === 'ar' ? tone.ar : tone.en);
    btn.addEventListener('click', () => {
      setSkinTone(tone.id);
      document.getElementById('modalEmoji').textContent = applyTone(emojiObj.emoji, tone.id);
      // Update the swatches in place: rebuilding them removed the focused
      // button, which dropped keyboard focus to <body> and out of the modal.
      row.querySelectorAll('.skintone-swatch').forEach((b) => {
        const on = b.dataset.tone === tone.id;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    });
    row.appendChild(btn);
  });
  container.appendChild(row);
}

export function closeModal() {
  const modal = document.getElementById('emojiModal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  if (trapHandler) {
    modal.removeEventListener('keydown', trapHandler);
    trapHandler = null;
  }
  const char = currentEmoji && currentEmoji.emoji;
  currentEmoji = null;
  // A skin-tone change re-renders the grids while the modal is open, which
  // detaches the card that opened it — fall back to its replacement.
  let target = lastFocusedElement;
  if (target && !target.isConnected && char) {
    target = [...document.querySelectorAll('.emoji-card')].find(
      (c) => c.dataset.emoji === char
    );
  }
  if (target && target.focus) target.focus();
}

export function copyEmojiFromModal(type) {
  if (!currentEmoji) return;
  const skinTone = state.get('skinTone');
  let text = '';
  switch (type) {
    case 'emoji':
      text = supports(currentEmoji)
        ? applyTone(currentEmoji.emoji, skinTone)
        : currentEmoji.emoji;
      break;
    case 'unicode':
      text = currentEmoji.unicode || '';
      break;
    case 'html':
      text = htmlEntity(currentEmoji.unicode || '');
      break;
  }
  const emoji = currentEmoji.emoji;
  copyText(text)
    .then(() => {
      // Counted here rather than when the modal opens, so "total copies" in
      // the dashboard measures what its label says.
      recordUsage(emoji);
      showNotification(t('notificationCopied'));
    })
    .catch((err) => {
      console.warn('Copy failed:', err);
      showNotification(t('errCopyFailed'), 'error');
    });
}

function trapFocus(modal) {
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first.focus();

  if (trapHandler) modal.removeEventListener('keydown', trapHandler);
  trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  modal.addEventListener('keydown', trapHandler);
}
