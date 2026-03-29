#!/usr/bin/env node
/**
 * grammar-for-app.json の形式を検証する（locale, items, quizItems, lessonSummaries の有無と型）。
 * 使い方: node scripts/validate-grammar-for-app.mjs [grammar-for-app.json]
 */

import { readFile } from 'fs/promises';
import path from 'path';

const PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-for-app.json');

function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    errors.push('Root must be an object');
    return errors;
  }
  if (typeof data.locale !== 'string') errors.push('Missing or invalid locale');
  if (!Array.isArray(data.items)) errors.push('items must be an array');
  if (!Array.isArray(data.quizItems)) errors.push('quizItems must be an array');
  if (!data.lessonSummaries || typeof data.lessonSummaries !== 'object') {
    errors.push('lessonSummaries must be an object');
  }
  const items = data.items || [];
  items.slice(0, 5).forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      errors.push(`items[${i}] must be an object`);
      return;
    }
    if (typeof item.id !== 'string') errors.push(`items[${i}].id must be string`);
    if (typeof item.lesson_id !== 'string') errors.push(`items[${i}].lesson_id must be string`);
    if (typeof item.title !== 'string') errors.push(`items[${i}].title must be string`);
    if (typeof item.explanation !== 'string') errors.push(`items[${i}].explanation must be string`);
    if (!Array.isArray(item.examples)) errors.push(`items[${i}].examples must be array`);
  });
  const quizItems = data.quizItems || [];
  quizItems.slice(0, 5).forEach((q, i) => {
    if (!q || typeof q !== 'object') {
      errors.push(`quizItems[${i}] must be an object`);
      return;
    }
    if (typeof q.id !== 'string') errors.push(`quizItems[${i}].id must be string`);
    if (typeof q.lesson_id !== 'string') errors.push(`quizItems[${i}].lesson_id must be string`);
    if (typeof q.korean !== 'string') errors.push(`quizItems[${i}].korean must be string`);
    if (typeof q.answer !== 'string') errors.push(`quizItems[${i}].answer must be string`);
  });
  return errors;
}

async function main() {
  const raw = await readFile(PATH, 'utf8');
  const data = JSON.parse(raw);
  const errors = validate(data);
  if (errors.length > 0) {
    console.error('Validation failed:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('OK:', data.items?.length ?? 0, 'items,', data.quizItems?.length ?? 0, 'quizItems');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
