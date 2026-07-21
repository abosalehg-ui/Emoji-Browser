import { describe, it, expect } from 'vitest';
import {
  toBase64Url,
  fromBase64Url,
  htmlEntity,
  emojiToUnicode,
  escapeHtml,
} from '../scripts/utils.js';

describe('base64url round-trip', () => {
  it('encodes and decodes unicode strings losslessly', () => {
    const input = JSON.stringify({ n: 'مجموعة 😀', e: ['❤️', '🐶'] });
    expect(fromBase64Url(toBase64Url(input))).toBe(input);
  });

  it('produces url-safe output (no +, /, =)', () => {
    const out = toBase64Url('???>>>???');
    expect(out).not.toMatch(/[+/=]/);
  });
});

describe('htmlEntity', () => {
  it('converts a U+ code to a hex HTML entity', () => {
    expect(htmlEntity('U+1F60A')).toBe('&#x1F60A;');
  });
});

describe('emojiToUnicode', () => {
  it('maps a single-codepoint emoji', () => {
    expect(emojiToUnicode('😀')).toBe('U+1F600');
  });

  it('joins multi-codepoint sequences', () => {
    expect(emojiToUnicode('❤️')).toBe('U+2764 U+FE0F');
  });
});

describe('escapeHtml', () => {
  it('neutralizes HTML metacharacters', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(escapeHtml(`"&'`)).toBe('&quot;&amp;&#39;');
  });
});
