import * as state from './state.js';
import { load, save } from './storage.js';
import { setLang, applyTranslations, t, getLang } from './i18n.js';
import { setTheme, cycleTheme, themeIcon, getSystemTheme } from './theme.js';
import { searchEmojis, filterByCategory, buildIndex } from './search.js';
import { renderGrid, createEmojiCard } from './render.js';
import { openEmojiModal, closeModal, copyEmojiFromModal } from './modal.js';
import { showNotification } from './notify.js';
import { toggleFavorite } from './favorites.js';
import { addToRecent } from './recent.js';
import {
  createCollection,
  deleteCollection,
  renameCollection,
  addManyToCollection,
  getCollection,
  getCollectionName,
} from './collections.js';
import {
  enterSelectMode,
  exitSelectMode,
  toggleSelected,
  clearSelection,
  copyAllSelected,
  refreshBar,
} from './selection.js';
import {
  buildShareUrl,
  shareCollection,
  parseShareUrl,
  importSharedCollection,
  clearShareParam,
} from './share.js';
import { downloadExport, triggerImport } from './importExport.js';
import { renderDashboard, recordUsage } from './stats.js';
import { registerShortcuts } from './shortcuts.js';
import { setupRovingTabindex } from './a11y.js';
import { initPwa, promptInstall } from './pwa.js';
import { debounce } from './utils.js';

async function loadEmojiData() {
  try {
    const catsRes = await fetch('./data/categories.json');
    const cats = await catsRes.json();
    state.set('categories', cats.categories);

    const all = [];
    const loadingPromises = cats.categories.map((cat) =>
      fetch(`./data/emojis/${cat.id}.json`)
        .then((r) => r.json())
        .then((data) => {
          all.push(...data.emojis);
          state.get('emojisLoaded').add(cat.id);
        })
        .catch((err) => console.warn(`Failed to load ${cat.id}:`, err))
    );
    await Promise.all(loadingPromises);

    state.set('emojis', all);
    state.set('emojisByChar', buildIndex(all));
    state.set('filtered', all);
  } catch (err) {
    console.error('Failed to load emoji data:', err);
  }
}

function init() {
  const persisted = load();
  state.set('prefs', persisted.prefs);
  state.set('favorites', persisted.favorites);
  state.set('recent', persisted.recent);
  state.set('collections', persisted.collections);
  state.set('stats', persisted.stats);
  state.set('lang', persisted.prefs.lang);
  state.set('theme', persisted.prefs.theme);
  state.set('skinTone', persisted.prefs.skinTone);

  setLang(persisted.prefs.lang);
  let initialTheme = persisted.prefs.theme;
  if (initialTheme === 'auto') initialTheme = getSystemTheme();
  setTheme(initialTheme);
  applyTranslations();

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = themeIcon(initialTheme);
  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.textContent = persisted.prefs.lang === 'ar' ? 'English' : 'العربية';

  setupListeners();
  setupSubscriptions();
  registerShortcuts({
    onSearchFocus: () => {
      const inp = document.getElementById('searchInput');
      if (inp) inp.focus();
    },
    onLangChange: () => {
      applyTranslations();
      updateLangButton();
      renderCategoriesUI();
      renderAllSections();
    },
    onThemeChange: () => {},
    onStatsToggle: () => toggleStatsView(),
  });

  loadEmojiData().then(() => {
    renderCategoriesUI();
    renderAllSections();
    setupRovingTabindex('#emojiGrid');

    const shared = parseShareUrl();
    if (shared) {
      handleSharedCollection(shared);
      clearShareParam();
    }
  });

  initPwa();
}

