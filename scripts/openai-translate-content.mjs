#!/usr/bin/env node
/**
 * OpenAI Chat Completions API で学習用 JSON（文法・単語）を日本語 → 英語に翻訳する補助スクリプト。
 *
 * 前提:
 *   - 環境変数 OPENAI_API_KEY（未設定ならプロジェクト直下の .env.local → .env を読み込み、シェルで export 済みの値は優先）
 *   - 入力は ko_ja 向けの JSON（既存パイプラインの出力で可）
 *
 * 文法 JSON が大きい場合は items / quizItems / reorderItems を分割して翻訳（1 回の応答が出力上限で切れて JSON 壊れを防ぐ）。
 * 単語 JSON（配列）も同様にチャンク分割（2〜6 級の大きいファイル向け）。WORDS_CHUNK_SIZE で件数を調整（既定 35）。
 *
 * 使い方:
 *   node scripts/openai-translate-content.mjs grammar ./scripts/grammar-for-app.json ./out/grammar-ko_en.json
 *   node scripts/openai-translate-content.mjs words ./assets/data/ko/words_level1.json ./out/words_level1.json
 *
 * チャンクサイズ（任意）: GRAMMAR_ITEMS_CHUNK_SIZE=6 など
 *
 * アップロード: Supabase Storage の content バケットに
 *   grammar/ko_en/grammar.json
 *   words/ko_en/words_level{N}.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, fetch as undiciFetch } from 'undici';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

/**
 * .env / .env.local をマージ（後勝ち）。process.env に既にあるキーは上書きしない。
 */
function loadEnvFromProjectRoot() {
  const merged = {};
  for (const name of ['.env', '.env.local']) {
    const p = path.join(PROJECT_ROOT, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      merged[key] = val;
    }
  }
  for (const [key, val] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFromProjectRoot();

const MODEL = process.env.OPENAI_TRANSLATE_MODEL ?? 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS) || 16384;

/** Node の既定 fetch はヘッダー待ちが短く、大きい文法 JSON の応答で UND_ERR_HEADERS_TIMEOUT になりやすい */
const OPENAI_AGENT = new Agent({
  connectTimeout: 60_000,
  headersTimeout: Number(process.env.OPENAI_FETCH_HEADERS_MS) || 600_000,
  bodyTimeout: Number(process.env.OPENAI_FETCH_BODY_MS) || 600_000,
});

function usage() {
  console.error(`Usage:
  node scripts/openai-translate-content.mjs grammar <input.json> <output.json>
  node scripts/openai-translate-content.mjs words <input.json> <output.json>`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** OpenAI 側が拒否することがある制御文字を除去（リクエスト JSON 不正扱いの回避） */
function stripUnsafeControlChars(s) {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

async function openaiJsonTranslate({ system, user, maxTokens = DEFAULT_MAX_TOKENS }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('Missing OPENAI_API_KEY (set in shell or .env / .env.local)');
    process.exit(1);
  }
  const mt = Math.min(Math.max(1, Math.floor(Number(maxTokens)) || DEFAULT_MAX_TOKENS), 128000);
  const safeSystem = stripUnsafeControlChars(system);
  const safeUser = stripUnsafeControlChars(user);
  const body = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: mt,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: safeSystem },
      { role: 'user', content: safeUser },
    ],
  };
  let bodyStr;
  try {
    bodyStr = JSON.stringify(body);
    JSON.parse(bodyStr);
  } catch (e) {
    throw new Error(`Request body is not valid JSON: ${e instanceof Error ? e.message : e}`);
  }

  const maxAttempts = Number(process.env.OPENAI_RETRY_ATTEMPTS) || 5;
  let lastErr = /** @type {Error | null} */ (null);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await undiciFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        dispatcher: OPENAI_AGENT,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });
      const text = await res.text();
      if (!res.ok) {
        const retryable =
          res.status === 400 ||
          res.status === 429 ||
          res.status === 500 ||
          res.status === 502 ||
          res.status === 503;
        if (retryable && attempt < maxAttempts) {
          const delay = Math.min(30_000, 2000 * 2 ** (attempt - 1));
          console.error(`  OpenAI ${res.status}, retry ${attempt}/${maxAttempts} in ${delay / 1000}s...`);
          await sleep(delay);
          lastErr = new Error(`OpenAI API ${res.status}: ${text.slice(0, 800)}`);
          continue;
        }
        throw new Error(`OpenAI API ${res.status}: ${text.slice(0, 800)}`);
      }
      const data = JSON.parse(text);
      const raw = data?.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') throw new Error('Invalid API response');
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('JSON.parse failed. Response length:', raw.length);
        console.error('Start:', raw.slice(0, 400));
        console.error('End:', raw.slice(-400));
        throw e;
      }
    } catch (e) {
      if (e instanceof Error && /^OpenAI API \d/.test(e.message)) throw e;
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts) {
        const delay = Math.min(30_000, 2000 * 2 ** (attempt - 1));
        console.error(`  fetch error, retry ${attempt}/${maxAttempts} in ${delay / 1000}s...`, lastErr.message);
        await sleep(delay);
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr ?? new Error('openaiJsonTranslate failed');
}

