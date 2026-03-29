#!/usr/bin/env node
/**
 * 単語 JSON の korean / example.korean 内に混入したカタカナをハングルに置換する。
 * 使い方: node scripts/fix-korean-katakana.mjs [words_level1.json ...] または
 *        node scripts/fix-korean-katakana.mjs で scripts/words-by-level/*.json と words-sorted.json を処理
 */

import { readFile, writeFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import path from 'path';

/** カタカナ 1 文字 → ハングル（外来語表記でよく使う対応） */
const KATAKANA_TO_HANGUL = {
  '\u30A2': '아', '\u30A4': '이', '\u30A6': '우', '\u30A8': '에', '\u30AA': '오',
  '\u30AB': '카', '\u30AD': '키', '\u30AF': '크', '\u30B1': '케', '\u30B3': '코',
  '\u30B5': '사', '\u30B7': '시', '\u30B9': '스', '\u30BB': '세', '\u30BD': '소',
  '\u30BF': '타', '\u30C6': '테', '\u30C8': '트',
  '\u30CA': '나', '\u30CB': '니', '\u30CC': '누', '\u30CD': '네', '\u30CE': '노',
  '\u30CF': '하', '\u30D2': '히', '\u30D5': '후', '\u30D8': '헤', '\u30DB': '호',
  '\u30DE': '마', '\u30DF': '미', '\u30E0': '무', '\u30E1': '메', '\u30E2': '모',
  '\u30E4': '야', '\u30E6': '유', '\u30E8': '요',
  '\u30E9': '라', '\u30EA': '리', '\u30EB': '루', '\u30EC': '레', '\u30ED': '로',
  '\u30EF': '와', '\u30F2': '오', '\u30F3': 'ン', // ンは語末で ㄴ になることが多いが、ここではそのまま
  '\u30D7': '프', '\u30DA': '페', '\u30D0': '그', // グ→그 は 30B0
  '\u30B0': '그', '\u30FC': '', // ー は長音で削除
};

function fixKoreanString(s) {
  if (typeof s !== 'string') return s;
  let out = '';
  for (const c of s) {
    if (KATAKANA_TO_HANGUL[c] !== undefined) {
      out += KATAKANA_TO_HANGUL[c];
    } else {
      out += c;
    }
  }
  // ション (ション) → 션
  out = out.replace(/시\u30E7\u30F3/g, '션');
  return out;
}

/** 既知の単語単位の誤り（カタカナ混入）→ 正しいハングル */
const WORD_FIXES = [
  ['오리엔테\u30FC\u30B7\u30E7\u30F3', '오리엔테이션'], // テーション(カタカナ) → 테이션
  ['프린ター', '프린터'],
  ['피아ニ스트', '피아니스트'],
  ['알コール', '알코올'],
  ['피아ノ', '피아노'],
  ['플러グ', '플러그'],
  ['멜ロ디', '멜로디'],
  ['마スク', '마스크'],
  ['보너ス', '보너스'], // ス がカタカナの場合は fixKoreanString で ス→스 になる
];

function applyWordFixes(s) {
  let t = s;
  for (const [wrong, right] of WORD_FIXES) {
    if (t === wrong || t.includes(wrong)) {
      t = t.replaceAll(wrong, right);
    }
  }
  return t;
}

async function processFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    console.log('Skip (not array):', filePath);
    return 0;
  }
  let count = 0;
  for (const item of data) {
    if (item.korean) {
      const fixed = fixKoreanString(applyWordFixes(item.korean));
      if (fixed !== item.korean) {
        item.korean = fixed;
        count++;
      }
    }
    if (item.example?.korean) {
      const fixed = fixKoreanString(applyWordFixes(item.example.korean));
      if (fixed !== item.example.korean) {
        item.example.korean = fixed;
        count++;
      }
    }
  }
  if (count > 0) {
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(filePath, '→', count, '箇所修正');
  }
  return count;
}

async function main() {
  const args = process.argv.slice(2);
  let files = args;
  if (files.length === 0) {
    const dir = path.join(process.cwd(), 'scripts', 'words-by-level');
    const names = await readdir(dir);
    files = names.filter((n) => n.endsWith('.json')).map((n) => path.join(dir, n));
    const sorted = path.join(process.cwd(), 'scripts', 'words-sorted.json');
    files.push(sorted);
  }
  let total = 0;
  for (const f of files) {
    try {
      total += await processFile(f);
    } catch (e) {
      console.error(f, e.message);
    }
  }
  console.log('Total fixes:', total);
}

main();
