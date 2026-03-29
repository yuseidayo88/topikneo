#!/usr/bin/env node
/**
 * 文法CSV（韓国語文法パターン, 日本語の意味）を読み、
 * AIで難易度・頻出度のスコアを付けて並び替えたJSONを出力する。
 * 使い方: OPENAI_API_KEY=xxx node scripts/sort-grammar-by-difficulty-frequency.mjs [CSVのパス] [出力パス]
 */

import { writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';

const CSV_PATH = process.argv[2] || path.join(process.cwd(), '文法一覧 - シート1.csv');
const OUT_PATH = process.argv[3] || path.join(process.cwd(), 'scripts', 'grammar-sorted.json');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BATCH_SIZE = 80;
const DELAY_MS = 65000;

if (!OPENAI_API_KEY) {
  console.error('環境変数 OPENAI_API_KEY を設定してください。');
  process.exit(1);
}

function parseCsvLine(line) {
  const idx = line.indexOf(',');
  if (idx === -1) return null;
  const korean = line.slice(0, idx).trim();
  const japanese = line.slice(idx + 1).trim();
  if (!korean) return null;
  return { korean, japanese };
}

async function readCsv(filePath) {
  const items = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const row = parseCsvLine(line);
    if (row) items.push(row);
  }
  return items;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scoreBatch(items, batchIndex) {
  const systemPrompt = `あなたは韓国語の文法教育の専門家です。与えられた韓国語文法リストの各項目に、「TOPIK級」「学習難易度」「日常・メディアでの使用頻度」を付けてください。
ルール:
1. 返答は必ず、単一のJSONオブジェクトのみ。キーは "items" とし、値は配列にする。
2. 配列の各要素は { "korean": "韓国語", "japanese": "日本語", "topik_level": 整数, "difficulty_score": 整数, "frequency_score": 整数 } とする。
3. topik_level は TOPIK 試験の級に相当する 1〜6 の整数。1=初級1級、2=初級2級、3=中級入門、4=中級、5=中級上、6=上級。
4. difficulty_score は 1（初級・覚えやすい）から 10（上級・複雑）の10段階とする。
5. frequency_score は 1（非常に頻出）から 10（あまり使われない）の10段階とする。
6. 入力と全く同じ項目を、3つのスコアを付けただけの形で返す。欠落・重複・順序入れ替えをしない。`;

  const userContent = JSON.stringify(items);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下の文法リストの各項目に topik_level（1〜6、TOPIKの級）、difficulty_score（1=易しい〜10=難しい）、frequency_score（1=頻出〜10=レア）を付けたJSONを返してください。\n\n${userContent}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  const arr = parsed.items ?? parsed.list ?? parsed.grammar;
  if (!Array.isArray(arr)) throw new Error('Unexpected response shape.');
  return arr;
}

async function main() {
  console.log('Reading CSV:', CSV_PATH);
  const items = await readCsv(CSV_PATH);
  console.log('Grammar items loaded:', items.length);

  if (items.length === 0) {
    console.error('No grammar items found in CSV.');
    process.exit(1);
  }

  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }
  console.log(`Batches: ${batches.length} (${BATCH_SIZE} 件ずつ、各バッチ後に ${DELAY_MS / 1000} 秒待機)`);

  const scored = [];
  for (let b = 0; b < batches.length; b++) {
    console.log(`Batch ${b + 1}/${batches.length}...`);
    const result = await scoreBatch(batches[b], b);
    for (let i = 0; i < result.length; i++) {
      const rawLevel = result[i].topik_level;
      const topikLevel = Math.min(6, Math.max(1, Number(rawLevel) || 1));
      scored.push({
        korean: result[i].korean,
        japanese: result[i].japanese,
        topik_level: topikLevel,
        difficulty_score: result[i].difficulty_score ?? 5,
        frequency_score: result[i].frequency_score ?? 5,
        batchIndex: b,
        indexInBatch: i,
      });
    }
    if (b < batches.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s for rate limit...`);
      await sleep(DELAY_MS);
    }
  }

  // TOPIK級 → 難易度 → 頻出度の順でソート
  scored.sort((a, b) => {
    if (a.topik_level !== b.topik_level) return a.topik_level - b.topik_level;
    if (a.difficulty_score !== b.difficulty_score) return a.difficulty_score - b.difficulty_score;
    if (a.frequency_score !== b.frequency_score) return a.frequency_score - b.frequency_score;
    if (a.batchIndex !== b.batchIndex) return a.batchIndex - b.batchIndex;
    return a.indexInBatch - b.indexInBatch;
  });

  const withId = scored.map((item, i) => ({
    id: `g_${String(i + 1).padStart(3, '0')}`,
    korean: item.korean,
    japanese: item.japanese,
    topik_level: item.topik_level,
    difficulty_score: item.difficulty_score,
    frequency_score: item.frequency_score,
    order_rank: i + 1,
  }));

  await writeFile(OUT_PATH, JSON.stringify(withId, null, 2), 'utf8');
  console.log('Written:', OUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