const SYS_ITEMS = `You translate the "items" array for a Korean learning app: Japanese explanations → natural English for learners.
Return ONLY valid JSON with a single top-level key "items" (array). Same length as input.
Do NOT change: id, lesson_id, title/structure when they are Korean (Hangul). Do NOT change korean in examples.
Translate: explanation, example.translation. Translate title/structure only if they are Japanese (not pure Korean).`;

const SYS_QUIZ = `You translate "quizItems" for a Korean grammar app. Japanese → English in translation fields.
Return ONLY JSON with top-level key "quizItems" only. Same array length and same ids as input.
Do NOT change Korean fields (korean, answer if Hangul).`;

const SYS_REORDER = `You translate "reorderItems" hints: Japanese → English.
Return ONLY JSON with top-level key "reorderItems" only. Same array length and ids. Do NOT change "chunks" (Korean).`;

const SYS_SUMMARIES = `You translate "lessonSummaries" values Japanese → English. Keys (lesson ids) unchanged.
Return ONLY JSON with top-level key "lessonSummaries" only.`;

const WORDS_SYSTEM = `You translate Korean vocabulary app JSON from Japanese glosses to English glosses.
Return ONLY valid JSON: the same array length and same object keys as input.
Rules:
- Do NOT change: id, language, korean, reading, topik_level, lesson_id.
- Translate "japanese" field to English meaning (keep key name "japanese").
- For example.japanese, translate to English. Keep example.korean unchanged.
- Preserve JSON number types and string formatting.`;

