import * as state from './state.js';
import { load, save } from './storage.js';
import { setLang, applyTranslations, t, getLang } from './i18n.js';
import { setTheme, themeIcon } from './theme.js';
import { searchEmojis, filterByCategory, buildIndex, prepareSearch } from './search.js';
import {
  renderGrid,
  updateFavoriteButtons,
  updateSelectedCards,
  renderGridStatus,
} from './render.js';
import { openEmojiModal, closeModal, copyEmojiFromModal } from './modal.js';
import { toggleFavorite } from './favorites.js';
import { addToRecent } from './recent.js';
import {
  createCollection,
  deleteCollection,
  renameCollection,
  getCollection,
  getCollectionName,
  addManyToCollection,
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
  shareCollection,
  parseShareUrl,
  importSharedCollection,
  clearShareParam,
} from './share.js';
import { downloadExport, triggerImport, promptImportMode } from './importExport.js';
import { renderDashboard } from './stats.js';
import { registerShortcuts } from './shortcuts.js';
import { setupRovingTabindex } from './a11y.js';
import { initPwa, promptInstall } from './pwa.js';
import { toggleTheme, toggleLang } from './prefs.js';
import { showNotification } from './notify.js';
import { debounce } from './utils.js';
import {
  renderCategoriesUI,
  renderCollectionsBar,
  pickCollection,
  renderMiniSection,
} from './views.js';

// Shared handlers for every emoji grid (main, recent, favorites).
const gridHandlers = {
  // Usage stats are recorded on copy (modal.js / selection.js), not here.
  onClick: (e) => {
    addToRecent(e);
    openEmojiModal(e);
  },
  onFavorite: toggleFavorite,
  onSelect: toggleSelected,
};

async function loadEmojiData() {
  const catsRes = await fetch('./data/categories.json');
  if (!catsRes.ok) throw new Error(`categories.json: HTTP ${catsRes.status}`);
  const cats = await catsRes.json();
  state.set('categories', cats.categories);

  const all = [];
  const results = await Promise.all(
    cats.categories.map((cat) =>
      fetch(`./data/emojis/${cat.id}.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`${cat.id}: HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          all.push(...data.emojis);
          return true;
        })
        .catch((err) => {
          console.warn(`Failed to load ${cat.id}:`, err);
          return false;
        })
    )
  );
  // Every category failing means the dataset is unusable, not merely partial.
  if (!all.length) throw new Error('no emoji categories could be loaded');
  if (results.includes(false)) {
    showNotification(t('errorDataLoad'), 'error');
  }

  prepareSearch(all);
  state.set('emojis', all);
  state.set('emojisByChar', buildIndex(all));
  state.set('filtered', all);
}

// The CSP is delivered by <meta>, which cannot carry frame-ancestors, and
// GitHub Pages cannot set response headers — so refuse to run inside a frame
// here instead, to rule out clickjacking (e.g. a disguised "replace" import).
function isFramed() {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

function renderFramedNotice() {
  document.body.innerHTML = '';
  const a = document.createElement('a');
  a.href = window.location.href;
  a.target = '_top';
  a.rel = 'noopener';
  a.className = 'framed-notice';
  a.textContent = t('framedNotice');
  document.body.appendChild(a);
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
  setTheme(persisted.prefs.theme);
  applyTranslations();

  if (isFramed()) {
    renderFramedNotice();
    return;
  }

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = themeIcon(persisted.prefs.theme);
  updateLangButton();

  setupListeners();
  setupSubscriptions();
  registerShortcuts({
    onSearchFocus: () => {
      const inp = document.getElementById('searchInput');
      if (inp) inp.focus();
    },
    onThemeChange: () => {},
    onStatsToggle: () => toggleStatsView(),
  });

  renderGridStatus(document.getElementById('emojiGrid'), 'loading');

  loadEmojiData()
    .then(() => {
      renderCategoriesBar();
      renderAllSections();
      setupRovingTabindex('#emojiGrid');

      const shared = parseShareUrl();
      if (shared) {
        handleSharedCollection(shared);
        clearShareParam();
      }
    })
    .catch((err) => {
      // Previously this only reached the console, leaving the user staring at
      // an empty grid with no explanation.
      console.error('Failed to load emoji data:', err);
      renderGridStatus(document.getElementById('emojiGrid'), 'errorDataLoad', true);
      showNotification(t('errorDataLoad'), 'error');
    });

  initPwa();
}

function setupListeners() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Re-rendering happens in the 'lang' subscription, shared with the L shortcut
  // and with prefs applied from an imported file.
  document.getElementById('langToggle').addEventListener('click', toggleLang);

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('emojiModal').addEventListener('click', (e) => {
    if (e.target.id === 'emojiModal') closeModal();
  });
  document
    .getElementById('copyEmoji')
    .addEventListener('click', () => copyEmojiFromModal('emoji'));
  document
    .getElementById('copyUnicode')
    .addEventListener('click', () => copyEmojiFromModal('unicode'));
  document
    .getElementById('copyHtml')
    .addEventListener('click', () => copyEmojiFromModal('html'));

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
  document
    .getElementById('selAddToCollection')
    .addEventListener('click', addSelectionToCollection);

  document.getElementById('newCollectionBtn').addEventListener('click', () => {
    const name = prompt(t('promptCollectionName'));
    if (name) createCollection(name);
  });
  document.getElementById('exportBtn').addEventListener('click', downloadExport);
  document.getElementById('importBtn').addEventListener('click', async () => {
    const mode = await promptImportMode();
    if (mode) triggerImport(mode);
  });
  document.getElementById('statsBtn').addEventListener('click', toggleStatsView);
  document.getElementById('statsBackBtn').addEventListener('click', toggleStatsView);
  document.getElementById('installBtn').addEventListener('click', promptInstall);
}

