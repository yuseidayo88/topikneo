#!/usr/bin/env node
/**
 * 文法クイズデータの不具合を検出する。
 * 空欄の直後に正解が続く（重複）パターン、記号入り正解などをチェック。
 * 使い方: node scripts/validate-grammar-quiz.mjs [grammar-quiz.json または grammar-for-app.json]
 */

import { readFile } from 'fs/promises';
import path from 'path';

const QUIZ_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-quiz.json');

function loadQuizItems(raw) {
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.quizItems)) return data.quizItems;
  return [];
}

function validate(quizItems) {
  const errors = [];
  for (const q of quizItems) {
    const korean = (q.korean || '').trim();
    const answer = (q.answer || '').trim();
    if (!korean || !answer) continue;
    const blank = '（　）';
    const idx = korean.indexOf(blank);
    if (idx === -1) {
      errors.push({ id: q.id, type: 'no_blank', korean: korean.slice(0, 50), answer });
      continue;
    }
    const after = korean.slice(idx + blank.length).replace(/^\s+/, '');
    if (answer.length >= 2 && after.startsWith(answer)) {
      errors.push({
        id: q.id,
        type: 'redundant_answer',
        korean: korean.slice(0, 60),
        answer,
        after: after.slice(0, 20),
      });
    }
    if (/[()（）～~?？/／]/.test(answer)) {
      errors.push({ id: q.id, type: 'notation_in_answer', korean: korean.slice(0, 50), answer });
    }
  }
  return errors;
}

async function main() {
  const raw = await readFile(QUIZ_PATH, 'utf8');
  const quizItems = loadQuizItems(raw);
  const errors = validate(quizItems);
  if (errors.length > 0) {
    console.error('Validation failed:', errors.length, 'issue(s)\n');
    errors.slice(0, 30).forEach((e) => console.error(JSON.stringify(e)));
    if (errors.length > 30) console.error('... and', errors.length - 30, 'more');
    process.exit(1);
  }
  console.log('OK:', quizItems.length, 'quiz items');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
