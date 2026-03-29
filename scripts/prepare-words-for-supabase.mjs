#!/usr/bin/env node
/**
 * words-sorted.json をレベル・レッスンで分割し、Supabase 用の words_level1.json ... words_level6.json を出力する。
 * 実行: node scripts/prepare-words-for-supabase.mjs [words-sorted.json のパス]
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const WORDS_SORTED_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'words-sorted.json');
const OUT_DIR = path.join(process.cwd(), 'scripts', 'words-by-level');
const WORDS_PER_LESSON = 10;
const LEVELS = 6;

async function main() {
  const raw = await readFile(WORDS_SORTED_PATH, 'utf8');
  const words = JSON.parse(raw);
  const total = words.length;
  const perLevel = Math.ceil(total / LEVELS);

  for (let l = 1; l <= LEVELS; l++) {
    const start = (l - 1) * perLevel;
    const end = l === LEVELS ? total : l * perLevel;
    const levelWords = words.slice(start, end).map((w, i) => {
      const lessonNum = Math.floor(i / WORDS_PER_LESSON) + 1;
      const lessonId = `ko_W${l}_${String(lessonNum).padStart(2, '0')}`;
      return {
        ...w,
        topik_level: l,
        lesson_id: lessonId,
      };
    });
    await mkdir(OUT_DIR, { recursive: true });
    const outPath = path.join(OUT_DIR, `words_level${l}.json`);
    await writeFile(outPath, JSON.stringify(levelWords, null, 2), 'utf8');
    console.log(`Written ${levelWords.length} words → ${outPath}`);
  }
  console.log('Done. Upload these files to Supabase Storage: content/words/ko_ja/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
