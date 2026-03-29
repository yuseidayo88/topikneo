#!/usr/bin/env node
/**
 * 英語版 JSON（grammar-ko_en / words_level*.json）を各言語に翻訳して out に保存する。
 *
 * 前提: OPENAI_API_KEY（.env / .env.local 可）
 *
 * 使い方:
 *   TARGET_LANG=zh node scripts/translate-content-en-to-locale.mjs
 *   TARGET_LANG=vi node scripts/translate-content-en-to-locale.mjs
 *
 * 環境変数:
 *   TARGET_LANG     必須: zh | vi | es | id | th
 *   GRAMMAR_IN      既定: ./out/grammar-ko_en.json
 *   WORDS_DIR       既定: ./out  （words_level1.json … words_level6.json）
 *   OUT_DIR         既定: ./out/content-locales/<ko_xx>/
 *   GRAMMAR_ONLY=1  文法のみ
 *   WORDS_ONLY=1    単語のみ
 *   WORDS_START_LEVEL=5  単語の開始レベル（既定 1）
 *   WORDS_END_LEVEL=6    単語の終了レベル（既定 6）
 *
 * Supabase アップロード先（content バケット）:
 *   grammar/ko_zh/grammar.json
 *   words/ko_zh/words_level{N}.json
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

const OPENAI_AGENT = new Agent({
  connectTimeout: 60_000,
  headersTimeout: Number(process.env.OPENAI_FETCH_HEADERS_MS) || 600_000,
  bodyTimeout: Number(process.env.OPENAI_FETCH_BODY_MS) || 600_000,
});

const TARGET_TO_LOCALE = {
  zh: 'ko_zh',
  vi: 'ko_vi',
  es: 'ko_es',
  id: 'ko_id',
  th: 'ko_th',
};

const TARGET_LABEL = {
  zh: 'Simplified Chinese (简体中文)',
  vi: 'Vietnamese',
  es: 'Spanish',
  id: 'Indonesian',
  th: 'Thai',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function grammarPrompts(targetLang) {
  const L = TARGET_LABEL[targetLang];
  return {
    items: `You translate the "items" array for a Korean learning app: English explanations → natural ${L} for learners.
Return ONLY valid JSON with a single top-level key "items" (array). Same length as input.
Do NOT change: id, lesson_id, title/structure when they are Korean (Hangul). Do NOT change korean in examples.
Translate: explanation, example.translation. Translate title/structure only if they are English (not pure Korean).`,
    quizItems: `You translate "quizItems" for a Korean grammar app: English → ${L} in translation fields.
Return ONLY JSON with top-level key "quizItems" only. Same array length and same ids as input.
Do NOT change Korean fields (korean, answer if Hangul).`,
    reorderItems: `You translate "reorderItems" hints: English → ${L}.
Return ONLY JSON with top-level key "reorderItems" only. Same array length and ids. Do NOT change "chunks" (Korean).`,
    lessonSummaries: `You translate "lessonSummaries" values English → ${L}. Keys (lesson ids) unchanged.
Return ONLY JSON with top-level key "lessonSummaries" only.`,
  };
}

function wordsChunkPrompt(targetLang) {
  const L = TARGET_LABEL[targetLang];
  return `You translate a "items" array for a Korean vocabulary app: English glosses → ${L} glosses.
Return ONLY valid JSON with a single top-level key "items" (array). Same length as input.
Rules:
- Do NOT change: id, language, korean, reading, topik_level, lesson_id, frequency_rank (if present).
- Translate the "japanese" field to ${L} (keep key name "japanese" unchanged).
- For example.japanese, translate to ${L}. Keep example.korean unchanged.
- Preserve JSON number types.`;
}

async function translateGrammarChunked(input, contentLocale, targetLang, checkpointDir = null) {
  const SYS = grammarPrompts(targetLang);
  const nItems = Number(process.env.GRAMMAR_ITEMS_CHUNK_SIZE) || 6;
  const nQuiz = Number(process.env.GRAMMAR_QUIZ_CHUNK_SIZE) || 10;
  const nReorder = Number(process.env.GRAMMAR_REORDER_CHUNK_SIZE) || 10;

  const out = {
    locale: contentLocale,
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
      system: SYS.items,
      user: `Translate this JSON object.\n\n${JSON.stringify({ items: slice })}`,
    });
    if (!Array.isArray(r.items) || r.items.length !== slice.length) {
      throw new Error(`items chunk ${c}: expected ${slice.length} items, got ${r.items?.length}`);
    }
    out.items.push(...r.items);
    if (checkpointDir) {
      try {
        fs.mkdirSync(checkpointDir, { recursive: true });
        fs.writeFileSync(
          path.join(checkpointDir, '.grammar-items-checkpoint.json'),
          `${JSON.stringify({ locale: contentLocale, items: out.items }, null, 2)}\n`,
          'utf8'
        );
      } catch (_e) {
        /* チェックポイント失敗は無視 */
      }
    }
  }

  if (input.lessonSummaries && typeof input.lessonSummaries === 'object') {
    const keys = Object.keys(input.lessonSummaries);
    if (keys.length > 0) {
      console.error(`  lessonSummaries (${keys.length} keys)`);
      const r = await openaiJsonTranslate({
        system: SYS.lessonSummaries,
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
      system: SYS.quizItems,
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
      system: SYS.reorderItems,
      user: JSON.stringify({ reorderItems: slice }),
    });
    if (!Array.isArray(r.reorderItems) || r.reorderItems.length !== slice.length) {
      throw new Error(`reorderItems chunk ${c}: length mismatch`);
    }
    out.reorderItems.push(...r.reorderItems);
  }

  return out;
}

