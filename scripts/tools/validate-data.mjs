#!/usr/bin/env node
// Validates the emoji dataset: required fields, category consistency,
// cross-file uniqueness, and precache-manifest coverage.
// Exits non-zero on any error so it can gate CI.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const errors = [];
const cats = read('data/categories.json').categories;
const seen = new Map(); // emoji char -> category where first seen
let total = 0;

for (const cat of cats) {
  const rel = `data/emojis/${cat.id}.json`;
  if (!existsSync(resolve(root, rel))) {
    errors.push(`Missing data file: ${rel}`);
    continue;
  }
  const file = read(rel);
  if (file.category !== cat.id) {
    errors.push(`${rel}: file.category "${file.category}" != "${cat.id}"`);
  }
  for (const e of file.emojis) {
    total++;
    for (const field of ['emoji', 'unicode', 'arName', 'enName']) {
      if (!e[field]) errors.push(`${rel}: emoji "${e.emoji}" missing "${field}"`);
    }
    if (e.category !== cat.id) {
      errors.push(`${rel}: emoji "${e.emoji}" has category "${e.category}" != "${cat.id}"`);
    }
    if (seen.has(e.emoji)) {
      errors.push(`Duplicate emoji "${e.emoji}" in ${cat.id} (already in ${seen.get(e.emoji)})`);
    } else {
      seen.set(e.emoji, cat.id);
    }
  }
}

// Precache manifest must list files that actually exist on disk.
const manifest = read('data/manifest.json');
for (const f of manifest.files) {
  const rel = f.replace(/^\.\//, '');
  if (rel === '' ) continue; // "./" is the app root, not a file
  if (!existsSync(resolve(root, rel))) {
    errors.push(`Precache manifest lists missing file: ${f}`);
  }
}

// Version consistency: manifest, package.json, and the service worker cache
// name must all agree so a release always busts the old cache.
const manifestVersion = manifest.version;
const pkgVersion = read('package.json').version;
const swSource = readFileSync(resolve(root, 'sw.js'), 'utf8');
const swMatch = swSource.match(/CACHE_VERSION\s*=\s*'v([^']+)'/);
const swVersion = swMatch ? swMatch[1] : null;
if (manifestVersion !== pkgVersion) {
  errors.push(`Version drift: manifest ${manifestVersion} != package.json ${pkgVersion}`);
}
if (swVersion !== manifestVersion) {
  errors.push(`Version drift: sw.js v${swVersion} != manifest ${manifestVersion}`);
}

if (errors.length) {
  console.error(`✗ Data validation failed (${errors.length} issue(s)):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ Data valid: ${total} emojis across ${cats.length} categories, all unique.`);