function setupSubscriptions() {
  // localStorage writes are synchronous JSON.stringify over the whole blob;
  // coalesce bursts (a rapid multi-select, say) into a single write.
  let warnedStorageFull = false;
  const persist = debounce(() => {
    const ok = save({
      prefs: state.get('prefs'),
      favorites: state.get('favorites'),
      recent: state.get('recent'),
      collections: state.get('collections'),
      stats: state.get('stats'),
    });
    // Warn once per session rather than on every subsequent write.
    if (!ok && !warnedStorageFull) {
      warnedStorageFull = true;
      showNotification(t('errStorageFull'), 'error');
    }
  }, 300);

  ['favorites', 'recent', 'collections', 'stats', 'prefs'].forEach((key) => {
    state.subscribe(key, persist);
  });

  // Patch the star in place rather than rebuilding 1358 cards, which used to
  // discard scroll position and keyboard focus on every toggle.
  state.subscribe('favorites', (favs) => {
    updateFavoriteButtons(favs);
    renderFavoritesSection();
  });
  state.subscribe('recent', () => renderRecentSection());
  state.subscribe('collections', () => renderCollectionsUI());
  state.subscribe('selected', (sel) => {
    refreshBar();
    updateSelectedCards(sel);
  });
  state.subscribe('lang', () => onLanguageChanged());
  // Cards bake the tone into their glyph, so a tone change means a re-render.
  state.subscribe('skinTone', () => renderAllSections());
  state.subscribe('view', (view) => applyView(view));
}

function onLanguageChanged() {
  applyTranslations();
  updateLangButton();
  renderCategoriesBar();
  renderAllSections();
  // The dashboard is built from t() at render time and carries no data-i18n
  // hooks, so it has to be redrawn rather than re-translated in place.
  if (state.get('view') === 'stats') {
    renderDashboard(document.getElementById('statsContent'));
  }
}

function updateLangButton() {
  const btn = document.getElementById('langToggle');
  if (btn) btn.textContent = getLang() === 'ar' ? 'English' : 'العربية';
}

function renderCategoriesBar() {
  renderCategoriesUI(selectCategory);
}

function renderCollectionsUI() {
  renderCollectionsBar({
    onOpen: (coll) => {
      const current = state.get('currentCollection');
      state.set('currentCollection', current === coll.id ? null : coll.id);
      state.set('currentCategory', 'all');
      performFilter();
      renderCollectionsUI();
      renderCategoriesBar();
    },
    onShare: (coll) => shareCollection(coll),
    onRename: (coll) => {
      const newName = prompt(t('promptRenameCollection'), getCollectionName(coll, getLang()));
      if (newName) renameCollection(coll.id, newName);
    },
    onDelete: (coll) => {
      if (confirm(t('confirmDelete'))) deleteCollection(coll.id);
    },
  });
}

async function addSelectionToCollection() {
  const sel = state.get('selected');
  if (!sel.size) return;
  const target = await pickCollection();
  if (target === null) return;
  if (target === 'new') {
    const name = prompt(t('promptCollectionName'));
    if (!name) return;
    const coll = createCollection(name, [...sel]);
    state.set('currentCollection', coll.id);
  } else {
    addManyToCollection(target, [...sel]);
    state.set('currentCollection', target);
    showNotification(t('notificationAddedToCollection'));
  }
  exitSelectMode();
  performFilter();
  renderCollectionsUI();
}

function selectCategory(catId) {
  state.set('currentCategory', catId);
  state.set('currentCollection', null);
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  // Clearing only the input left the previous term in the store, so the grid
  // stayed filtered by a query the user could no longer see.
  state.set('query', '');
  performFilter();
  renderCategoriesBar();
  renderCollectionsUI();
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
  renderGrid(document.getElementById('emojiGrid'), state.get('filtered'), gridHandlers);
}

function renderRecentSection() {
  const byChar = state.get('emojisByChar');
  const items = state
    .get('recent')
    .slice(0, 10)
    .map((r) => byChar.get(r.e))
    .filter(Boolean);
  renderMiniSection('recentSection', 'recentEmojis', items, gridHandlers);
}

function renderFavoritesSection() {
  const byChar = state.get('emojisByChar');
  const items = state
    .get('favorites')
    .map((c) => byChar.get(c))
    .filter(Boolean);
  renderMiniSection('favoritesSection', 'favoriteEmojis', items, gridHandlers);
}

function renderAllSections() {
  renderMainGrid();
  renderRecentSection();
  renderFavoritesSection();
  renderCollectionsUI();
}

function toggleStatsView() {
  state.set('view', state.get('view') === 'stats' ? 'main' : 'stats');
}

function applyView(view) {
  const statsSection = document.getElementById('statsView');
  const mainSections = document.getElementById('mainView');
  const showStats = view === 'stats';
  statsSection.hidden = !showStats;
  mainSections.hidden = showStats;
  if (showStats) {
    renderDashboard(document.getElementById('statsContent'));
    document.getElementById('statsBackBtn').focus();
  } else {
    document.getElementById('statsBtn').focus();
  }
}

function handleSharedCollection(payload) {
  const lang = getLang();
  const n = payload.n || {};
  const name = n[lang] || n.ar || n.en || t('sharedCollectionDefault');
  const count = payload.e ? payload.e.length : 0;
  if (confirm(t('importSharedPrompt', { name, count }))) {
    importSharedCollection(payload);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