async function translateWordsChunked(arr, targetLang) {
  if (!Array.isArray(arr)) throw new Error('words: expected JSON array');
  const size = Number(process.env.WORDS_CHUNK_SIZE) || 35;
  const chunks = chunkArray(arr, size);
  const SYS = wordsChunkPrompt(targetLang);
  const out = [];
  for (let c = 0; c < chunks.length; c++) {
    const slice = chunks[c];
    console.error(`  words chunk ${c + 1}/${chunks.length} (${slice.length} items)`);
    const r = await openaiJsonTranslate({
      system: SYS,
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
  const targetLang = process.env.TARGET_LANG;
  if (!targetLang || !TARGET_TO_LOCALE[targetLang]) {
    console.error('Set TARGET_LANG to one of: zh, vi, es, id, th');
    process.exit(1);
  }
  const contentLocale = TARGET_TO_LOCALE[targetLang];
  const grammarIn = path.resolve(PROJECT_ROOT, process.env.GRAMMAR_IN || 'out/grammar-ko_en.json');
  const wordsDir = path.resolve(PROJECT_ROOT, process.env.WORDS_DIR || 'out');
  const outDir = path.resolve(
    PROJECT_ROOT,
    process.env.OUT_DIR || path.join('out', 'content-locales', contentLocale)
  );

  const grammarOnly = process.env.GRAMMAR_ONLY === '1' || process.env.GRAMMAR_ONLY === 'true';
  const wordsOnly = process.env.WORDS_ONLY === '1' || process.env.WORDS_ONLY === 'true';

  fs.mkdirSync(outDir, { recursive: true });

  if (!wordsOnly) {
    if (!fs.existsSync(grammarIn)) {
      console.error(`Grammar input not found: ${grammarIn}`);
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(grammarIn, 'utf8'));
    console.error(`Translating grammar → ${contentLocale} (${TARGET_LABEL[targetLang]}) with ${MODEL}...`);
    const checkpointDir =
      process.env.GRAMMAR_CHECKPOINT === '0' || process.env.GRAMMAR_CHECKPOINT === 'false'
        ? null
        : outDir;
    const out = await translateGrammarChunked(raw, contentLocale, targetLang, checkpointDir);
    const gPath = path.join(outDir, 'grammar.json');
    fs.writeFileSync(gPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    console.error(`Wrote ${gPath}`);
  }

  if (!grammarOnly) {
    const startLevel = Math.max(1, Math.min(6, Number(process.env.WORDS_START_LEVEL) || 1));
    const endLevel = Math.max(startLevel, Math.min(6, Number(process.env.WORDS_END_LEVEL) || 6));
    for (let level = startLevel; level <= endLevel; level++) {
      const wp = path.join(wordsDir, `words_level${level}.json`);
      if (!fs.existsSync(wp)) {
        console.error(`Skip missing: ${wp}`);
        continue;
      }
      const arr = JSON.parse(fs.readFileSync(wp, 'utf8'));
      console.error(`Translating words level ${level} → ${contentLocale}...`);
      const out = await translateWordsChunked(arr, targetLang);
      const dest = path.join(outDir, `words_level${level}.json`);
      fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
      console.error(`Wrote ${dest}`);
    }
  }

  console.error(`Done. Upload folder to Supabase: content/grammar/${contentLocale}/grammar.json and content/words/${contentLocale}/words_levelN.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
