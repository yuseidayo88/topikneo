#!/usr/bin/env node
/**
 * grammar JSON の各 item に title_speak を付与（derive-grammar-title-speak.mjs のルール）。
 *
 *   node scripts/apply-grammar-title-speak.mjs [path/to/grammar.json]
 * 既定: out/grammar-ko_en.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveTitleSpeak } from './derive-grammar-title-speak.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const defaultPath = path.join(PROJECT_ROOT, 'out/grammar-ko_en.json');

const target = path.resolve(process.argv[2] || defaultPath);

const raw = JSON.parse(await readFile(target, 'utf8'));
if (!Array.isArray(raw.items)) {
  console.error('Invalid grammar JSON: missing items[]');
  process.exit(1);
}

let n = 0;
for (const item of raw.items) {
  if (typeof item?.title !== 'string') continue;
  const next = deriveTitleSpeak(item.title);
  if (next === item.title) {
    if ('title_speak' in item) {
      delete item.title_speak;
      n += 1;
    }
  } else if (item.title_speak !== next) {
    item.title_speak = next;
    n += 1;
  }
}

await writeFile(target, JSON.stringify(raw, null, 2) + '\n', 'utf8');
console.error(`Updated title_speak on ${n} items → ${path.relative(PROJECT_ROOT, target)}`);
