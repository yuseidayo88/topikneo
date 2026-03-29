#!/usr/bin/env node
/**
 * TOPIK 文法（既定: lesson_id が ko_G1_〜ko_G6_）の
 * - 例文
 * - 並び替えクイズ正解文
 * を Google Cloud TTS で生成し、既存 topik1 manifest に追記する。
 * （見出しは `generate-google-tts-grammar-headings.ts` で `tts/ko/grammar_headings` に出力）
 *
 * 環境変数:
 *   TTS_GRAMMAR_LEVELS=1,2,3,4,5,6   既定: 1〜6（ko_G1_〜ko_G6_）
 *   TTS_GRAMMAR_LESSON_PREFIX=ko_G1_  指定時はレベル指定より優先（従来互換）
 *   TTS_ONLY_LESSON_ID=ko_G1_02        1レッスンのみ（任意）
 *   TTS_TARGET_KEY=topik1 | topik1_male
 *   GOOGLE_TTS_VOICE=ko-KR-Neural2-A
 *   TTS_FORCE_REGENERATE=1
 *   TTS_PROGRESS_EVERY=5   進捗ログの間隔（1=毎件＋テキスト抜粋、stderr）
 *   TTS_DELAY_MS=80        合成リクエスト間の待機（ms）
 *   --dry-run               manifest / mp3 は書かない（進捗ログのみ）
 */
import { readFileSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

const targetKey = process.env.TTS_TARGET_KEY?.trim() || 'topik1';
const OUT_DIR = path.resolve(PROJECT_ROOT, `generated/audio/google-tts/ko/${targetKey}`);
const EXAMPLE_DIR = path.join(OUT_DIR, 'example');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const REMOTE_PREFIX = `tts/ko/${targetKey}`;
const GRAMMAR_PATH = path.resolve(PROJECT_ROOT, 'out/grammar-ko_en.json');

const dryRun = process.argv.includes('--dry-run');
const forceRegenerate = process.env.TTS_FORCE_REGENERATE === '1';
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'ko-KR-Neural2-A';
const exampleSpeakingRate = parseFloat(process.env.GOOGLE_TTS_EXAMPLE_SPEAKING_RATE ?? '1.0');
const legacyLessonPrefix = process.env.TTS_GRAMMAR_LESSON_PREFIX?.trim();
const levelsCsv = process.env.TTS_GRAMMAR_LEVELS?.trim() || '1,2,3,4,5,6';
const grammarLevels = new Set(
  levelsCsv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 1)
);
const onlyLessonId = process.env.TTS_ONLY_LESSON_ID?.trim();
/** 進捗ログの間隔（1 なら毎件。既定は文法件数が少ないので 5） */
const progressEvery = Number.parseInt(process.env.TTS_PROGRESS_EVERY ?? '5', 10);
const perRequestDelayMs = Number.parseInt(process.env.TTS_DELAY_MS ?? '80', 10);

function grammarProgressLog(msg) {
  console.error(`[TTS grammar ${targetKey}] ${msg}`);
}

function formatDuration(totalSec) {
  if (totalSec < 60) return `${Math.round(totalSec)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}m ${s}s`;
}

function truncateForLog(text, max = 48) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function loadEnvFromProjectRoot() {
  for (const name of ['.env', '.env.local']) {
    const p = path.join(PROJECT_ROOT, name);
    try {
      const text = readFileSync(p, 'utf8');
      for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq <= 0) continue;
        const key = t.slice(0, eq).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        let val = t.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    } catch {
      // ignore
    }
  }
}

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function describeGrammarFilter() {
  if (onlyLessonId) return onlyLessonId;
  if (legacyLessonPrefix) return `${legacyLessonPrefix}*`;
  const sorted = [...grammarLevels].sort((a, b) => a - b);
  return `ko_G{${sorted.join(',')}}_*`;
}

function matchesLesson(lessonId) {
  const id = String(lessonId ?? '');
  if (onlyLessonId) return id === onlyLessonId;
  if (legacyLessonPrefix) return id.startsWith(legacyLessonPrefix);
  const m = id.match(/^ko_G(\d+)_/);
  if (!m) return false;
  return grammarLevels.has(parseInt(m[1], 10));
}

function makeSentence(chunks) {
  const parts = Array.isArray(chunks) ? chunks.map((c) => normalizeText(c)).filter(Boolean) : [];
  if (parts.length === 0) return '';
  const s = parts.join(' ');
  return /[.!?。]$/.test(s) ? s : `${s}.`;
}

