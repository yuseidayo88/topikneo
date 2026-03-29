#!/usr/bin/env node
/**
 * ko_ja 単語 JSON の「単語クイズ用」意味欄 j japanese のみ、OpenAI で日本語として再生成する。
 * example は変更しない（マージ時に入力側の example を必ず保持）。
 *
 * 既定の入力: scripts/words-by-level/words_level1.json … 6
 * 既定の出力: out/ko_ja_words_glosses/words_levelN.json（上書きしない安全な別フォルダ）
 *
 * 前提:
 *   - OPENAI_API_KEY（.env / .env.local からも読み込み）
 *   - 任意: OPENAI_TRANSLATE_MODEL（既定 gpt-4o-mini）
 *
 * 実行例:
 *   node scripts/regenerate-words-japanese-glosses.mjs
 *   LEVELS=1,2 WORDS_CHUNK_SIZE=28 node scripts/regenerate-words-japanese-glosses.mjs
 *   WORDS_IN=./scripts/words-by-level WORDS_OUT=./scripts/words-by-level IN_PLACE=1 node scripts/regenerate-words-japanese-glosses.mjs
 *   （IN_PLACE=1 のとき各ファイルの .bak を同ディレクトリに作成してから上書き）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, fetch as undiciFetch } from 'undici';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

function loadEnvFromProjectRoot() {
  const merged = {};
  for (const name of ['.env', '.env.local']) {
    const p = path.join(PROJECT_ROOT, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
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

const OPENAI_AGENT = new Agent({
  connectTimeout: 60_000,
  headersTimeout: Number(process.env.OPENAI_FETCH_HEADERS_MS) || 600_000,
  bodyTimeout: Number(process.env.OPENAI_FETCH_BODY_MS) || 600_000,
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripUnsafeControlChars(s) {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

async function openaiJsonTranslate({ system, user, maxTokens = DEFAULT_MAX_TOKENS }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('OPENAI_API_KEY を設定してください（.env またはシェル）');
    process.exit(1);
  }
  const mt = Math.min(Math.max(1, Math.floor(Number(maxTokens)) || DEFAULT_MAX_TOKENS), 128000);
  const body = {
    model: MODEL,
    temperature: 0.25,
    max_tokens: mt,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: stripUnsafeControlChars(system) },
      { role: 'user', content: stripUnsafeControlChars(user) },
    ],
  };
  const bodyStr = JSON.stringify(body);
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
          res.status === 400 || res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503;
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
      return JSON.parse(raw);
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

const SYSTEM_PROMPT = `あなたは韓国語学習アプリ（TOPIK 単語）の編集者です。
入力は JSON オブジェクトで、キー "items" に単語オブジェクトの配列があります。

やること:
- 各要素の **japanese** だけを、クイズの選択肢として適した **自然な日本語** に書き換えてください。
- 意味は韓国語の語義（korean / reading）に忠実に。学習者向けに簡潔に（名詞なら短い名詞句、動詞なら「〜する」など統一しやすい形）。
- 出力は必ず有効な JSON。**トップレベルキーは "items" だけ**。配列の長さは入力と**完全に同じ**。
- 各出力要素には入力と同じ **id** を含めてください（検証用）。

変更してはいけない（入力からコピーするか、触らない）:
- example の中身（example.japanese も含む）は変更禁止。出力時も各 id に対応する example は入力と同一である必要があります。

出力の各要素に含めるキー:
- id（入力と同じ）
- japanese（新しい文字列のみ）

※ 実装側で入力とマージするため、id と japanese が正確に対応していれば十分です。`;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * API は id + japanese のみ返す想定。入力スライスとマージし、example 等は入力を維持。
 */
function mergeGlosses(inputSlice, apiResponse) {
  const items = apiResponse?.items;
  if (!Array.isArray(items) || items.length !== inputSlice.length) {
    throw new Error(`API items length: expected ${inputSlice.length}, got ${items?.length}`);
  }
  const byId = new Map(items.map((x) => [x.id, x]));
  const out = [];
  for (const inp of inputSlice) {
    const o = byId.get(inp.id);
    if (!o || typeof o.japanese !== 'string' || !o.japanese.trim()) {
      throw new Error(`Missing or invalid japanese for id=${inp.id}`);
    }
    out.push({
      ...inp,
      japanese: o.japanese.trim(),
    });
  }
  return out;
}

