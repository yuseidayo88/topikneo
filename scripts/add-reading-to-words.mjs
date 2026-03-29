#!/usr/bin/env node
/**
 * words-sorted.json の各単語に reading（ローマ字発音）を付与する。
 * 既に reading が入っている単語はスキップ。@romanize/korean 使用（Revised Romanization）。
 * 実行: node scripts/add-reading-to-words.mjs [words-sorted.json のパス]
 * 完了後: node scripts/prepare-words-for-supabase.mjs && node scripts/upload-words-to-supabase.mjs
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { romanize } = require('@romanize/korean');

const WORDS_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'words-sorted.json');

function safeRomanize(korean) {
  if (!korean || typeof korean !== 'string') return '';
  const trimmed = korean.trim();
  if (!trimmed) return '';
  try {
    return romanize(trimmed);
  } catch {
    return '';
  }
}

async function main() {
  console.log('Reading:', WORDS_PATH);
  const raw = await readFile(WORDS_PATH, 'utf8');
  const words = JSON.parse(raw);
  let updated = 0;
  for (const w of words) {
    const current = (w.reading || '').trim();
    if (current) continue;
    const rom = safeRomanize(w.korean);
    if (rom) {
      w.reading = rom;
      updated++;
    }
  }
  await writeFile(WORDS_PATH, JSON.stringify(words, null, 2), 'utf8');
  console.log(`Updated ${updated} words with reading. Total: ${words.length}`);
  console.log('Next: node scripts/prepare-words-for-supabase.mjs && node scripts/upload-words-to-supabase.mjs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
