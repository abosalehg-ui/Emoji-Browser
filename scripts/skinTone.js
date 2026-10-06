export const TONES = [
  { id: 'default', modifier: '', ar: 'افتراضي', en: 'Default', swatch: '✋' },
  { id: 'light', modifier: '\u{1F3FB}', ar: 'فاتح', en: 'Light', swatch: '✋🏻' },
  {
    id: 'med-light',
    modifier: '\u{1F3FC}',
    ar: 'فاتح متوسط',
    en: 'Medium-Light',
    swatch: '✋🏼',
  },
  { id: 'medium', modifier: '\u{1F3FD}', ar: 'متوسط', en: 'Medium', swatch: '✋🏽' },
  { id: 'med-dark', modifier: '\u{1F3FE}', ar: 'داكن متوسط', en: 'Medium-Dark', swatch: '✋🏾' },
  { id: 'dark', modifier: '\u{1F3FF}', ar: 'داكن', en: 'Dark', swatch: '✋🏿' },
];

export function applyTone(emoji, toneId) {
  const tone = TONES.find((t) => t.id === toneId);
  if (!tone || !tone.modifier) return emoji;
  // A modifier must follow the base code point directly. Five of the toneable
  // records (🖐️ ✌️ ☝️ ✍️ 🕵️) carry a U+FE0F presentation selector, and
  // "base + FE0F + modifier" is not a valid sequence — it renders as the
  // emoji followed by a detached colour swatch.
  return emoji.replace(/\uFE0F/g, '') + tone.modifier;
}

export function supports(emojiObj) {
  return Boolean(emojiObj && emojiObj.skinToneBase);
}
