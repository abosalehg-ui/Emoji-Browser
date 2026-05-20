export function searchEmojis(emojis, query) {
  if (!query) return emojis;
  const q = query.toLowerCase().trim();
  return emojis.filter((e) => {
    const haystack = [
      e.arName,
      e.enName,
      e.desc,
      e.descEn,
      e.emoji,
      ...(e.keywords || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterByCategory(emojis, category) {
  if (!category || category === 'all') return emojis;
  return emojis.filter((e) => e.category === category);
}

export function buildIndex(emojis) {
  const byChar = new Map();
  emojis.forEach((e) => byChar.set(e.emoji, e));
  return byChar;
}
