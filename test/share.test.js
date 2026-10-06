import { describe, it, expect } from 'vitest';
import { sanitizeSharePayload, buildShareUrl } from '../scripts/share.js';
import { fromBase64Url } from '../scripts/utils.js';

// The share payload is the only path where fully attacker-controlled data
// reaches the store, so it gets the closest scrutiny in the suite.
describe('sanitizeSharePayload', () => {
  it('rejects non-object input', () => {
    expect(sanitizeSharePayload(null)).toBeNull();
    expect(sanitizeSharePayload('nope')).toBeNull();
    expect(sanitizeSharePayload(42)).toBeNull();
  });

  it('keeps well-formed payloads intact', () => {
    const out = sanitizeSharePayload({
      n: { ar: 'مجموعتي', en: 'Mine' },
      e: ['😀', '🐶'],
      c: '#4a90e2',
    });
    expect(out).toEqual({ n: { ar: 'مجموعتي', en: 'Mine' }, e: ['😀', '🐶'], c: '#4a90e2' });
  });

  it('coerces a non-object name to empty strings', () => {
    expect(sanitizeSharePayload({ n: 'evil', e: [] }).n).toEqual({ ar: '', en: '' });
  });

  it('drops non-string names and markup-bearing names are kept as inert text', () => {
    const out = sanitizeSharePayload({ n: { ar: 123, en: '<img src=x onerror=alert(1)>' } });
    expect(out.n.ar).toBe('');
    // Not stripped here — rendering uses textContent, so it can never execute.
    expect(out.n.en).toBe('<img src=x onerror=alert(1)>');
  });

  it('caps name length at 100 characters', () => {
    const out = sanitizeSharePayload({ n: { ar: 'ا'.repeat(500), en: '' } });
    expect(out.n.ar).toHaveLength(100);
  });

  it('caps the emoji list at 500 entries and drops non-strings', () => {
    const out = sanitizeSharePayload({ e: [...Array(900).fill('😀'), 1, null, {}] });
    expect(out.e).toHaveLength(500);
    expect(out.e.every((x) => typeof x === 'string')).toBe(true);
  });

  it('rejects a color that is not a hex literal', () => {
    expect(sanitizeSharePayload({ c: 'red; background: url(x)' }).c).toBe('');
    expect(sanitizeSharePayload({ c: 'javascript:alert(1)' }).c).toBe('');
    expect(sanitizeSharePayload({ c: '#abc' }).c).toBe('#abc');
  });

  it('defaults a missing emoji list to an empty array', () => {
    expect(sanitizeSharePayload({}).e).toEqual([]);
  });
});

describe('buildShareUrl', () => {
  it('round-trips through the share query parameter', () => {
    const url = buildShareUrl({
      name: { ar: 'قلوب', en: 'Hearts' },
      emojis: ['❤️', '🧡'],
      color: '#2c6cb0',
    });
    expect(url).toContain('?share=');
    // Only the payload has to be url-safe; the base URL keeps its slashes.
    const token = url.split('?share=')[1];
    expect(token).not.toMatch(/[+/=]/);
    expect(sanitizeSharePayload(JSON.parse(fromBase64Url(token)))).toEqual({
      n: { ar: 'قلوب', en: 'Hearts' },
      e: ['❤️', '🧡'],
      c: '#2c6cb0',
    });
  });
});

describe('sanitizeSharePayload length limits', () => {
  it('drops entries too long to be an emoji', () => {
    const out = sanitizeSharePayload({ e: ['😀', 'x'.repeat(5000), '', 7] });
    expect(out.e).toEqual(['😀']);
  });
});
