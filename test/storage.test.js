import { describe, it, expect } from 'vitest';
import { exportData, importData, defaultState } from '../scripts/storage.js';

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
