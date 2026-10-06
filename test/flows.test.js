// DOM-level flows: the parts of the app that wire modules together, which the
// pure-function suites cannot reach. Each regression fixed alongside this file
// (skin tone, imported prefs, silent copy failures, shortcuts) has a test here.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as state from '../scripts/state.js';
import { applyTone } from '../scripts/skinTone.js';
import { applyPrefs, setSkinTone } from '../scripts/prefs.js';
import { renderGrid } from '../scripts/render.js';
import { copyAllSelected } from '../scripts/selection.js';
import { openEmojiModal, copyEmojiFromModal, closeModal } from '../scripts/modal.js';
import { registerShortcuts } from '../scripts/shortcuts.js';
import { choiceDialog } from '../scripts/dialog.js';
import { t, setLang } from '../scripts/i18n.js';

const WAVE = { emoji: '👋', arName: 'يد ملوحة', enName: 'Waving Hand', skinToneBase: true };
const VICTORY = { emoji: '✌️', arName: 'علامة النصر', enName: 'Victory', skinToneBase: true };
const DOG = { emoji: '🐶', arName: 'كلب', enName: 'Dog' };

function mockClipboard(impl = () => Promise.resolve()) {
  const writeText = vi.fn(impl);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function resetState() {
  setLang('ar');
  state.set('favorites', []);
  state.set('selected', new Set());
  state.set('selectMode', false);
  state.set('skinTone', 'default');
  state.set('theme', 'light');
  state.set('lang', 'ar');
  state.set('prefs', { lang: 'ar', theme: 'light', skinTone: 'default' });
  state.set('stats', { counts: {}, firstSeen: {}, lastUsed: {} });
  state.set('emojisByChar', new Map([WAVE, VICTORY, DOG].map((e) => [e.emoji, e])));
}

beforeEach(() => {
  document.body.innerHTML = `
    <div id="grid"></div>
    <div id="notification"></div>
    <div id="srNotify"></div>
    <div id="selectionBar"><span id="selectedCount"></span>
      <select id="separatorSelect"><option value="space" selected>space</option></select>
    </div>
    <div id="emojiModal" class="modal">
      <button id="closeModal"></button>
      <div id="modalEmoji"></div><div id="skinToneRow"></div>
      <div id="emojiArName"></div><div id="emojiEnName"></div>
      <div id="emojiUnicode"></div><div id="emojiDesc"></div>
      <div id="keywordsRow"></div><div id="emojiKeywords"></div>
      <button id="copyEmoji"></button>
    </div>`;
  resetState();
});

describe('applyTone', () => {
  it('appends the modifier directly after the base code point', () => {
    expect(applyTone('👋', 'medium')).toBe('👋\u{1F3FD}');
  });

  it('drops U+FE0F so the modifier is not detached from the base', () => {
    for (const ch of ['🖐️', '✌️', '☝️', '✍️', '🕵️']) {
      const out = applyTone(ch, 'dark');
      expect(out).not.toContain('️');
      expect(out.endsWith('\u{1F3FF}')).toBe(true);
    }
  });

  it('leaves the emoji untouched for the default tone', () => {
    expect(applyTone('✌️', 'default')).toBe('✌️');
  });
});

describe('renderGrid (event delegation)', () => {
  it('routes card, star and select-mode clicks to the right handler', () => {
    const grid = document.getElementById('grid');
    const handlers = { onClick: vi.fn(), onFavorite: vi.fn(), onSelect: vi.fn() };
    renderGrid(grid, [WAVE, DOG], handlers);

    const cards = grid.querySelectorAll('.emoji-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('role')).toBe('listitem');

    cards[1].click();
    expect(handlers.onClick).toHaveBeenCalledWith(DOG);

    cards[0].querySelector('.favorite-btn').click();
    expect(handlers.onFavorite).toHaveBeenCalledWith(WAVE);
    expect(handlers.onClick).toHaveBeenCalledTimes(1);

    state.set('selectMode', true);
    cards[0].click();
    expect(handlers.onSelect).toHaveBeenCalledWith(WAVE);
  });

  it('uses the latest handlers after a re-render without stacking listeners', () => {
    const grid = document.getElementById('grid');
    const first = { onClick: vi.fn() };
    const second = { onClick: vi.fn() };
    renderGrid(grid, [DOG], first);
    renderGrid(grid, [DOG], second);
    grid.querySelector('.emoji-card').click();
    expect(first.onClick).not.toHaveBeenCalled();
    expect(second.onClick).toHaveBeenCalledTimes(1);
  });

  it('skips the staggered animation for large result sets', () => {
    const grid = document.getElementById('grid');
    const many = Array.from({ length: 150 }, (_, i) => ({ emoji: `x${i}`, arName: 'x' }));
    renderGrid(grid, many, {});
    expect(grid.classList.contains('no-anim')).toBe(true);
    renderGrid(grid, [DOG], {});
    expect(grid.classList.contains('no-anim')).toBe(false);
  });

  it('renders the chosen skin tone on toneable cards', () => {
    setSkinTone('dark');
    const grid = document.getElementById('grid');
    renderGrid(grid, [WAVE, DOG], {});
    const icons = [...grid.querySelectorAll('.emoji-icon')].map((n) => n.textContent);
    expect(icons).toEqual(['👋\u{1F3FF}', '🐶']);
    expect(state.get('prefs').skinTone).toBe('dark');
  });
});

describe('copyAllSelected', () => {
  it('applies the skin tone, joins with the separator and records usage', async () => {
    const writeText = mockClipboard();
    state.set('skinTone', 'light');
    state.set('selected', new Set(['✌️', '🐶']));
    await copyAllSelected();
    expect(writeText).toHaveBeenCalledWith('✌\u{1F3FB} 🐶');
    expect(state.get('stats').counts).toEqual({ '✌️': 1, '🐶': 1 });
  });

  it('reports a failed copy instead of claiming success', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    state.set('selected', new Set(['🐶']));
    await copyAllSelected();
    const note = document.getElementById('notification');
    expect(note.textContent).toBe(t('errCopyFailed'));
    expect(note.classList.contains('error')).toBe(true);
    expect(state.get('stats').counts).toEqual({});
  });
});

describe('emoji modal', () => {
  it('records usage on copy, not on open', async () => {
    mockClipboard();
    openEmojiModal(DOG);
    expect(state.get('stats').counts).toEqual({});
    copyEmojiFromModal('emoji');
    await flush();
    expect(state.get('stats').counts).toEqual({ '🐶': 1 });
    closeModal();
  });

  it('keeps focus on the swatch row after picking a tone', () => {
    openEmojiModal(WAVE);
    const swatches = () => [...document.querySelectorAll('.skintone-swatch')];
    const target = swatches()[3];
    target.focus();
    target.click();
    // Updated in place: the same node is still attached and still focused.
    expect(swatches()[3]).toBe(target);
    expect(document.activeElement).toBe(target);
    expect(target.getAttribute('aria-pressed')).toBe('true');
    expect(state.get('skinTone')).toBe('medium');
    closeModal();
  });
});

describe('applyPrefs (imported preferences)', () => {
  it('applies theme, language and skin tone immediately', () => {
    const onLang = vi.fn();
    const unsubscribe = state.subscribe('lang', onLang);
    applyPrefs({ theme: 'dark', lang: 'en', skinTone: 'medium' });
    unsubscribe();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(state.get('theme')).toBe('dark');
    expect(state.get('skinTone')).toBe('medium');
    expect(state.get('prefs')).toMatchObject({
      theme: 'dark',
      lang: 'en',
      skinTone: 'medium',
    });
    expect(onLang).toHaveBeenCalledWith('en');
  });
});

describe('keyboard shortcuts', () => {
  // registerShortcuts attaches to document, so register once for the suite.
  const onStatsToggle = vi.fn();
  registerShortcuts({ onSearchFocus: () => {}, onStatsToggle });
  const press = (key, opts = {}, target = document.body) =>
    target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, ...opts }));

  beforeEach(() => onStatsToggle.mockClear());

  it('fires a plain single-key shortcut', () => {
    press('i');
    expect(onStatsToggle).toHaveBeenCalledTimes(1);
  });

  it('ignores browser chords such as Ctrl+I or Alt+I', () => {
    press('i', { ctrlKey: true });
    press('i', { altKey: true });
    press('i', { metaKey: true });
    expect(onStatsToggle).not.toHaveBeenCalled();
  });

  it('ignores keys typed into a <select>', () => {
    press('i', {}, document.getElementById('separatorSelect'));
    expect(onStatsToggle).not.toHaveBeenCalled();
  });

  it('ignores single-key shortcuts while the modal is open', () => {
    document.getElementById('emojiModal').classList.add('show');
    press('i');
    expect(onStatsToggle).not.toHaveBeenCalled();
  });
});

describe('choiceDialog', () => {
  it('resolves with the clicked option and removes itself', async () => {
    const p = choiceDialog({
      title: 'Pick',
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    });
    const buttons = document.querySelectorAll('dialog .choice-option');
    expect(buttons).toHaveLength(2);
    buttons[1].click();
    await expect(p).resolves.toBe('b');
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('resolves null on cancel', async () => {
    const p = choiceDialog({ title: 'Pick', options: [{ label: 'A', value: 'a' }] });
    document.querySelector('dialog .choice-cancel').click();
    await expect(p).resolves.toBeNull();
  });
});

describe('t() interpolation', () => {
  it('fills placeholders in both languages', () => {
    setLang('en');
    expect(t('importSharedPrompt', { name: 'Fun', count: 3 })).toBe(
      'Import collection "Fun" with 3 emojis?'
    );
    setLang('ar');
    expect(t('importSharedPrompt', { name: 'مرح', count: 3 })).toContain('"مرح"');
  });
});
