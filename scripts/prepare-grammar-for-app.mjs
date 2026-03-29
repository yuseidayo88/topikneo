#!/usr/bin/env node
/**
 * grammar-lessons.json と（あれば）grammar-quiz.json から、アプリ用の grammar データを組み立てる。
 * 出力: locale 対応の型（translation）で、Supabase の grammar/ko_ja/grammar.json にアップロードする想定。
 * 使い方: node scripts/prepare-grammar-for-app.mjs [grammar-lessons.json] [grammar-quiz.json] [出力パス]
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const LESSONS_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-lessons.json');
const QUIZ_PATH = process.argv[3] || path.join(process.cwd(), 'scripts', 'grammar-quiz.json');
const OUT_PATH = process.argv[4] || path.join(process.cwd(), 'scripts', 'grammar-for-app.json');

async function main() {
  const lessonsRaw = await readFile(LESSONS_PATH, 'utf8');
  const lessonsData = JSON.parse(lessonsRaw);
  const { lessons, grammarList } = lessonsData;

  let quizItems = [];
  try {
    const quizRaw = await readFile(QUIZ_PATH, 'utf8');
    const quiz = JSON.parse(quizRaw);
    quizItems = Array.isArray(quiz) ? quiz : quiz.quizItems || [];
  } catch (_e) {
    console.log('No grammar-quiz.json or invalid; quizItems will be empty.');
  }

  const grammarIdToLessonId = {};
  for (const lec of lessons) {
    for (const gid of lec.grammarIds) {
      grammarIdToLessonId[gid] = lec.lessonId;
    }
  }

  // 例文は generate-grammar-examples.mjs で生成。既存の出力ファイルに例文があれば id で引き継ぐ。
  let existingExamplesById = {};
  try {
    const existingRaw = await readFile(OUT_PATH, 'utf8');
    const existing = JSON.parse(existingRaw);
    for (const it of existing.items || []) {
      if (it.id && Array.isArray(it.examples) && it.examples.length > 0) {
        existingExamplesById[it.id] = it.examples;
      }
    }
  } catch (_e) {
    // 出力先がまだない、または不正な場合はスキップ
  }

  const items = grammarList.map((g) => {
    const lesson_id = grammarIdToLessonId[g.id] || '';
    return {
      id: g.id,
      lesson_id,
      title: g.korean,
      structure: g.korean,
      explanation: g.japanese ?? '',
      examples: existingExamplesById[g.id] ?? [],
    };
  });

  const lessonSummaries = {};
  for (const lec of lessons) {
    lessonSummaries[lec.lessonId] = lec.summary;
  }

  const output = {
    locale: 'ko_ja',
    items,
    quizItems,
    lessonSummaries,
    reorderItems: [], // 並び替えクイズ。generate-grammar-reorder.mjs で生成しマージする
  };

  await writeFile(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  const preservedCount = items.filter((it) => it.examples.length > 0).length;
  console.log('Written:', OUT_PATH);
  console.log('Items:', items.length, 'Quiz:', quizItems.length, 'Lessons:', lessons.length, preservedCount ? `Examples preserved: ${preservedCount}` : '');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
