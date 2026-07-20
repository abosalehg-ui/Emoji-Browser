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
  return emoji + tone.modifier;
}

export function getTone(toneId) {
  return TONES.find((t) => t.id === toneId) || TONES[0];
}

export function supports(emojiObj) {
  return Boolean(emojiObj && emojiObj.skinToneBase);
}
