#!/usr/bin/env node
/**
 * 新しい grammar-for-app に、既存の JSON の例文を id でマージする。
 * 使い方: node scripts/merge-grammar-examples.mjs [新 grammar-for-app] [既存のJSON] [出力パス]
 * 出力は Supabase の grammar/ko_ja/grammar.json にアップロードする想定。
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const NEW_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-for-app.json');
const OLD_PATH = process.argv[3] || path.join(process.cwd(), 'scripts', 'grammar-for-app.json');
const OUT_PATH = process.argv[4] || path.join(process.cwd(), 'scripts', 'grammar-for-app.json');

async function main() {
  const newRaw = await readFile(NEW_PATH, 'utf8');
  const newData = JSON.parse(newRaw);
  let examplesById = {};
  try {
    const oldRaw = await readFile(OLD_PATH, 'utf8');
    const oldData = JSON.parse(oldRaw);
    const items = oldData.items || [];
    for (const it of items) {
      if (it.id && Array.isArray(it.examples) && it.examples.length > 0) {
        examplesById[it.id] = it.examples;
      }
    }
  } catch (_e) {
    console.log('No existing file or invalid; skipping example merge.');
  }
  let merged = 0;
  for (const it of newData.items || []) {
    if (examplesById[it.id]) {
      it.examples = examplesById[it.id];
      merged++;
    }
  }
  await writeFile(OUT_PATH, JSON.stringify(newData, null, 2), 'utf8');
  console.log('Written:', OUT_PATH);
  console.log('Merged examples for', merged, 'items');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
