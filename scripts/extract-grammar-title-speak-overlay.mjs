#!/usr/bin/env node
/**
 * grammar.json（title_speak を含む下書き）から grammar_title_speak.json だけを抽出する。
 * アップロード先（推奨）: content バケットの tts/ko/grammar_headings/readings.json（content:upload-locales または tts:grammar-headings:upload）
 *
 *   node scripts/extract-grammar-title-speak-overlay.mjs [input-grammar.json] [out.json]
 * 既定: out/grammar-ko_en.json → out/grammar_title_speak.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const inputPath = path.resolve(args[0] || path.join(PROJECT_ROOT, 'out/grammar-ko_en.json'));
const outPath = path.resolve(args[1] || path.join(PROJECT_ROOT, 'out/grammar_title_speak.json'));

const raw = JSON.parse(await readFile(inputPath, 'utf8'));
const items = Array.isArray(raw?.items) ? raw.items : [];
const byId = {};
for (const item of items) {
  const id = item?.id;
  const ts = item?.title_speak;
  if (typeof id !== 'string' || typeof ts !== 'string' || !ts.trim()) continue;
  byId[id] = ts.trim();
}

const out = {
  /** 参照用（読み上げは韓国語のみ・全 UI 言語で共通） */
  locale: 'ko',
  byId,
};

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.error(`Wrote ${path.relative(PROJECT_ROOT, outPath)} (${Object.keys(byId).length} ids)`);
