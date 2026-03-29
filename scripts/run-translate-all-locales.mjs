#!/usr/bin/env node
/**
 * TARGET_LANG を zh, vi, es, id, th で順に translate-content-en-to-locale.mjs を実行する。
 * 途中失敗したら終了コードを返す。
 *
 *   node scripts/run-translate-all-locales.mjs
 *
 * 文法のみ・単語のみは子スクリプトと同じ GRAMMAR_ONLY / WORDS_ONLY を継承。
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const childScript = path.join(SCRIPT_DIR, 'translate-content-en-to-locale.mjs');
const TARGETS = ['zh', 'vi', 'es', 'id', 'th'];

for (const TARGET_LANG of TARGETS) {
  console.error(`\n========== TARGET_LANG=${TARGET_LANG} ==========\n`);
  const r = spawnSync(process.execPath, [childScript], {
    env: { ...process.env, TARGET_LANG },
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error(`Failed for TARGET_LANG=${TARGET_LANG}`);
    process.exit(r.status ?? 1);
  }
}
console.error('\nAll locales completed.');