function audioId(text) {
  return createHash('sha1')
    .update(`google-tts:${voiceName}:example:${text}`)
    .digest('hex')
    .slice(0, 16);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

let client = null;
function getClient() {
  if (!client) {
    client = new TextToSpeechClient({
      clientConfig: {
        interfaces: {
          'google.cloud.texttospeech.v1.TextToSpeech': {
            methods: {
              SynthesizeSpeech: {
                timeout_millis: 600000,
              },
            },
          },
        },
      },
    });
  }
  return client;
}

async function synthesizeGoogle(text) {
  const [response] = await getClient().synthesizeSpeech({
    input: { text },
    voice: { languageCode: 'ko-KR', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: exampleSpeakingRate },
  });
  if (!response.audioContent) throw new Error('Google TTS returned empty audioContent');
  return Buffer.from(response.audioContent);
}

async function synthesizeWithRetry(text, retries = 5) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await synthesizeGoogle(text);
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }
  throw lastError ?? new Error('TTS synth failed');
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function uniqueByText(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = normalizeText(item.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function main() {
  loadEnvFromProjectRoot();
  await mkdir(EXAMPLE_DIR, { recursive: true });

  const grammar = await loadJson(GRAMMAR_PATH);
  const grammarItems = Array.isArray(grammar?.items) ? grammar.items : [];
  const reorderItems = Array.isArray(grammar?.reorderItems) ? grammar.reorderItems : [];

  const lessonGrammarTargets = grammarItems
    .filter((g) => matchesLesson(g?.lesson_id))
    .flatMap((g) => {
      const lid = String(g?.lesson_id ?? '');
      const list = [];
      const examples = Array.isArray(g?.examples) ? g.examples : [];
      for (let i = 0; i < examples.length; i += 1) {
        const ex = normalizeText(examples[i]?.korean);
        if (!ex) continue;
        list.push({
          sourceType: 'example',
          sourceId: `grammar:${g.id}:example:${i + 1}`,
          lessonId: lid,
          text: ex,
        });
      }
      return list;
    });

  const reorderTargets = reorderItems
    .filter((r) => matchesLesson(r?.lesson_id))
    .map((r) => ({
      sourceType: 'example',
      sourceId: `grammar:${r.id}`,
      lessonId: String(r?.lesson_id ?? ''),
      text: makeSentence(r.chunks),
    }));

  const targets = uniqueByText([...lessonGrammarTargets, ...reorderTargets].filter((r) => r.text));

  if (targets.length === 0) {
    throw new Error(
      `No grammar targets for ${describeGrammarFilter()} in ${path.relative(PROJECT_ROOT, GRAMMAR_PATH)}`
    );
  }

  let manifest = {
    scope: 'topik1_words_and_examples',
    lessonRange: 'ko_W1_* + ko_G1..G6 grammar',
    sourcePath: 'mixed(words + grammar-ko_en)',
    ttsProvider: 'google-cloud',
    voiceName,
    total: 0,
    items: [],
  };
  if (await fileExists(MANIFEST_PATH)) {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    if (!Array.isArray(manifest.items)) manifest.items = [];
  }

  let generated = 0;
  let skipped = 0;
  const startedAt = Date.now();

  grammarProgressLog(
    `start targets=${targets.length} voice=${voiceName} filter=${describeGrammarFilter()} dryRun=${dryRun} progressEvery=${progressEvery}`
  );

  let ti = 0;
  for (const t of targets) {
    ti += 1;
    const id = audioId(t.text);
    const fileName = `${id}.mp3`;
    const outPath = path.join(EXAMPLE_DIR, fileName);
    const exists = await fileExists(outPath);

    if (exists && !forceRegenerate) {
      skipped += 1;
    } else if (!dryRun) {
      const bytes = await synthesizeWithRetry(t.text, 5);
      await writeFile(outPath, bytes);
      generated += 1;
      if (perRequestDelayMs > 0) await new Promise((r) => setTimeout(r, perRequestDelayMs));
    } else {
      generated += 1;
    }

    const nextItem = {
      sourceType: 'example',
      text: t.text,
      file: `${REMOTE_PREFIX}/example/${fileName}`,
    };

    const idx = manifest.items.findIndex(
      (m) => m?.sourceType === 'example' && normalizeText(m?.text) === normalizeText(t.text)
    );
    if (idx >= 0) manifest.items[idx] = nextItem;
    else manifest.items.push(nextItem);

    const elapsedSec = (Date.now() - startedAt) / 1000;
    const pct = ((ti / targets.length) * 100).toFixed(1);
    let etaStr = '—';
    if (ti > 0 && ti < targets.length) {
      const secPerItem = elapsedSec / ti;
      etaStr = formatDuration(secPerItem * (targets.length - ti));
    } else if (ti >= targets.length) {
      etaStr = '0s';
    }

    const shouldLog =
      progressEvery > 0 &&
      (ti === 1 || ti === targets.length || ti % progressEvery === 0 || progressEvery === 1);

    if (shouldLog) {
      grammarProgressLog(
        `progress ${ti}/${targets.length} (${pct}%) synthWrites=${generated} fileSkipped=${skipped} elapsed=${formatDuration(elapsedSec)} eta≈${etaStr}`
      );
      if (progressEvery === 1) {
        grammarProgressLog(`  → ${truncateForLog(t.text)}`);
      }
    }
  }

  manifest.scope = manifest.scope || 'topik1_words_and_examples';
  manifest.lessonRange = `${manifest.lessonRange ?? 'ko_W1_*'} + ${onlyLessonId || `${describeGrammarFilter()} grammar`}`;
  manifest.sourcePath = 'out/grammar-ko_en.json + existing topik1 manifest';
  manifest.ttsProvider = 'google-cloud';
  manifest.voiceName = voiceName;
  manifest.total = manifest.items.length;

  const totalElapsedSec = (Date.now() - startedAt) / 1000;

  if (!dryRun) {
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest));
  }

  grammarProgressLog(
    `done targets=${targets.length} synthWrites=${generated} fileSkipped=${skipped} totalTime=${formatDuration(totalElapsedSec)} manifestItems=${manifest.total} dryRun=${dryRun}`
  );
  console.log(
    `Done grammar (${describeGrammarFilter()}). targets=${targets.length}, synthWrites=${generated}, fileSkipped=${skipped}, dryRun=${dryRun}, totalTime=${formatDuration(totalElapsedSec)}`
  );
  if (!dryRun) {
    console.log(`Manifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