function setupListeners() {
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = cycleTheme(state.get('theme'));
    state.set('theme', next);
    setTheme(next);
    const prefs = state.get('prefs');
    prefs.theme = next;
    state.set('prefs', prefs);
    document.getElementById('themeToggle').textContent = themeIcon(next);
  });

  document.getElementById('langToggle').addEventListener('click', () => {
    const nextLang = getLang() === 'ar' ? 'en' : 'ar';
    state.set('lang', nextLang);
    const prefs = state.get('prefs');
    prefs.lang = nextLang;
    state.set('prefs', prefs);
    setLang(nextLang);
    applyTranslations();
    updateLangButton();
    renderCategoriesUI();
    renderAllSections();
  });

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('emojiModal').addEventListener('click', (e) => {
    if (e.target.id === 'emojiModal') closeModal();
  });
  document.getElementById('copyEmoji').addEventListener('click', () =>
    copyEmojiFromModal('emoji')
  );
  document.getElementById('copyUnicode').addEventListener('click', () =>
    copyEmojiFromModal('unicode')
  );
  document.getElementById('copyHtml').addEventListener('click', () =>
    copyEmojiFromModal('html')
  );

  const searchInput = document.getElementById('searchInput');
  const debounced = debounce(() => performSearch(), 200);
  searchInput.addEventListener('input', debounced);
  document.getElementById('searchBtn').addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  document.getElementById('selectModeBtn').addEventListener('click', () => {
    if (state.get('selectMode')) exitSelectMode();
    else enterSelectMode();
  });
  document.getElementById('selExit').addEventListener('click', exitSelectMode);
  document.getElementById('selCopy').addEventListener('click', copyAllSelected);
  document.getElementById('selClear').addEventListener('click', clearSelection);
  document.getElementById('selAddToCollection').addEventListener('click', () => {
    const sel = state.get('selected');
    if (!sel.size) return;
    const name = prompt(t('promptCollectionName'));
    if (!name) return;
    const coll = createCollection(name, [...sel]);
    state.set('currentCollection', coll.id);
    exitSelectMode();
  });

  document.getElementById('newCollectionBtn').addEventListener('click', () => {
    const name = prompt(t('promptCollectionName'));
    if (name) createCollection(name);
  });
  document.getElementById('exportBtn').addEventListener('click', downloadExport);
  document.getElementById('importBtn').addEventListener('click', () => triggerImport('merge'));
  document.getElementById('statsBtn').addEventListener('click', toggleStatsView);
  document.getElementById('installBtn').addEventListener('click', promptInstall);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('emojiModal');
      if (modal.classList.contains('show')) closeModal();
    }
  });
}

function setupSubscriptions() {
  const persistKeys = ['favorites', 'recent', 'collections', 'stats', 'prefs'];
  persistKeys.forEach((key) => {
    state.subscribe(key, () => {
      save({
        prefs: state.get('prefs'),
        favorites: state.get('favorites'),
        recent: state.get('recent'),
        collections: state.get('collections'),
        stats: state.get('stats'),
      });
    });
  });

  state.subscribe('favorites', () => renderAllSections());
  state.subscribe('recent', () => renderRecentSection());
  state.subscribe('collections', () => renderCollectionsBar());
  state.subscribe('selected', () => {
    refreshBar();
    refreshSelectedCards();
  });
}

function updateLangButton() {
  const btn = document.getElementById('langToggle');
  if (btn) btn.textContent = getLang() === 'ar' ? 'English' : 'العربية';
}

function renderCategoriesUI() {
  const container = document.getElementById('categories');
  container.innerHTML = '';
  const cats = state.get('categories');
  const lang = getLang();
  const current = state.get('currentCategory');

  const allBtn = document.createElement('button');
  allBtn.className = 'category-btn' + (current === 'all' ? ' active' : '');
  allBtn.textContent = lang === 'ar' ? 'الكل' : 'All';
  allBtn.addEventListener('click', () => selectCategory('all'));
  container.appendChild(allBtn);

  cats.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'category-btn' + (current === cat.id ? ' active' : '');
    btn.innerHTML = `<span>${cat.icon}</span><span>${lang === 'ar' ? cat.ar : cat.en}</span>`;
    btn.addEventListener('click', () => selectCategory(cat.id));
    container.appendChild(btn);
  });
}

function selectCategory(catId) {
  state.set('currentCategory', catId);
  state.set('currentCollection', null);
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  performFilter();
  renderCategoriesUI();
  renderCollectionsBar();
}

function performSearch() {
  const q = document.getElementById('searchInput').value;
  state.set('query', q);
  performFilter();
}

function performFilter() {
  let list = state.get('emojis');
  const collId = state.get('currentCollection');
  if (collId) {
    const coll = getCollection(collId);
    if (coll) {
      const byChar = state.get('emojisByChar');
      list = coll.emojis.map((e) => byChar.get(e)).filter(Boolean);
    }
  } else {
    list = filterByCategory(list, state.get('currentCategory'));
  }
  const q = state.get('query');
  if (q) list = searchEmojis(list, q);
  state.set('filtered', list);
  renderMainGrid();
}

function renderMainGrid() {
  const container = document.getElementById('emojiGrid');
  renderGrid(container, state.get('filtered'), {
    onClick: (e) => {
      addToRecent(e);
      recordUsage(e.emoji);
      openEmojiModal(e);
    },
    onFavorite: toggleFavorite,
    onSelect: toggleSelected,
  });
}

