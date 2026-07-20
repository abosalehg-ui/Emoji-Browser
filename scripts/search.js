// Precompute a lowercase haystack once per emoji so search doesn't rebuild
// strings for every entry on every keystroke.
export function prepareSearch(emojis) {
  emojis.forEach((e) => {
    e._search = [e.arName, e.enName, e.desc, e.descEn, e.emoji, ...(e.keywords || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  });
  return emojis;
}

function haystack(e) {
  if (e._search === undefined) {
    e._search = [e.arName, e.enName, e.desc, e.descEn, e.emoji, ...(e.keywords || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }
  return e._search;
}

export function searchEmojis(emojis, query) {
  if (!query) return emojis;
  const q = query.toLowerCase().trim();
  return emojis.filter((e) => haystack(e).includes(q));
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
