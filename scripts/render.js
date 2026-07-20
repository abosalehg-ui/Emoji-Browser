import * as state from './state.js';
import { t, getLang } from './i18n.js';
import { applyTone, supports } from './skinTone.js';
import { escapeHtml } from './utils.js';

export function createEmojiCard(emojiObj, { onClick, onFavorite, onSelect } = {}) {
  const card = document.createElement('div');
  card.className = 'emoji-card';
  card.setAttribute('role', 'gridcell');
  card.setAttribute('tabindex', '0');
  // Base emoji char, independent of any skin-tone modifier shown to the user.
  card.dataset.emoji = emojiObj.emoji;

  const favorites = state.get('favorites');
  const selected = state.get('selected');
  const skinTone = state.get('skinTone');
  const lang = getLang();

  const isFav = favorites.includes(emojiObj.emoji);
  const isSel = selected.has(emojiObj.emoji);
  if (isSel) card.classList.add('selected');

  const displayEmoji = supports(emojiObj)
    ? applyTone(emojiObj.emoji, skinTone)
    : emojiObj.emoji;
  const name = lang === 'ar' ? emojiObj.arName : emojiObj.enName;

  card.setAttribute('aria-label', `${name}, ${emojiObj.unicode || ''}`);

  card.innerHTML = `
    <div class="select-checkbox" aria-hidden="true">${isSel ? '✓' : ''}</div>
    <button class="favorite-btn ${isFav ? 'active' : ''}" aria-pressed="${isFav}"
      aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
      ${isFav ? '⭐' : '☆'}
    </button>
    <div class="emoji-icon">${displayEmoji}</div>
    <div class="emoji-name">${escapeHtml(name || '')}</div>
  `;

  const favBtn = card.querySelector('.favorite-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onFavorite) onFavorite(emojiObj);
  });

  card.addEventListener('click', () => {
    if (state.get('selectMode')) {
      if (onSelect) onSelect(emojiObj);
    } else {
      if (onClick) onClick(emojiObj);
    }
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      card.click();
    }
  });

  return card;
}

export function renderGrid(container, emojiList, handlers) {
  container.innerHTML = '';
  if (!emojiList || emojiList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="empty-icon">🔍</div><div>${t('emptySearch')}</div>`;
    container.appendChild(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  emojiList.forEach((e, i) => {
    const card = createEmojiCard(e, handlers);
    card.style.animationDelay = `${Math.min(i * 12, 400)}ms`;
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

export function renderEmptyState(container, messageKey, icon = '📭') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div>${t(messageKey)}</div>
    </div>
  `;
}
