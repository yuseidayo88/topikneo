#!/usr/bin/env node
/**
 * 単語CSV（韓国語,日本語）を読み、AIで頻出順に並べて frequency_rank を付けたJSONを出力する。
 * TPM制限に合わせてバッチ（250語ずつ）でスコアを取得し、最後に全体をソートする。
 * 使い方: OPENAI_API_KEY=xxx node scripts/sort-words-by-frequency.mjs [CSVのパス]
 */

import { writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';

const CSV_PATH = process.argv[2] || path.join(process.cwd(), '単語一覧 - シート1.csv');
const OUT_PATH = process.argv[3] || path.join(process.cwd(), 'scripts', 'words-sorted.json');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BATCH_SIZE = 250;
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
  const words = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const row = parseCsvLine(line);
    if (row) words.push(row);
  }
  return words;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scoreBatch(words, batchIndex) {
  const systemPrompt = `あなたは韓国語の語彙専門家です。与えられた韓国語単語リストの各単語に、韓国語の日常・メディアでの「使用頻度」に基づくスコアを付けてください。
ルール:
1. 返答は必ず、単一のJSONオブジェクトのみ。キーは "words" とし、値は配列にする。
2. 配列の各要素は { "korean": "韓国語", "japanese": "日本語", "frequency_score": 整数 } とする。
3. frequency_score は 1（最も頻出）から 10（最もレア）の10段階とする。
4. 入力と全く同じ単語を、frequency_score を付けただけの形で返す。欠落・重複・順序入れ替えをしない。`;

  const userContent = JSON.stringify(words);

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
        { role: 'user', content: `以下の単語リストの各単語に frequency_score（1=最も頻出〜10=最もレア）を付けたJSONを返してください。\n\n${userContent}` },
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
  const arr = parsed.words ?? parsed.list;
  if (!Array.isArray(arr)) throw new Error('Unexpected response shape.');
  return arr;
}

async function main() {
  console.log('Reading CSV:', CSV_PATH);
  const words = await readCsv(CSV_PATH);
  console.log('Words loaded:', words.length);

  if (words.length === 0) {
    console.error('No words found in CSV.');
    process.exit(1);
  }

  const batches = [];
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    batches.push(words.slice(i, i + BATCH_SIZE));
  }
  console.log(`Batches: ${batches.length} (TPM制限のため ${BATCH_SIZE} 語ずつ、各バッチ後に ${DELAY_MS / 1000} 秒待機)`);

  const scored = [];
  for (let b = 0; b < batches.length; b++) {
    console.log(`Batch ${b + 1}/${batches.length}...`);
    const result = await scoreBatch(batches[b], b);
    for (let i = 0; i < result.length; i++) {
      scored.push({
        korean: result[i].korean,
        japanese: result[i].japanese,
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

  scored.sort((a, b) => {
    if (a.frequency_score !== b.frequency_score) return a.frequency_score - b.frequency_score;
    if (a.batchIndex !== b.batchIndex) return a.batchIndex - b.batchIndex;
    return a.indexInBatch - b.indexInBatch;
  });

  const withId = scored.map((w, i) => ({
    id: `ko_w${String(i + 1).padStart(4, '0')}`,
    language: 'ko',
    korean: w.korean,
    reading: '',
    japanese: w.japanese,
    topik_level: 1,
    lesson_id: '',
    frequency_rank: i + 1,
    example: { korean: '', japanese: '' },
  }));

  await writeFile(OUT_PATH, JSON.stringify(withId, null, 2), 'utf8');
  console.log('Written:', OUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
