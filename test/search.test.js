import { describe, it, expect } from 'vitest';
import {
  searchEmojis,
  filterByCategory,
  buildIndex,
  prepareSearch,
} from '../scripts/search.js';

const sample = [
  {
    emoji: '😀',
    category: 'smileys',
    arName: 'وجه مبتسم',
    enName: 'Grinning Face',
    keywords: ['happy', 'smile'],
  },
  {
    emoji: '🐶',
    category: 'animals',
    arName: 'كلب',
    enName: 'Dog',
    keywords: ['pet'],
  },
];

describe('searchEmojis', () => {
  it('returns all when query is empty', () => {
    expect(searchEmojis(sample, '')).toHaveLength(2);
  });

  it('matches English name case-insensitively', () => {
    expect(searchEmojis(sample, 'DOG')).toEqual([sample[1]]);
  });

  it('matches Arabic name', () => {
    expect(searchEmojis(sample, 'مبتسم')).toEqual([sample[0]]);
  });

  it('matches keywords', () => {
    expect(searchEmojis(sample, 'pet')).toEqual([sample[1]]);
  });

  it('returns empty array on no match', () => {
    expect(searchEmojis(sample, 'zzz')).toEqual([]);
  });
});

describe('filterByCategory', () => {
  it('returns all for "all" or falsy', () => {
    expect(filterByCategory(sample, 'all')).toHaveLength(2);
    expect(filterByCategory(sample, null)).toHaveLength(2);
  });

  it('filters by category id', () => {
    expect(filterByCategory(sample, 'animals')).toEqual([sample[1]]);
  });
});

describe('buildIndex', () => {
  it('maps emoji char to object', () => {
    const idx = buildIndex(sample);
    expect(idx.get('🐶')).toBe(sample[1]);
    expect(idx.size).toBe(2);
  });
});

describe('prepareSearch', () => {
  it('attaches a lowercase _search haystack', () => {
    const [a] = prepareSearch([{ ...sample[0] }]);
    expect(a._search).toContain('grinning face');
    expect(a._search).toContain('وجه مبتسم');
  });
});
