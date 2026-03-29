#!/usr/bin/env node
/**
 * words-sorted.json の各単語に、OpenAI で例文（韓国語・日本語）を生成して example を埋める。
 * TPM 制限のためバッチ処理し、各バッチ後に待機する。所要時間は 40 分〜1 時間程度です。
 * 使い方: OPENAI_API_KEY=xxx node scripts/generate-word-examples.mjs [words-sorted.json のパス]
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const WORDS_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'words-sorted.json');
const BATCH_SIZE = 50;
const DELAY_MS = 35000;

async function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  try {
    const content = await readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^OPENAI_API_KEY=(.*)$/);
      if (m) process.env.OPENAI_API_KEY = m[1].replace(/^["']|["']$/g, '').trim();
    }
  } catch (_e) {
    // .env がなくても環境変数で渡されていればよい
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateExamplesBatch(wordsSlice, openaiKey) {
  const systemPrompt = `あなたは韓国語の語学教材作成者です。与えられた単語リストの各単語について、その単語を1回使った短い例文を1つずつ作ってください。
ルール:
1. 返答は必ず単一のJSONオブジェクトのみ。キーは "examples" とし、値は配列にする。
2. 配列の各要素は { "korean": "韓国語の例文", "japanese": "日本語訳" } とする。
3. 入力の単語の順番と完全に同じ順で返す。欠落・重複・順序入れ替えをしない。
4. 例文は短く（韓国語で 5〜15 語程度）、自然な表現にすること。`;

  const inputList = wordsSlice.map((w) => ({ korean: w.korean, japanese: w.japanese }));
  const userContent = JSON.stringify(inputList);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下の単語リストの各単語について、その単語を使った短い例文（韓国語と日本語訳）を1つずつ返してください。\n\n${userContent}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
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
  const arr = parsed.examples ?? parsed.list;
  if (!Array.isArray(arr)) throw new Error('Unexpected response shape.');
  return arr;
}

async function main() {
  await loadEnv();
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error('環境変数 OPENAI_API_KEY を設定するか、.env に OPENAI_API_KEY=... を書いてください。');
    process.exit(1);
  }
  console.log('Reading:', WORDS_PATH);
  const raw = await readFile(WORDS_PATH, 'utf8');
  const words = JSON.parse(raw);
  if (!Array.isArray(words)) {
    console.error('Invalid JSON: expected array of words.');
    process.exit(1);
  }
  console.log('Words:', words.length);
  console.log(`Batches: ${Math.ceil(words.length / BATCH_SIZE)} (${BATCH_SIZE} 語ずつ、各バッチ後に ${DELAY_MS / 1000} 秒待機)`);

  const totalBatches = Math.ceil(words.length / BATCH_SIZE);
  for (let b = 0; b < totalBatches; b++) {
    const start = b * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, words.length);
    const slice = words.slice(start, end);
    console.log(`Batch ${b + 1}/${totalBatches} (index ${start}–${end - 1})...`);
    try {
      const examples = await generateExamplesBatch(slice, OPENAI_API_KEY);
      for (let i = 0; i < slice.length; i++) {
        const ex = examples[i];
        if (ex && typeof ex.korean === 'string' && typeof ex.japanese === 'string') {
          words[start + i].example = { korean: ex.korean.trim(), japanese: ex.japanese.trim() };
        }
      }
    } catch (e) {
      console.error('Batch failed:', e.message);
      throw e;
    }
    if (b < totalBatches - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s for rate limit...`);
      await sleep(DELAY_MS);
    }
  }

  await writeFile(WORDS_PATH, JSON.stringify(words, null, 2), 'utf8');
  console.log('Written:', WORDS_PATH);
  console.log('Done. 次: node scripts/prepare-words-for-supabase.mjs && node scripts/upload-words-to-supabase.mjs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
