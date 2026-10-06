# Emoji Browser — متصفح الإيموجي

<div align="center">

![Version](https://img.shields.io/badge/version-2.1.0-orange)
![Emojis](https://img.shields.io/badge/emojis-1358-brightgreen)
![Categories](https://img.shields.io/badge/categories-10-blue)
![Languages](https://img.shields.io/badge/i18n-Arabic%20%7C%20English-blue)
![License](https://img.shields.io/badge/license-MIT-success)
![Dependencies](https://img.shields.io/badge/runtime%20deps-0-success)

**A bilingual (Arabic / English) emoji browser PWA — search, favorites, custom collections, skin tones, usage stats, and offline support. Zero runtime dependencies.**

**متصفح إيموجي ثنائي اللغة يعمل دون اتصال، مع بحث ومفضلة ومجموعات مخصّصة وإحصائيات استخدام — بلا أي اعتماديات تشغيل.**

😊 🎉 ❤️ 🌟 🚀 🎨 🔥 💡 ✨ 🎯

</div>

---

## ✨ Features / المميزات

- **1358 emojis** across **10 categories** (smileys, people, animals, nature, food, travel, activities, objects, symbols, flags).
- **Bilingual UI** with full RTL/LTR switching (Arabic ⇄ English).
- **Search** by Arabic name, English name, description, or keywords. Arabic queries are
  normalized (hamza seats, ta marbuta, alef maqsura, tashkeel), so `كاس` finds `كأس`.
- **Favorites** and **Recently used** (last 20), persisted locally.
- **Custom collections** — create, rename, delete, and **share via URL**.
- **Multi-select mode** — copy many emojis at once with a configurable separator.
- **Skin-tone variants** for supported emojis.
- **Usage statistics** dashboard (top used, totals) with a reset option.
- **Import / export** your data as JSON, choosing merge or replace on import.
  Imported files are validated field by field before anything reaches storage.
- **5 themes**: light, dark, sepia, high-contrast, and auto (follows the OS).
  All themes meet WCAG AA contrast for text on filled controls.
- **Keyboard shortcuts** and accessible grid navigation (arrow keys, focus trap, skip link).
- **PWA**: installable and fully **offline-capable** via a service worker.
- **Copy** as emoji, Unicode code point, or HTML entity.

### Privacy

No accounts, no servers, no tracking. All data (favorites, collections, stats, preferences) lives in your browser's `localStorage` only. / لا حسابات ولا خوادم ولا تتبّع؛ كل البيانات محفوظة محليًا في متصفحك فقط.

---

## 🚀 Running locally / التشغيل محليًا

Because the app uses native ES modules, it must be served over HTTP (opening `index.html` from `file://` will not work).

```bash
npm start        # serves the current directory (npx serve)
# then open the printed http://localhost URL
```

No build step is required — the source in `scripts/` and `styles/` is what ships.

---

## 🧪 Development / التطوير

Node **22.22.2+** (or 24.15+/26+) is required for the dev tooling; the app
itself has no runtime dependencies and no build step.

```bash
npm install          # install dev tooling (ESLint, Prettier, Vitest, jsdom)
npm run lint         # lint scripts and tests
npm run format       # format with Prettier
npm run validate:data# validate the emoji dataset + version consistency
npm test             # run unit tests (Vitest)
npm run check        # lint + validate:data + test (what CI runs)
```

### Project structure / بنية المشروع

```
index.html              App shell + CSP
offline.html            Offline fallback page
sw.js                   Service worker (precache + runtime caching)
manifest.webmanifest    PWA manifest
scripts/                ES modules, one concern each
  main.js               Composition root / wiring
  views.js              Category bar, collection chips, collection picker
  dialog.js             Button-based chooser (<dialog>) used instead of prompt()
  state.js              Central pub/sub store
  storage.js            localStorage load/save, schema migration, import/export
  search.js             Search + category filtering + index
  render.js             Emoji card + grid rendering
  modal.js              Details modal + focus trap
  i18n.js               Translations (ar/en)
  prefs.js              Shared theme/language toggles
  theme.js, skinTone.js, favorites.js, recent.js, collections.js,
  selection.js, share.js, importExport.js, stats.js, shortcuts.js,
  a11y.js, pwa.js, notify.js, prefs.js, utils.js
  tools/validate-data.mjs   Dataset & version validator
styles/                 Token-based CSS (tokens, base, layout, components,
                        themes, animations, responsive). RTL comes from
                        logical properties, so there is no separate rtl.css
data/
  categories.json       Category definitions
  manifest.json         Precache file list + release version
  emojis/*.json         One file per category
test/                   Vitest: unit tests + DOM flow tests (flows.test.js)
```

### Data model / نموذج البيانات

Each emoji record:

```json
{
  "emoji": "😀",
  "unicode": "U+1F600",
  "arName": "وجه مبتسم",
  "enName": "Grinning Face",
  "desc": "وجه سعيد مع ابتسامة عريضة",
  "descEn": "Happy face with broad smile",
  "category": "smileys",
  "keywords": ["smile", "grin", "سعيد"]
}
```

Emojis are unique across all category files (enforced by `npm run validate:data`).
Optional `skinToneBase: true` enables skin-tone swatches for that emoji.

---

## 🔢 Versioning / الإصدارات

The release version is kept identical in three places — `package.json`, `data/manifest.json`,
and the service worker's `CACHE_VERSION`. `validate:data` fails if they drift, which guarantees
that every release invalidates the old offline cache. Bump all three together when releasing.

`validate:data` also checks the precache list in both directions: every file it names must
exist, **and** every `scripts/*.js` and `styles/*.css` on disk must be listed. A module missing
from that list 504s offline, which fails the whole ES-module graph and leaves a blank page — so
the reverse check is what actually protects the offline guarantee.

---

## 🌐 Browser support / دعم المتصفحات

Modern evergreen browsers with ES modules, `localStorage`, and service workers:
Chrome/Edge 90+, Firefox 88+, Safari 14+.

---

## 🤝 Contributing / المساهمة

1. Open an issue to discuss substantial changes.
2. Run `npm run check` before submitting a PR.
3. Add emojis by editing the relevant `data/emojis/<category>.json` file and running
   `npm run validate:data`.
4. New modules and stylesheets must also be added to `data/manifest.json`; `validate:data`
   fails otherwise.

---

## 📄 License / الترخيص

[MIT](./LICENSE) © 2025 Abdulkareem Al-Aboud (عبدالكريم العبود) — <abo.saleh.g@gmail.com>

Live app: https://abosalehg-ui.github.io/Emoji-Browser
