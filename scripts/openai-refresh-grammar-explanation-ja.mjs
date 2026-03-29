#!/usr/bin/env node
/**
 * OpenAI で grammar JSON の items[].explanation（日本語の意味ラベル）を
 * TOPIK 1〜6（lesson_id が ko_G1_〜ko_G6_）の項目だけ整える。例文は変更しない。
 *
 * 前提: OPENAI_API_KEY（.env / .env.local）
 *
 * 使い方:
 *   node scripts/openai-refresh-grammar-explanation-ja.mjs
 *   node scripts/openai-refresh-grammar-explanation-ja.mjs --dry-run
 *   node scripts/openai-refresh-grammar-explanation-ja.mjs [入力.json] [出力.json]
 *
 * 環境変数:
 *   OPENAI_GRAMMAR_EXPLANATION_JA_MODEL  既定: gpt-4o-mini（なければ OPENAI_TRANSLATE_MODEL）
 *   GRAMMAR_EXPLANATION_JA_CHUNK_SIZE    1 リクエストあたりの文法数（既定 16）
 *   GRAMMAR_EXPLANATION_JA_DELAY_MS     バッチ間待機 ms（既定 500）
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
  process.env.OPENAI_GRAMMAR_EXPLANATION_JA_MODEL?.trim() ||
  process.env.OPENAI_TRANSLATE_MODEL?.trim() ||
  'gpt-4o-mini';
const CHUNK_SIZE = Math.max(
  1,
  Number.parseInt(process.env.GRAMMAR_EXPLANATION_JA_CHUNK_SIZE ?? '16', 10) || 16
);
const DELAY_MS = Math.max(
  0,
  Number.parseInt(process.env.GRAMMAR_EXPLANATION_JA_DELAY_MS ?? '500', 10) || 0
);
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

/** TOPIK 1〜6 のレッスンのみ */
function isTopik1to6Lesson(lessonId) {
  return /^ko_G[1-6]_/.test(String(lessonId ?? ''));
}

const SYSTEM_PROMPT = `You revise short Japanese glosses for Korean grammar patterns in a mobile learning app (UI locale: Japanese).

Task: For each item, output a polished Japanese string for the field "explanation". This is a concise meaning/usage label shown next to the Korean pattern (not a full lesson text).

Rules:
1. Keep it short—typically one phrase or a very short clause, suitable for a list/card (avoid long explanations).
2. Use the full-width wave dash ～ (U+FF5E) where a placeholder wave is needed. Do not mix ASCII ~ and ～ in the same string; prefer ～.
3. Natural, standard Japanese for Japanese learners of Korean. Appropriate for TOPIK levels 1–6.
4. Use the given "title" and "structure" (Korean grammar notation) to interpret the pattern; preserve the grammatical intent of the current "explanation" while improving clarity and consistency.
5. No labels like 「意味：」 or numbering. No Korean in "explanation" unless the original intentionally kept a minimal Korean fragment (normally avoid Korean here—Japanese only).
6. Trim whitespace; no leading/trailing line breaks.

Return ONLY valid JSON: {"results":[{"id":"<same id as input>","explanation":"..."}]}
The "results" array MUST have the SAME length and the SAME "id" values IN THE SAME ORDER as the input items.`;

/**
 * @param {{ id: string, lesson_id: string, title: string, structure: string, explanation: string }[]} items
 */
async function openaiExplanationBatch(items) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('Missing OPENAI_API_KEY (set in shell or .env / .env.local)');
    process.exit(1);
  }

  const body = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: MAX_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: stripUnsafeControlChars(SYSTEM_PROMPT) },
      {
        role: 'user',
        content: stripUnsafeControlChars(
          `Polish "explanation" for each item. Input JSON:\n${JSON.stringify({ items })}`
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

      if (results.length !== items.length) {
        throw new Error(`Expected ${items.length} results, got ${results.length}`);
      }
      for (let i = 0; i < items.length; i++) {
        if (results[i]?.id !== items[i].id) {
          throw new Error(
            `id mismatch at index ${i}: expected ${items[i].id}, got ${results[i]?.id}`
          );
        }
        if (typeof results[i]?.explanation !== 'string' || !String(results[i].explanation).trim()) {
          throw new Error(`Empty explanation at index ${i} for id ${items[i].id}`);
        }
      }
      return results.map((r) => String(r.explanation).trim());
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
  throw lastErr ?? new Error('openaiExplanationBatch failed');
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
    inputPath: rest[0]
      ? path.resolve(rest[0])
      : path.join(PROJECT_ROOT, 'scripts/grammar-for-app.json'),
    outputPath: rest[1]
      ? path.resolve(rest[1])
      : rest[0]
        ? path.resolve(rest[0])
        : path.join(PROJECT_ROOT, 'scripts/grammar-for-app.json'),
  };
}

async function main() {
  const { dryRun, inputPath, outputPath } = parseArgs(process.argv);

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(raw.items)) {
    console.error('Invalid grammar JSON: missing items[]');
    process.exit(1);
  }

  const toProcess = raw.items.filter(
    (it) =>
      it &&
      typeof it.id === 'string' &&
      isTopik1to6Lesson(it.lesson_id) &&
      typeof it.explanation === 'string'
  );

  console.error(`Model: ${MODEL}`);
  console.error(
    `TOPIK1–6 items to refresh: ${toProcess.length} (chunk ${CHUNK_SIZE}, delay ${DELAY_MS}ms)`
  );

  if (dryRun) {
    console.error('Dry run — no API calls.');
    console.error('Sample:', toProcess.slice(0, 3).map((i) => ({ id: i.id, title: i.title })));
    process.exit(0);
  }

  if (toProcess.length === 0) {
    console.error('No matching items.');
    process.exit(0);
  }

  const batches = chunkArray(toProcess, CHUNK_SIZE);
  /** @type {Map<string, string>} */
  const newExplanationById = new Map();

  let bi = 0;
  for (const batch of batches) {
    bi += 1;
    const payload = batch.map((it) => ({
      id: it.id,
      lesson_id: it.lesson_id,
      title: it.title,
      structure: it.structure,
      explanation: it.explanation,
    }));
    console.error(`Batch ${bi}/${batches.length} (${payload.length} items)...`);
    const outs = await openaiExplanationBatch(payload);
    for (let i = 0; i < batch.length; i++) {
      newExplanationById.set(batch[i].id, outs[i]);
    }
    if (DELAY_MS > 0 && bi < batches.length) await sleep(DELAY_MS);
  }

  let updated = 0;
  for (const item of raw.items) {
    if (typeof item?.id !== 'string') continue;
    const next = newExplanationById.get(item.id);
    if (next === undefined) continue;
    if (item.explanation !== next) updated += 1;
    item.explanation = next;
  }

  const out = JSON.stringify(raw, null, 2) + '\n';

  if (path.resolve(inputPath) === path.resolve(outputPath)) {
    const bak = `${inputPath}.bak-${Date.now()}`;
    fs.copyFileSync(inputPath, bak);
    console.error(`Backup: ${path.relative(PROJECT_ROOT, bak)}`);
  }

  fs.writeFileSync(outputPath, out, 'utf8');
  console.error(
    `Wrote ${path.relative(PROJECT_ROOT, outputPath)} (explanation changed on ${updated} / ${toProcess.length} items)`
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