function renderRecentSection() {
  const section = document.getElementById('recentSection');
  const container = document.getElementById('recentEmojis');
  const recent = state.get('recent');
  const byChar = state.get('emojisByChar');
  if (!recent.length || !byChar.size) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  const items = recent
    .slice(0, 10)
    .map((r) => byChar.get(r.e))
    .filter(Boolean);
  renderGrid(container, items, {
    onClick: (e) => {
      addToRecent(e);
      recordUsage(e.emoji);
      openEmojiModal(e);
    },
    onFavorite: toggleFavorite,
    onSelect: toggleSelected,
  });
}

function renderFavoritesSection() {
  const section = document.getElementById('favoritesSection');
  const container = document.getElementById('favoriteEmojis');
  const favs = state.get('favorites');
  const byChar = state.get('emojisByChar');
  if (!favs.length || !byChar.size) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  const items = favs.map((c) => byChar.get(c)).filter(Boolean);
  renderGrid(container, items, {
    onClick: (e) => {
      addToRecent(e);
      recordUsage(e.emoji);
      openEmojiModal(e);
    },
    onFavorite: toggleFavorite,
    onSelect: toggleSelected,
  });
}

function renderCollectionsBar() {
  const bar = document.getElementById('collectionsBar');
  if (!bar) return;
  const colls = state.get('collections');
  const lang = getLang();
  const current = state.get('currentCollection');
  bar.innerHTML = '';
  if (!colls.length) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  colls.forEach((coll) => {
    const chip = document.createElement('div');
    chip.className = 'collection-chip' + (current === coll.id ? ' active' : '');
    chip.style.borderColor = coll.color;
    chip.innerHTML = `
      <span>${getCollectionName(coll, lang) || 'Untitled'}</span>
      <span class="count">${coll.emojis.length}</span>
      <button class="icon-btn" data-action="share" title="${t('btnShare')}"
        style="background:transparent;color:inherit;padding:0;min-width:auto;min-height:auto;font-size:14px;">🔗</button>
      <button class="icon-btn" data-action="rename" title="${t('btnRename')}"
        style="background:transparent;color:inherit;padding:0;min-width:auto;min-height:auto;font-size:14px;">✏️</button>
      <button class="icon-btn" data-action="delete" title="${t('btnDelete')}"
        style="background:transparent;color:inherit;padding:0;min-width:auto;min-height:auto;font-size:14px;">🗑️</button>
    `;
    chip.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        e.stopPropagation();
        const act = action.getAttribute('data-action');
        if (act === 'delete') {
          if (confirm(t('confirmDelete'))) deleteCollection(coll.id);
        } else if (act === 'rename') {
          const newName = prompt(t('promptRenameCollection'), getCollectionName(coll, lang));
          if (newName) renameCollection(coll.id, newName);
        } else if (act === 'share') {
          shareCollection(coll);
        }
        return;
      }
      state.set('currentCollection', current === coll.id ? null : coll.id);
      state.set('currentCategory', 'all');
      performFilter();
      renderCollectionsBar();
      renderCategoriesUI();
    });
    bar.appendChild(chip);
  });
}

function renderAllSections() {
  renderMainGrid();
  renderRecentSection();
  renderFavoritesSection();
  renderCollectionsBar();
}

function refreshSelectedCards() {
  const sel = state.get('selected');
  document.querySelectorAll('.emoji-card').forEach((card) => {
    const name = card.querySelector('.emoji-icon');
    if (!name) return;
    const ch = name.textContent.trim();
    const isSel = sel.has(ch) || [...sel].some((s) => ch.startsWith(s));
    card.classList.toggle('selected', isSel);
    const box = card.querySelector('.select-checkbox');
    if (box) box.textContent = isSel ? '✓' : '';
  });
}

let statsView = false;
function toggleStatsView() {
  statsView = !statsView;
  const statsSection = document.getElementById('statsView');
  const mainSections = document.getElementById('mainView');
  if (statsView) {
    statsSection.style.display = 'block';
    mainSections.style.display = 'none';
    renderDashboard(statsSection);
  } else {
    statsSection.style.display = 'none';
    mainSections.style.display = 'block';
  }
}

function handleSharedCollection(payload) {
  const lang = getLang();
  const name = payload.n
    ? payload.n[lang] || payload.n.ar || payload.n.en
    : 'Shared Collection';
  const count = payload.e ? payload.e.length : 0;
  const msg = lang === 'ar'
    ? `استيراد مجموعة "${name}" تحتوي على ${count} إيموجي؟`
    : `Import collection "${name}" with ${count} emojis?`;
  if (confirm(msg)) {
    importSharedCollection(payload);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
