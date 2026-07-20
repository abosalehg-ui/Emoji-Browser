import { t, getLang } from './i18n.js';
import { copyText, htmlEntity } from './utils.js';
import * as state from './state.js';
import { TONES, applyTone, supports } from './skinTone.js';
import { showNotification } from './notify.js';

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
    keywordsRow.style.display = '';
  } else {
    keywordsRow.style.display = 'none';
  }

  const skinRow = document.getElementById('skinToneRow');
  if (supports(emojiObj)) {
    skinRow.style.display = '';
    renderSkinTones(emojiObj);
  } else {
    skinRow.style.display = 'none';
  }

  const platformList = document.getElementById('platformList');
  platformList.innerHTML = `
    <div class="platform-item"><span>Apple (iOS)</span><span>✅</span></div>
    <div class="platform-item"><span>Google (Android)</span><span>✅</span></div>
    <div class="platform-item"><span>Microsoft (Windows)</span><span>✅</span></div>
    <div class="platform-item"><span>Samsung</span><span>✅</span></div>
    <div class="platform-item"><span>WhatsApp</span><span>✅</span></div>
    <div class="platform-item"><span>Twitter</span><span>✅</span></div>
    <div class="platform-item"><span>Facebook</span><span>✅</span></div>
  `;

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  trapFocus(modal);
}

function renderSkinTones(emojiObj) {
  const container = document.getElementById('skinToneRow');
  container.innerHTML = `<div class="emoji-info-label">${t('skinToneLabel')}</div>`;
  const row = document.createElement('div');
  row.className = 'skintone-row';
  const currentTone = state.get('skinTone');
  TONES.forEach((tone) => {
    const btn = document.createElement('button');
    btn.className = 'skintone-swatch' + (tone.id === currentTone ? ' active' : '');
    btn.textContent = tone.modifier ? emojiObj.emoji + tone.modifier : emojiObj.emoji;
    btn.setAttribute('aria-label', getLang() === 'ar' ? tone.ar : tone.en);
    btn.addEventListener('click', () => {
      state.set('skinTone', tone.id);
      const prefs = state.get('prefs') || {};
      prefs.skinTone = tone.id;
      state.set('prefs', prefs);
      document.getElementById('modalEmoji').textContent = applyTone(emojiObj.emoji, tone.id);
      renderSkinTones(emojiObj);
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
  currentEmoji = null;
  if (lastFocusedElement && lastFocusedElement.focus) {
    lastFocusedElement.focus();
  }
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
  copyText(text).then(() => showNotification(t('notificationCopied')));
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

export function getCurrentEmoji() {
  return currentEmoji;
}
