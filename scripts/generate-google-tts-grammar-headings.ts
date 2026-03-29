#!/usr/bin/env npx tsx
/**
 * 文法「見出し」だけを Google Cloud TTS で生成し、`tts/ko/grammar_headings`（または TTS_TARGET_KEY）用の manifest + mp3 を書く。
 * 読みテキストは `src/utils/grammarHeadingSpeech.ts` の `computeGrammarHeadingSpeechText` と完全一致させる。
 *
 * 環境変数:
 *   TTS_GRAMMAR_LEVELS=1,2,3,4,5,6
 *   TTS_GRAMMAR_LESSON_PREFIX=ko_G1_
 *   TTS_ONLY_LESSON_ID=ko_G1_02
 *   TTS_TARGET_KEY=grammar_headings | grammar_headings_male（既定: grammar_headings）
 *   GRAMMAR_READINGS_FILE=out/grammar_title_speak.json（任意・byId オーバーレイ）
 *   GOOGLE_TTS_VOICE=ko-KR-Neural2-A
 *   TTS_FORCE_REGENERATE=1
 *   TTS_PROGRESS_EVERY=5
 *   TTS_DELAY_MS=80
 *   --dry-run
 */
import { readFileSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { computeGrammarHeadingSpeechText } from '../src/utils/grammarHeadingSpeech';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

const targetKey = process.env.TTS_TARGET_KEY?.trim() || 'grammar_headings';
const OUT_DIR = path.resolve(PROJECT_ROOT, `generated/audio/google-tts/ko/${targetKey}`);
const EXAMPLE_DIR = path.join(OUT_DIR, 'example');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const REMOTE_PREFIX = `tts/ko/${targetKey}`;
const GRAMMAR_PATH = path.resolve(PROJECT_ROOT, 'out/grammar-ko_en.json');
const READINGS_PATH = path.resolve(
  PROJECT_ROOT,
  process.env.GRAMMAR_READINGS_FILE?.trim() || 'out/grammar_title_speak.json'
);

const dryRun = process.argv.includes('--dry-run');
const forceRegenerate = process.env.TTS_FORCE_REGENERATE === '1';
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'ko-KR-Neural2-A';
const headingSpeakingRate = parseFloat(process.env.GOOGLE_TTS_HEADING_SPEAKING_RATE ?? '1.0');
const legacyLessonPrefix = process.env.TTS_GRAMMAR_LESSON_PREFIX?.trim();
const levelsCsv = process.env.TTS_GRAMMAR_LEVELS?.trim() || '1,2,3,4,5,6';
const grammarLevels = new Set(
  levelsCsv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 1)
);
const onlyLessonId = process.env.TTS_ONLY_LESSON_ID?.trim();
const progressEvery = Number.parseInt(process.env.TTS_PROGRESS_EVERY ?? '5', 10);
const perRequestDelayMs = Number.parseInt(process.env.TTS_DELAY_MS ?? '80', 10);

function grammarHeadingsLog(msg: string) {
  console.error(`[TTS grammar_headings ${targetKey}] ${msg}`);
}

function formatDuration(totalSec: number) {
  if (totalSec < 60) return `${Math.round(totalSec)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}m ${s}s`;
}

function truncateForLog(text: string, max = 48) {
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
      /* ignore */
    }
  }
}

function describeGrammarFilter() {
  if (onlyLessonId) return onlyLessonId;
  if (legacyLessonPrefix) return `${legacyLessonPrefix}*`;
  const sorted = [...grammarLevels].sort((a, b) => a - b);
  return `ko_G{${sorted.join(',')}}_*`;
}

function matchesLesson(lessonId: unknown) {
  const id = String(lessonId ?? '');
  if (onlyLessonId) return id === onlyLessonId;
  if (legacyLessonPrefix) return id.startsWith(legacyLessonPrefix);
  const m = id.match(/^ko_G(\d+)_/);
  if (!m) return false;
  return grammarLevels.has(parseInt(m[1], 10));
}

