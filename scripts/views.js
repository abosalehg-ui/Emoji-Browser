// View rendering that used to live in main.js, so main.js can go back to being
// a composition root. Every function takes its callbacks explicitly rather than
// importing back into main.js, which keeps the module graph acyclic.
import * as state from './state.js';
import { t, getLang } from './i18n.js';
import { getCollectionName } from './collections.js';
import { choiceDialog } from './dialog.js';
import { renderGrid } from './render.js';
import { setupRovingTabindex } from './a11y.js';

export function renderCategoriesUI(onSelect) {
  const container = document.getElementById('categories');
  if (!container) return;
  container.innerHTML = '';
  const cats = state.get('categories');
  const lang = getLang();
  const current = state.get('currentCategory');
  const inCollection = Boolean(state.get('currentCollection'));

  const frag = document.createDocumentFragment();
  frag.appendChild(
    categoryButton('all', '', t('catAll'), !inCollection && current === 'all', onSelect)
  );
  cats.forEach((cat) => {
    frag.appendChild(
      categoryButton(
        cat.id,
        cat.icon,
        lang === 'ar' ? cat.ar : cat.en,
        !inCollection && current === cat.id,
        onSelect
      )
    );
  });
  container.appendChild(frag);
}

function categoryButton(id, icon, label, isActive, onSelect) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'category-btn' + (isActive ? ' active' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', String(isActive));
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;
    btn.appendChild(iconEl);
  }
  const text = document.createElement('span');
  text.textContent = label;
  btn.appendChild(text);
  btn.addEventListener('click', () => onSelect(id));
  return btn;
}

const CHIP_ACTIONS = [
  { action: 'share', icon: '🔗', titleKey: 'btnShare' },
  { action: 'rename', icon: '✏️', titleKey: 'btnRename' },
  { action: 'delete', icon: '🗑️', titleKey: 'btnDelete' },
];

export function renderCollectionsBar({ onOpen, onShare, onRename, onDelete }) {
  const bar = document.getElementById('collectionsBar');
  if (!bar) return;
  const colls = state.get('collections');
  const lang = getLang();
  const current = state.get('currentCollection');
  bar.innerHTML = '';
  if (!colls.length) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;

  const handlers = { share: onShare, rename: onRename, delete: onDelete };
  const frag = document.createDocumentFragment();

  colls.forEach((coll) => {
    const group = document.createElement('div');
    group.className = 'collection-chip' + (current === coll.id ? ' active' : '');
    group.style.borderColor = coll.color;

    // The chip itself is a real <button>: it used to be a click-only <div>,
    // which left selecting a collection reachable by mouse alone. Action
    // buttons are siblings, not children, so buttons are never nested.
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'chip-open';
    openBtn.setAttribute('aria-pressed', String(current === coll.id));
    // Collection names may originate from untrusted sources (shared URLs,
    // imported files), so they are only ever written as text.
    const nameSpan = document.createElement('span');
    nameSpan.textContent = getCollectionName(coll, lang) || t('btnNewCollection');
    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = String((coll.emojis || []).length);
    openBtn.append(nameSpan, countSpan);
    openBtn.setAttribute('aria-label', `${t('ariaCollectionChip')}: ${nameSpan.textContent}`);
    openBtn.addEventListener('click', () => onOpen(coll));
    group.appendChild(openBtn);

    CHIP_ACTIONS.forEach(({ action, icon, titleKey }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-action';
      btn.title = t(titleKey);
      btn.setAttribute('aria-label', `${t(titleKey)}: ${nameSpan.textContent}`);
      btn.textContent = icon;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers[action](coll);
      });
      group.appendChild(btn);
    });

    frag.appendChild(group);
  });

  bar.appendChild(frag);
}

// Lets the user pick a target collection with buttons rather than by typing a
// number into prompt(). Resolves with the chosen collection id, the string
// 'new', or null when cancelled.
export function pickCollection() {
  const colls = state.get('collections');
  if (!colls.length) return Promise.resolve('new');
  const lang = getLang();
  return choiceDialog({
    title: t('pickCollectionTitle'),
    options: [
      ...colls.map((c) => ({
        label: `${getCollectionName(c, lang)} (${(c.emojis || []).length})`,
        value: c.id,
      })),
      { label: t('pickCollectionNew'), value: 'new' },
    ],
  });
}

// Shared body of the "recent" and "favorites" strips: hide the section when
// there is nothing to show, otherwise render the given emoji objects.
export function renderMiniSection(sectionId, containerId, items, handlers) {
  const section = document.getElementById(sectionId);
  const container = document.getElementById(containerId);
  if (!section || !container) return;
  if (!items.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  renderGrid(container, items, handlers);
  setupRovingTabindex(`#${containerId}`);
}
