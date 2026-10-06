import * as state from './state.js';
import { t, getLang } from './i18n.js';
import { applyTone, supports } from './skinTone.js';
import { escapeHtml } from './utils.js';

// Cards carry no listeners of their own. Each grid container gets one click
// and one keydown listener (wired once, see wireGrid) that resolve the card's
// emoji through the per-container lookup below. Per-card listeners used to add
// ~4,000 closures on every search keystroke.
const gridState = new WeakMap(); // container -> { byChar, handlers }

export function createEmojiCard(emojiObj, index = 0) {
  const card = document.createElement('div');
  card.className = 'emoji-card';
  // A list, not an ARIA grid: role="grid" requires role="row" children, and
  // gridcells placed directly inside it are invalid. Arrow-key navigation is
  // still provided by a11y.js.
  card.setAttribute('role', 'listitem');
  // Roving tabindex: exactly one card is in the tab order and the arrow-key
  // handler in a11y.js moves it. Making every card tabbable would put 1358 tab
  // stops between the grid and the footer.
  card.setAttribute('tabindex', index === 0 ? '0' : '-1');
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

  card.setAttribute('aria-label', name || emojiObj.emoji);

  card.innerHTML = `
    <div class="select-checkbox" aria-hidden="true">${isSel ? '✓' : ''}</div>
    <button type="button" class="favorite-btn ${isFav ? 'active' : ''}" aria-pressed="${isFav}"
      aria-label="${escapeHtml(t(isFav ? 'ariaRemoveFav' : 'ariaAddFav'))}">
      ${isFav ? '⭐' : '☆'}
    </button>
    <div class="emoji-icon">${escapeHtml(displayEmoji)}</div>
    <div class="emoji-name">${escapeHtml(name || '')}</div>
  `;

  return card;
}

function wireGrid(container) {
  if (gridState.has(container)) return;
  gridState.set(container, { byChar: new Map(), handlers: {} });

  const resolve = (target) => {
    const card = target.closest('.emoji-card');
    if (!card || !container.contains(card)) return null;
    const { byChar, handlers } = gridState.get(container);
    const obj = byChar.get(card.dataset.emoji);
    return obj ? { card, obj, handlers } : null;
  };

  container.addEventListener('click', (e) => {
    const hit = resolve(e.target);
    if (!hit) return;
    const { obj, handlers } = hit;
    if (e.target.closest('.favorite-btn')) {
      if (handlers.onFavorite) handlers.onFavorite(obj);
    } else if (state.get('selectMode')) {
      if (handlers.onSelect) handlers.onSelect(obj);
    } else if (handlers.onClick) {
      handlers.onClick(obj);
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // Only the card itself: Enter/Space on the star is the button's own click.
    if (!e.target.classList.contains('emoji-card')) return;
    e.preventDefault();
    e.target.click();
  });
}

// Above this many cards the staggered entrance animation costs more than it
// adds (and the last cards would wait the full cap anyway).
const ANIMATE_MAX = 100;

export function renderGrid(container, emojiList, handlers = {}) {
  wireGrid(container);
  const entry = gridState.get(container);
  entry.handlers = handlers;
  entry.byChar = new Map();
  container.innerHTML = '';
  if (!emojiList || emojiList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '🔍';
    const msg = document.createElement('div');
    msg.textContent = t('emptySearch');
    empty.append(icon, msg);
    container.appendChild(empty);
    return;
  }
  const animate = emojiList.length <= ANIMATE_MAX;
  container.classList.toggle('no-anim', !animate);
  const frag = document.createDocumentFragment();
  emojiList.forEach((e, i) => {
    entry.byChar.set(e.emoji, e);
    const card = createEmojiCard(e, i);
    if (animate) card.style.animationDelay = `${i * 12}ms`;
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

// Rebuilding every grid to reflect one star press cost ~5,400 DOM nodes and
// threw away the user's scroll position and keyboard focus. Patch the cards
// that are already on the page instead.
export function updateFavoriteButtons(favorites) {
  const favSet = new Set(favorites);
  document.querySelectorAll('.emoji-card').forEach((card) => {
    const ch = card.dataset.emoji;
    if (!ch) return;
    const btn = card.querySelector('.favorite-btn');
    if (!btn) return;
    const isFav = favSet.has(ch);
    if (btn.classList.contains('active') === isFav) return;
    btn.classList.toggle('active', isFav);
    btn.setAttribute('aria-pressed', String(isFav));
    btn.setAttribute('aria-label', t(isFav ? 'ariaRemoveFav' : 'ariaAddFav'));
    btn.textContent = isFav ? '⭐' : '☆';
  });
}

// Placeholder shown while the dataset is in flight, and the error state if it
// never arrives — previously both were a silently empty grid.
export function renderGridStatus(container, messageKey, isError = false) {
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'grid-status' + (isError ? ' is-error' : '');
  el.textContent = t(messageKey);
  container.appendChild(el);
}

// Same idea as updateFavoriteButtons, for the multi-select checkmarks.
export function updateSelectedCards(selected) {
  document.querySelectorAll('.emoji-card').forEach((card) => {
    const isSel = selected.has(card.dataset.emoji);
    if (card.classList.contains('selected') === isSel) return;
    card.classList.toggle('selected', isSel);
    const box = card.querySelector('.select-checkbox');
    if (box) box.textContent = isSel ? '✓' : '';
  });
}