function audioIdForHeading(grammarId: string, text: string) {
  return createHash('sha1')
    .update(`google-tts:${voiceName}:grammar_heading:${grammarId}:${text}`)
    .digest('hex')
    .slice(0, 16);
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

let client: TextToSpeechClient | null = null;
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

async function synthesizeGoogle(text: string) {
  const [response] = await getClient().synthesizeSpeech({
    input: { text },
    voice: { languageCode: 'ko-KR', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: headingSpeakingRate },
  });
  if (!response.audioContent) throw new Error('Google TTS returned empty audioContent');
  return Buffer.from(response.audioContent);
}

async function synthesizeWithRetry(text: string, retries = 5) {
  let lastError: unknown = null;
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

async function loadJson(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
}

async function loadReadingsById(): Promise<Record<string, string>> {
  try {
    const raw = await loadJson(READINGS_PATH);
    const byId = raw?.byId as Record<string, string> | undefined;
    if (byId && typeof byId === 'object') return byId;
  } catch {
    /* optional */
  }
  return {};
}

async function main() {
  loadEnvFromProjectRoot();
  await mkdir(EXAMPLE_DIR, { recursive: true });

  const grammar = await loadJson(GRAMMAR_PATH);
  const grammarItems = Array.isArray(grammar?.items) ? (grammar.items as Record<string, unknown>[]) : [];
  const readingsById = await loadReadingsById();

  const targets: { grammarId: string; lessonId: string; text: string }[] = [];
  for (const g of grammarItems) {
    if (!matchesLesson(g?.lesson_id)) continue;
    const gid = String(g?.id ?? '');
    if (!gid) continue;
    const text = computeGrammarHeadingSpeechText(
      {
        id: gid,
        title_speak: g.title_speak as string | undefined,
        title: g.title as string | undefined,
        structure: g.structure as string | undefined,
      },
      readingsById
    );
    if (!text) continue;
    targets.push({
      grammarId: gid,
      lessonId: String(g?.lesson_id ?? ''),
      text,
    });
  }

  if (targets.length === 0) {
    throw new Error(
      `No grammar heading targets for ${describeGrammarFilter()} in ${path.relative(PROJECT_ROOT, GRAMMAR_PATH)}`
    );
  }

  let manifest: Record<string, unknown> = {
    scope: 'grammar_headings',
    sourcePath: 'out/grammar-ko_en.json + optional readings overlay',
    ttsProvider: 'google-cloud',
    voiceName,
    total: 0,
    items: [],
  };
  if (await fileExists(MANIFEST_PATH)) {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as Record<string, unknown>;
    if (!Array.isArray(manifest.items)) manifest.items = [];
  }

  let generated = 0;
  let skipped = 0;
  const startedAt = Date.now();

  grammarHeadingsLog(
    `start targets=${targets.length} voice=${voiceName} filter=${describeGrammarFilter()} dryRun=${dryRun} progressEvery=${progressEvery} readings=${path.relative(PROJECT_ROOT, READINGS_PATH)}`
  );

  const items = manifest.items as Record<string, unknown>[];
  let ti = 0;
  for (const t of targets) {
    ti += 1;
    const id = audioIdForHeading(t.grammarId, t.text);
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
      grammarId: t.grammarId,
      text: t.text,
      file: `${REMOTE_PREFIX}/example/${fileName}`,
    };

    const idx = items.findIndex((m) => m?.grammarId === t.grammarId);
    if (idx >= 0) items[idx] = nextItem;
    else items.push(nextItem);

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
      grammarHeadingsLog(
        `progress ${ti}/${targets.length} (${pct}%) synthWrites=${generated} fileSkipped=${skipped} elapsed=${formatDuration(elapsedSec)} eta≈${etaStr}`
      );
      if (progressEvery === 1) {
        grammarHeadingsLog(`  → ${t.grammarId} ${truncateForLog(t.text)}`);
      }
    }
  }

  manifest.scope = 'grammar_headings';
  manifest.sourcePath = `${path.relative(PROJECT_ROOT, GRAMMAR_PATH)} + ${path.relative(PROJECT_ROOT, READINGS_PATH)}`;
  manifest.ttsProvider = 'google-cloud';
  manifest.voiceName = voiceName;
  manifest.total = items.length;

  const totalElapsedSec = (Date.now() - startedAt) / 1000;

  if (!dryRun) {
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest));
  }

  grammarHeadingsLog(
    `done targets=${targets.length} synthWrites=${generated} fileSkipped=${skipped} totalTime=${formatDuration(totalElapsedSec)} manifestItems=${manifest.total} dryRun=${dryRun}`
  );
  console.log(
    `Done grammar headings (${describeGrammarFilter()}). targets=${targets.length}, synthWrites=${generated}, fileSkipped=${skipped}, dryRun=${dryRun}, totalTime=${formatDuration(totalElapsedSec)}`
  );
  if (!dryRun) {
    console.log(`Manifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
