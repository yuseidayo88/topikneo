#!/usr/bin/env node
/**
 * grammar-sorted.json を読み、TOPIK 1〜6 ごとに 2文法＝1レッスンで割り当てて grammar-lessons.json を出力する。
 * grammar-sorted に topik_level が無い場合は、まず difficulty_score から導出し、
 * その結果 4・5・6 級に誰も入らない場合は order_rank で 1〜6 に均等割りする。
 * 使い方: node scripts/prepare-grammar-lessons.mjs [grammar-sorted.json] [出力パス]
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const GRAMMAR_SORTED_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-sorted.json');
const OUT_PATH = process.argv[3] || path.join(process.cwd(), 'scripts', 'grammar-lessons.json');
const GRAMMAR_PER_LESSON = 2;

async function main() {
  const raw = await readFile(GRAMMAR_SORTED_PATH, 'utf8');
  const grammarList = JSON.parse(raw);
  if (!Array.isArray(grammarList)) {
    throw new Error('grammar-sorted.json must be an array');
  }

  const total = grammarList.length;
  const perLevel = Math.max(1, Math.floor(total / 6));

  function getTopikLevel(g, index) {
    if (g.topik_level != null && g.topik_level >= 1 && g.topik_level <= 6) return Number(g.topik_level);
    const byRank = Math.min(6, Math.max(1, Math.ceil((g.order_rank || index + 1) / perLevel)));
    return byRank;
  }

  const grammarById = {};
  for (let i = 0; i < grammarList.length; i++) {
    const g = grammarList[i];
    const level = getTopikLevel(g, i);
    grammarById[g.id] = {
      korean: g.korean,
      japanese: g.japanese,
      topik_level: level,
      difficulty_score: g.difficulty_score,
      frequency_score: g.frequency_score,
    };
  }

  const byLevel = new Map();
  for (let i = 0; i < grammarList.length; i++) {
    const g = grammarList[i];
    const level = getTopikLevel(g, i);
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push(g);
  }

  const lessons = [];
  const levels = [1, 2, 3, 4, 5, 6];
  for (const level of levels) {
    const list = byLevel.get(level) || [];
    for (let i = 0; i < list.length; i += GRAMMAR_PER_LESSON) {
      const chunk = list.slice(i, i + GRAMMAR_PER_LESSON);
      const lessonNum = Math.floor(i / GRAMMAR_PER_LESSON) + 1;
      const lessonId = `ko_G${level}_${String(lessonNum).padStart(2, '0')}`;
      const grammarIds = chunk.map((g) => g.id);
      const summary = chunk.map((g) => g.japanese).join(' ・ ');
      lessons.push({
        lessonId,
        level,
        lessonNum,
        grammarIds,
        summary,
      });
    }
  }

  const output = {
    levels: levels,
    lessons,
    grammarById,
    grammarList: grammarList.map((g, i) => ({
      id: g.id,
      korean: g.korean,
      japanese: g.japanese,
      topik_level: getTopikLevel(g, i),
    })),
  };
  await writeFile(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('Written:', OUT_PATH);
  console.log('Lessons:', lessons.length);
  for (const level of levels) {
    const count = lessons.filter((l) => l.level === level).length;
    if (count > 0) console.log(`  TOPIK ${level}: ${count} lessons`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