const SYS_WORDS_CHUNK = `You translate a "items" array for a Korean vocabulary app: Japanese glosses → English glosses.
Return ONLY valid JSON with a single top-level key "items" (array). Same length as input.
Rules:
- Do NOT change: id, language, korean, reading, topik_level, lesson_id, frequency_rank (if present).
- Translate "japanese" to English meaning (keep key name "japanese").
- For example.japanese, translate to English. Keep example.korean unchanged.
- Preserve JSON number types.`;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function translateGrammarChunked(input) {
  const nItems = Number(process.env.GRAMMAR_ITEMS_CHUNK_SIZE) || 6;
  const nQuiz = Number(process.env.GRAMMAR_QUIZ_CHUNK_SIZE) || 10;
  const nReorder = Number(process.env.GRAMMAR_REORDER_CHUNK_SIZE) || 10;

  const out = {
    locale: 'ko_en',
    items: [],
    quizItems: [],
    lessonSummaries: {},
    reorderItems: [],
  };

  const items = Array.isArray(input.items) ? input.items : [];
  const chunks = chunkArray(items, nItems);
  for (let c = 0; c < chunks.length; c++) {
    const slice = chunks[c];
    const from = c * nItems + 1;
    const to = c * nItems + slice.length;
    console.error(`  grammar items ${from}-${to} / ${items.length}`);
    const r = await openaiJsonTranslate({
      system: SYS_ITEMS,
      user: `Translate this JSON object.\n\n${JSON.stringify({ items: slice })}`,
    });
    if (!Array.isArray(r.items) || r.items.length !== slice.length) {
      throw new Error(`items chunk ${c}: expected ${slice.length} items, got ${r.items?.length}`);
    }
    out.items.push(...r.items);
  }

  if (input.lessonSummaries && typeof input.lessonSummaries === 'object') {
    const keys = Object.keys(input.lessonSummaries);
    if (keys.length > 0) {
      console.error(`  lessonSummaries (${keys.length} keys)`);
      const r = await openaiJsonTranslate({
        system: SYS_SUMMARIES,
        user: JSON.stringify({ lessonSummaries: input.lessonSummaries }),
      });
      out.lessonSummaries = r.lessonSummaries && typeof r.lessonSummaries === 'object' ? r.lessonSummaries : {};
    }
  }

  const quizItems = Array.isArray(input.quizItems) ? input.quizItems : [];
  const quizChunks = chunkArray(quizItems, nQuiz);
  for (let c = 0; c < quizChunks.length; c++) {
    const slice = quizChunks[c];
    console.error(`  quizItems chunk ${c + 1}/${quizChunks.length} (${slice.length})`);
    const r = await openaiJsonTranslate({
      system: SYS_QUIZ,
      user: JSON.stringify({ quizItems: slice }),
    });
    if (!Array.isArray(r.quizItems) || r.quizItems.length !== slice.length) {
      throw new Error(`quizItems chunk ${c}: length mismatch`);
    }
    out.quizItems.push(...r.quizItems);
  }

  const reorderItems = Array.isArray(input.reorderItems) ? input.reorderItems : [];
  const reorderChunks = chunkArray(reorderItems, nReorder);
  for (let c = 0; c < reorderChunks.length; c++) {
    const slice = reorderChunks[c];
    console.error(`  reorderItems chunk ${c + 1}/${reorderChunks.length} (${slice.length})`);
    const r = await openaiJsonTranslate({
      system: SYS_REORDER,
      user: JSON.stringify({ reorderItems: slice }),
    });
    if (!Array.isArray(r.reorderItems) || r.reorderItems.length !== slice.length) {
      throw new Error(`reorderItems chunk ${c}: length mismatch`);
    }
    out.reorderItems.push(...r.reorderItems);
  }

  return out;
}

async function translateWordsChunked(arr) {
  if (!Array.isArray(arr)) throw new Error('words: expected JSON array');
  const size = Number(process.env.WORDS_CHUNK_SIZE) || 35;
  const chunks = chunkArray(arr, size);
  const out = [];
  for (let c = 0; c < chunks.length; c++) {
    const slice = chunks[c];
    console.error(`  words chunk ${c + 1}/${chunks.length} (${slice.length} items)`);
    const r = await openaiJsonTranslate({
      system: SYS_WORDS_CHUNK,
      user: JSON.stringify({ items: slice }),
    });
    if (!Array.isArray(r.items) || r.items.length !== slice.length) {
      throw new Error(`words chunk ${c}: expected ${slice.length} items, got ${r.items?.length}`);
    }
    out.push(...r.items);
  }
  return out;
}

async function main() {
  const [, , mode, inPath, outPath] = process.argv;
  if (!mode || !inPath || !outPath) usage();

  const absIn = path.resolve(inPath);
  const absOut = path.resolve(outPath);
  if (!fs.existsSync(absIn)) {
    console.error(`Input file not found: ${absIn}`);
    if (inPath.includes('path/to')) {
      console.error('Hint: use e.g. ./assets/data/ko/words_level1.json');
    }
    process.exit(1);
  }
  const rawText = fs.readFileSync(absIn, 'utf8');
  const input = JSON.parse(rawText);

  let out;
  if (mode === 'grammar') {
    console.error(`Translating grammar (chunked) with ${MODEL}...`);
    out = await translateGrammarChunked(input);
  } else if (mode === 'words') {
    if (Array.isArray(input)) {
      console.error(`Translating words (chunked) with ${MODEL}...`);
      out = await translateWordsChunked(input);
    } else {
      const user = `Translate the following JSON. Output the full translated JSON only.\n\n${JSON.stringify(input)}`;
      console.error(`Translating (words) with ${MODEL}...`);
      out = await openaiJsonTranslate({ system: WORDS_SYSTEM, user });
    }
  } else {
    usage();
  }

  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.error(`Wrote ${absOut}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
