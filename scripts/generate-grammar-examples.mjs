#!/usr/bin/env node
/**
 * grammar-for-app.json の各文法に、OpenAI で例文（韓国語・日本語訳）を2つずつ生成する。
 * 使い方: OPENAI_API_KEY=xxx node scripts/generate-grammar-examples.mjs [grammar-for-app.json] [出力パス]
 * 例文がすでにある項目をスキップ: ONLY_MISSING=1 を指定（TOPIK 2〜6 だけ例文を足すときなど）
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const GRAMMAR_APP_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-for-app.json');
const OUT_PATH = process.argv[3] || GRAMMAR_APP_PATH;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EXAMPLES_PER_GRAMMAR = 2;
const BATCH_SIZE = 25;
const DELAY_MS = 65000;

if (!OPENAI_API_KEY) {
  console.error('環境変数 OPENAI_API_KEY を設定してください。');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateExamplesBatch(itemsSlice) {
  const listForPrompt = itemsSlice.map((g) => ({
    id: g.id,
    title: g.title,
    explanation: g.explanation,
  }));

  const systemPrompt = `あなたは韓国語の文法教材作成者です。与えられた文法リストの各項目について、その文法を使った短い例文を${EXAMPLES_PER_GRAMMAR}つずつ作ってください。
ルール:
1. 返答は必ず単一のJSONオブジェクトのみ。キーは "items" とし、値は配列にする。
2. 配列の各要素は { "id": "g_001", "examples": [ { "korean": "韓国語の例文", "translation": "日本語訳" }, ... ] } とする。
3. id は入力と完全に一致させる。各文法につきちょうど${EXAMPLES_PER_GRAMMAR}つの例文。順序は入力と同じ。
4. 例文は短く自然な韓国語の完全な文にすること。穴埋めにしない。括弧（　）や ___ は入れない。例：「에」なら「학교에 갑니다。」「친구에게 선물을 줍니다。」のように、文法が入った完成文のみ。`;

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
        { role: 'user', content: `以下の文法の各項目について、その文法を使った完全な例文を${EXAMPLES_PER_GRAMMAR}つずつ（韓国語と日本語訳。穴埋めや括弧は使わない）返してください。\n\n${JSON.stringify(listForPrompt)}` },
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
  const arr = parsed.items ?? parsed.grammar ?? [];
  if (!Array.isArray(arr)) throw new Error('Unexpected response shape.');

  const byId = {};
  for (const row of arr) {
    const id = row.id;
    if (!id) continue;
    const examples = row.examples ?? [];
    const normalized = examples.slice(0, EXAMPLES_PER_GRAMMAR).map((e) => ({
      korean: (e.korean || e.sentence || '').trim(),
      translation: (e.translation || e.japanese || '').trim(),
    })).filter((e) => e.korean && e.translation);
    byId[id] = normalized;
  }
  return byId;
}

async function main() {
  const raw = await readFile(GRAMMAR_APP_PATH, 'utf8');
  const data = JSON.parse(raw);
  const items = data.items ?? [];
  const onlyMissing = process.env.ONLY_MISSING === '1' || process.env.ONLY_MISSING === 'true';
  let toProcess = items;
  if (onlyMissing) {
    toProcess = items.filter((g) => !Array.isArray(g.examples) || g.examples.length === 0);
    console.log('Only missing examples:', toProcess.length, '/', items.length);
  }
  const limit = process.env.GRAMMAR_LIMIT ? parseInt(process.env.GRAMMAR_LIMIT, 10) : 0;
  if (limit > 0) toProcess = toProcess.slice(0, limit);
  console.log('Grammar items to process:', toProcess.length);

  const batches = [];
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    batches.push(toProcess.slice(i, i + BATCH_SIZE));
  }

  const allById = {};
  for (let b = 0; b < batches.length; b++) {
    console.log(`Batch ${b + 1}/${batches.length} (${batches[b].length} grammar)...`);
    const byId = await generateExamplesBatch(batches[b]);
    Object.assign(allById, byId);
    if (b < batches.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  for (const item of data.items) {
    if (allById[item.id]?.length) {
      item.examples = allById[item.id];
    }
  }

  await writeFile(OUT_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('Written:', OUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
