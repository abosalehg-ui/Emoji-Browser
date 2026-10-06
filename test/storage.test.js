import { describe, it, expect, vi } from 'vitest';
import {
  exportData,
  importData,
  defaultState,
  normalize,
  safePrefs,
  safeCollection,
  save,
} from '../scripts/storage.js';

describe('exportData', () => {
  it('wraps state with schema tag and timestamp', () => {
    const out = exportData({
      prefs: { lang: 'en' },
      favorites: ['😀'],
      collections: [],
      stats: {},
    });
    expect(out.schema).toBe('emoji-browser/v1');
    expect(out.favorites).toEqual(['😀']);
    expect(typeof out.exportedAt).toBe('string');
  });
});

describe('importData', () => {
  const current = {
    prefs: { lang: 'ar', theme: 'light' },
    favorites: ['😀'],
    collections: [{ id: 'a', emojis: ['😀'] }],
    stats: { counts: { '😀': 1 } },
  };

  it('rejects an invalid schema', () => {
    expect(() => importData({ schema: 'nope' }, current)).toThrow('Invalid file format');
  });

  it('merges favorites without duplicates', () => {
    const data = { schema: 'emoji-browser/v1', favorites: ['😀', '🐶'] };
    const next = importData(data, current, 'merge');
    expect(next.favorites.sort()).toEqual(['🐶', '😀'].sort());
  });

  it('does not add collections with an existing id on merge', () => {
    const data = {
      schema: 'emoji-browser/v1',
      collections: [
        { id: 'a', emojis: ['x'] },
        { id: 'b', emojis: ['y'] },
      ],
    };
    const next = importData(data, current, 'merge');
    expect(next.collections.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('replaces favorites and collections in replace mode', () => {
    const data = {
      schema: 'emoji-browser/v1',
      favorites: ['🐶'],
      collections: [{ id: 'z', emojis: [] }],
    };
    const next = importData(data, current, 'replace');
    expect(next.favorites).toEqual(['🐶']);
    expect(next.collections.map((c) => c.id)).toEqual(['z']);
  });
});

describe('defaultState', () => {
  it('has schemaVersion and empty collections', () => {
    const s = defaultState();
    expect(s.schemaVersion).toBe(1);
    expect(s.collections).toEqual([]);
  });
});

// A partially-written or hand-edited localStorage blob used to be returned
// verbatim, and the first `persisted.prefs.lang` read then took down boot.
describe('normalize', () => {
  it('fills a blob that only carries a schema version', () => {
    const out = normalize({ schemaVersion: 1 });
    expect(out.prefs).toEqual(defaultState().prefs);
    expect(out.favorites).toEqual([]);
    expect(out.collections).toEqual([]);
    expect(out.stats).toEqual({ counts: {}, firstSeen: {}, lastUsed: {} });
  });

  it('survives entirely bogus input', () => {
    for (const bad of [null, undefined, 'x', 7, []]) {
      expect(normalize(bad).prefs.lang).toBe('ar');
    }
  });

  it('replaces wrong-typed collections with an empty list', () => {
    expect(normalize({ collections: 'nope' }).collections).toEqual([]);
    expect(normalize({ collections: [null, 5, {}] }).collections).toEqual([]);
  });

  it('drops recent entries without an emoji char', () => {
    const out = normalize({ recent: [{ e: '😀', t: 1 }, { t: 2 }, null] });
    expect(out.recent).toEqual([{ e: '😀', t: 1 }]);
  });
});

describe('safePrefs', () => {
  it('drops an unknown language rather than letting it reach t()', () => {
    expect(safePrefs({ lang: 'fr' })).toEqual({});
    expect(safePrefs({ lang: 'en' })).toEqual({ lang: 'en' });
  });

  it('drops an unknown theme and skin tone', () => {
    expect(safePrefs({ theme: '<script>', skinTone: 'neon' })).toEqual({});
    expect(safePrefs({ theme: 'sepia', skinTone: 'dark' })).toEqual({
      theme: 'sepia',
      skinTone: 'dark',
    });
  });

  it('tolerates non-object input', () => {
    expect(safePrefs(null)).toEqual({});
    expect(safePrefs('x')).toEqual({});
  });
});

describe('safeCollection', () => {
  it('rejects entries without a string id', () => {
    expect(safeCollection(null)).toBeNull();
    expect(safeCollection({})).toBeNull();
    expect(safeCollection({ id: 7 })).toBeNull();
  });

  it('guarantees an emojis array so renderers cannot read length of undefined', () => {
    expect(safeCollection({ id: 'a' }).emojis).toEqual([]);
    expect(safeCollection({ id: 'a', emojis: 'nope' }).emojis).toEqual([]);
  });

  it('caps the emoji list and de-duplicates it', () => {
    const c = safeCollection({ id: 'a', emojis: [...Array(900).fill('😀'), '🐶'] });
    expect(c.emojis).toEqual(['😀', '🐶']);
  });

  it('falls back to a safe color when the value is not a hex literal', () => {
    expect(safeCollection({ id: 'a', color: 'url(evil)' }).color).toBe('#2c6cb0');
    expect(safeCollection({ id: 'a', color: '#abcdef' }).color).toBe('#abcdef');
  });
});

describe('importData validation', () => {
  const current = defaultState();

  it('ignores an invalid prefs.lang from an imported file', () => {
    const next = importData(
      { schema: 'emoji-browser/v1', prefs: { lang: 'fr', theme: 'dark' } },
      current,
      'merge'
    );
    expect(next.prefs.lang).toBe('ar');
    expect(next.prefs.theme).toBe('dark');
  });

  it('drops malformed collections instead of storing them', () => {
    const next = importData(
      { schema: 'emoji-browser/v1', collections: [{ id: 'ok' }, null, { emojis: [] }] },
      current,
      'replace'
    );
    expect(next.collections).toHaveLength(1);
    expect(next.collections[0].emojis).toEqual([]);
  });

  it('drops non-string favorites', () => {
    const next = importData(
      { schema: 'emoji-browser/v1', favorites: ['😀', 3, null, {}] },
      current,
      'replace'
    );
    expect(next.favorites).toEqual(['😀']);
  });
});

describe('save', () => {
  it('reports a failed write (e.g. quota exceeded) by returning false', () => {
    const spy = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new window.DOMException('full', 'QuotaExceededError');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(save(defaultState())).toBe(false);
    spy.mockRestore();
    expect(save(defaultState())).toBe(true);
  });
});

describe('length limits on untrusted emoji strings', () => {
  it('drops oversized entries from favorites, collections and stats', () => {
    const big = 'x'.repeat(1000);
    const out = normalize({
      favorites: ['😀', big],
      collections: [{ id: 'a', name: { ar: 'x' }, emojis: ['🐶', big] }],
      stats: { counts: { '😀': 2, [big]: 9 } },
    });
    expect(out.favorites).toEqual(['😀']);
    expect(out.collections[0].emojis).toEqual(['🐶']);
    expect(out.stats.counts).toEqual({ '😀': 2 });
  });
});