function buildUserPayload(slice) {
  return JSON.stringify({
    items: slice.map((w) => ({
      id: w.id,
      korean: w.korean,
      reading: w.reading,
      japanese: w.japanese,
    })),
  });
}

async function processLevel(level, wordsInDir, wordsOutDir, chunkSize, dryRun) {
  const name = `words_level${level}.json`;
  const inPath = path.join(wordsInDir, name);
  if (!fs.existsSync(inPath)) {
    console.error(`Skip (missing): ${inPath}`);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  if (!Array.isArray(raw)) throw new Error(`${name}: expected array`);
  const chunks = chunkArray(raw, chunkSize);
  const merged = [];
  console.error(`${name}: ${raw.length} items, ${chunks.length} chunk(s), chunkSize=${chunkSize}`);

  for (let c = 0; c < chunks.length; c++) {
    const slice = chunks[c];
    const from = c * chunkSize + 1;
    const to = c * chunkSize + slice.length;
    console.error(`  chunk ${c + 1}/${chunks.length} (${from}-${to})`);
    if (dryRun) continue;

    const r = await openaiJsonTranslate({
      system: SYSTEM_PROMPT,
      user: `次の JSON を処理し、ルールに従って "items" を返してください。\n\n${buildUserPayload(slice)}`,
    });
    const part = mergeGlosses(slice, r);
    merged.push(...part);
  }

  if (dryRun) return;

  if (merged.length !== raw.length) {
    throw new Error(`${name}: merged length ${merged.length} !== ${raw.length}`);
  }

  fs.mkdirSync(wordsOutDir, { recursive: true });
  const outPath = path.join(wordsOutDir, name);
  fs.writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.error(`Wrote ${outPath}`);
}

async function main() {
  const wordsIn = path.resolve(PROJECT_ROOT, process.env.WORDS_IN || 'scripts/words-by-level');
  const inPlace = process.env.IN_PLACE === '1' || process.env.IN_PLACE === 'true';
  const wordsOut = inPlace
    ? wordsIn
    : path.resolve(PROJECT_ROOT, process.env.WORDS_OUT || 'out/ko_ja_words_glosses');

  const levelsStr = process.env.LEVELS || '1,2,3,4,5,6';
  const levels = levelsStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n >= 1 && n <= 6);

  const chunkSize = Math.max(1, Number(process.env.WORDS_CHUNK_SIZE) || 35);
  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

  if (levels.length === 0) {
    console.error('LEVELS must parse to 1..6');
    process.exit(1);
  }

  console.error(`Model: ${MODEL}`);
  console.error(`Input dir: ${wordsIn}`);
  console.error(`Output dir: ${wordsOut}${inPlace ? ' (IN_PLACE)' : ''}`);
  console.error(`Levels: ${levels.join(', ')}`);
  console.error(`Chunk size: ${chunkSize}`);
  if (dryRun) console.error('DRY_RUN: no API calls, no writes');

  if (inPlace && !dryRun) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    for (const level of levels) {
      const name = `words_level${level}.json`;
      const p = path.join(wordsIn, name);
      if (!fs.existsSync(p)) continue;
      const bak = path.join(wordsIn, `${name}.bak.${ts}`);
      fs.copyFileSync(p, bak);
      console.error(`Backup: ${bak}`);
    }
  }

  for (const level of levels) {
    await processLevel(level, wordsIn, wordsOut, chunkSize, dryRun);
  }

  if (!dryRun && !inPlace) {
    console.error(`\n完了。確認後、必要なら ${wordsOut} を scripts/words-by-level にコピーしてから npm run upload 等で反映してください。`);
  }
  if (!dryRun && inPlace) {
    console.error('\n完了。IN_PLACE で scripts/words-by-level を更新しました。');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
