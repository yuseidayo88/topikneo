#!/usr/bin/env node
/**
 * OpenAI Chat Completions で文法 JSON の各見出し title に対応する title_speak（韓国語 TTS 向け読み）を生成する。
 *
 * 前提: OPENAI_API_KEY（.env / .env.local から読み込み可）
 *
 * 使い方:
 *   node scripts/openai-generate-grammar-title-speak.mjs
 *   node scripts/openai-generate-grammar-title-speak.mjs ./out/grammar-ko_en.json ./out/grammar-ko_en.json
 *   node scripts/openai-generate-grammar-title-speak.mjs --dry-run
 *   node scripts/openai-generate-grammar-title-speak.mjs --missing-only
 *
 * 環境変数:
 *   OPENAI_TITLE_SPEAK_MODEL   既定: gpt-4o-mini（なければ OPENAI_TRANSLATE_MODEL）
 *   GRAMMAR_TITLE_SPEAK_CHUNK_SIZE  1 リクエストあたりのユニーク title 数（既定 22）
 *   TITLE_SPEAK_DELAY_MS         バッチ間の待機 ms（既定 400）
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

const MODEL =
  process.env.OPENAI_TITLE_SPEAK_MODEL?.trim() ||
  process.env.OPENAI_TRANSLATE_MODEL?.trim() ||
  'gpt-4o-mini';
const CHUNK_SIZE = Math.max(1, Number.parseInt(process.env.GRAMMAR_TITLE_SPEAK_CHUNK_SIZE ?? '22', 10) || 22);
const DELAY_MS = Math.max(0, Number.parseInt(process.env.TITLE_SPEAK_DELAY_MS ?? '400', 10) || 0);
const MAX_TOKENS = Math.min(16384, Number.parseInt(process.env.OPENAI_MAX_TOKENS ?? '8192', 10) || 8192);

const OPENAI_AGENT = new Agent({
  connectTimeout: 60_000,
  headersTimeout: Number(process.env.OPENAI_FETCH_HEADERS_MS) || 600_000,
  bodyTimeout: Number(process.env.OPENAI_FETCH_BODY_MS) || 600_000,
});

function stripUnsafeControlChars(s) {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const SYSTEM_PROMPT = `You help build Korean textbook grammar headings for text-to-speech (TTS) in Korean (ko-KR).

For each input "title" string, output "title_speak": the phrase to READ ALOUD for learners.

Rules:
1. Output ONLY natural Korean Hangul when the pattern is Korean grammar (particles, endings, etc.). Do NOT read notation like ～, /, parentheses for optional (으), or isolated jamo letters (ㄴ, ㄹ, ㅂ) as letter names—rewrite into how a teacher would SAY the pattern name in one breath (e.g. 는가 보다, 은, 는, 는다고 해도).
2. For titles that mix English and Korean, keep Korean parts as speakable Hangul; shorten English to clean phrases without ~ or odd slashes (e.g. "He or she says that" instead of "He/She says that ~").
3. For English-only titles, output short natural English without ~ or full-width ～, suitable for TTS (minimal punctuation).
4. No quotes, no JSON inside strings, no explanations—only the reading string.
5. Keep each title_speak reasonably short (typically under 40 characters unless the pattern requires more).

Return ONLY valid JSON: {"results":[{"title":"<exact same as input title>","title_speak":"..."}]}
The "results" array MUST have the SAME length and SAME "title" values as the input (in the same order).`;

async function openaiTitleSpeakBatch(titles) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('Missing OPENAI_API_KEY (set in shell or .env / .env.local)');
    process.exit(1);
  }

  const userPayload = { titles };
  const body = {
    model: MODEL,
    temperature: 0.15,
    max_tokens: MAX_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: stripUnsafeControlChars(SYSTEM_PROMPT) },
      {
        role: 'user',
        content: stripUnsafeControlChars(
          `Generate title_speak for each title. Input JSON:\n${JSON.stringify(userPayload)}`
        ),
      },
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
          res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503;
        if (retryable && attempt < maxAttempts) {
          const delay = Math.min(30_000, 2000 * 2 ** (attempt - 1));
          console.error(`  OpenAI ${res.status}, retry ${attempt}/${maxAttempts} in ${delay / 1000}s...`);
          await sleep(delay);
          lastErr = new Error(`OpenAI API ${res.status}: ${text.slice(0, 600)}`);
          continue;
        }
        throw new Error(`OpenAI API ${res.status}: ${text.slice(0, 800)}`);
      }
      const data = JSON.parse(text);
      const raw = data?.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') throw new Error('Invalid API response');
      const parsed = JSON.parse(raw);
      const results = parsed?.results;
      if (!Array.isArray(results)) throw new Error('Response JSON missing results[]');

      if (results.length !== titles.length) {
        throw new Error(`Expected ${titles.length} results, got ${results.length}`);
      }
      for (let i = 0; i < titles.length; i++) {
        if (results[i]?.title != null && results[i].title !== titles[i]) {
          console.warn(
            `  [warn] result[${i}].title mismatch (using index order): expected ${JSON.stringify(titles[i].slice(0, 48))}…`
          );
        }
        if (typeof results[i]?.title_speak !== 'string' || !results[i].title_speak.trim()) {
          throw new Error(`Empty title_speak at index ${i} for ${JSON.stringify(titles[i])}`);
        }
      }
      return results.map((r) => r.title_speak.trim());
    } catch (e) {
      if (e instanceof Error && /^OpenAI API \d/.test(e.message)) throw e;
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts) {
        const delay = Math.min(30_000, 2000 * 2 ** (attempt - 1));
        console.error(`  error, retry ${attempt}/${maxAttempts}:`, lastErr.message);
        await sleep(delay);
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr ?? new Error('openaiTitleSpeakBatch failed');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set();
  const rest = [];
  for (const a of args) {
    if (a.startsWith('--')) flags.add(a);
    else rest.push(a);
  }
  return {
    dryRun: flags.has('--dry-run'),
    missingOnly: flags.has('--missing-only'),
    inputPath: rest[0] ? path.resolve(rest[0]) : path.join(PROJECT_ROOT, 'out/grammar-ko_en.json'),
    outputPath: rest[1] ? path.resolve(rest[1]) : rest[0] ? path.resolve(rest[0]) : path.join(PROJECT_ROOT, 'out/grammar-ko_en.json'),
  };
}

async function main() {
  const { dryRun, missingOnly, inputPath, outputPath } = parseArgs(process.argv);

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(raw.items)) {
    console.error('Invalid grammar JSON: missing items[]');
    process.exit(1);
  }

  /** @type {Map<string, string | undefined>} */
  const titleToSpeak = new Map();
  for (const item of raw.items) {
    if (typeof item?.title !== 'string') continue;
    const t = item.title;
    if (!titleToSpeak.has(t)) titleToSpeak.set(t, item.title_speak);
  }

  const allTitles = [...new Set(raw.items.map((i) => i.title).filter((t) => typeof t === 'string'))];

  let titlesToFetch = allTitles;
  if (missingOnly) {
    titlesToFetch = allTitles.filter((t) => {
      const ts = titleToSpeak.get(t);
      return ts === undefined || String(ts).trim() === '';
    });
  }

  console.error(`Model: ${MODEL}`);
  console.error(`Unique titles: ${allTitles.length}, to generate: ${titlesToFetch.length}, chunk: ${CHUNK_SIZE}`);
  if (dryRun) {
    console.error('Dry run — no API calls.');
    console.error('First 5 titles:', titlesToFetch.slice(0, 5));
    process.exit(0);
  }

  if (titlesToFetch.length === 0) {
    console.error('Nothing to generate (--missing-only and all titles already have title_speak).');
    process.exit(0);
  }

  const batches = chunkArray(titlesToFetch, CHUNK_SIZE);
  /** @type {Map<string, string>} */
  const generated = new Map();

  let bi = 0;
  for (const batch of batches) {
    bi += 1;
    console.error(`Batch ${bi}/${batches.length} (${batch.length} titles)...`);
    const speaks = await openaiTitleSpeakBatch(batch);
    for (let i = 0; i < batch.length; i++) {
      generated.set(batch[i], speaks[i]);
    }
    if (DELAY_MS > 0 && bi < batches.length) await sleep(DELAY_MS);
  }

  let updated = 0;
  for (const item of raw.items) {
    if (typeof item?.title !== 'string') continue;
    const g = generated.get(item.title);
    if (g === undefined) continue;
    const next = g.trim();
    if (next === item.title) {
      if ('title_speak' in item) {
        delete item.title_speak;
        updated += 1;
      }
    } else {
      item.title_speak = next;
      updated += 1;
    }
  }

  const out = JSON.stringify(raw, null, 2) + '\n';
  fs.writeFileSync(outputPath, out, 'utf8');
  console.error(`Wrote ${path.relative(PROJECT_ROOT, outputPath)} (touched ${updated} item rows, ${generated.size} unique titles updated)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
