#!/usr/bin/env node
/**
 * 単語 JSON の korean / example.korean にカタカナ・ひらがなが混入していないか検証する。
 * 混入があればファイル・id・該当文字を表示して exit 1。
 */

import { readFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import path from 'path';

const KATAKANA_HIRAGANA = /[\u3040-\u309F\u30A0-\u30FF]/;

function checkString(s, context) {
  const matches = [];
  if (typeof s !== 'string') return matches;
  for (let i = 0; i < s.length; i++) {
    if (KATAKANA_HIRAGANA.test(s[i])) {
      matches.push({ index: i, char: s[i], code: s.charCodeAt(i).toString(16).toUpperCase() });
    }
  }
  return matches;
}

async function checkFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) return [];
  const issues = [];
  for (const item of data) {
    if (item.korean) {
      const m = checkString(item.korean, 'korean');
      if (m.length) issues.push({ id: item.id, field: 'korean', value: item.korean, matches: m });
    }
    if (item.example?.korean) {
      const m = checkString(item.example.korean, 'example.korean');
      if (m.length) issues.push({ id: item.id, field: 'example.korean', value: item.example.korean, matches: m });
    }
  }
  return issues;
}

async function main() {
  const dir = path.join(process.cwd(), 'scripts', 'words-by-level');
  const names = await readdir(dir);
  const files = names.filter((n) => n.endsWith('.json')).map((n) => path.join(dir, n));
  files.push(path.join(process.cwd(), 'scripts', 'words-sorted.json'));

  let total = 0;
  for (const f of files) {
    const issues = await checkFile(f);
    if (issues.length) {
      console.log('\n' + f);
      for (const u of issues) {
        console.log('  id:', u.id, 'field:', u.field);
        console.log('  value:', u.value);
        console.log('  mixed chars:', u.matches.map((m) => `${m.char}(U+${m.code})`).join(', '));
      }
      total += issues.length;
    }
  }
  if (total > 0) {
    console.log('\n合計', total, '件の korean にカタカナ/ひらがな混入があります。');
    process.exit(1);
  }
  console.log('OK: korean フィールドにカタカナ・ひらがなの混入はありません。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
