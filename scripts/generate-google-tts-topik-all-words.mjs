#!/usr/bin/env node
/**
 * TOPIK 全レベル単語・例文を Google TTS で生成し、
 * 既存 manifest にマージする（文法・ハングルパズル音節は別スクリプトで追記）。
 *
 * 一括フル生成（npm run tts:topik1:full:*）の順序は
 * 文法 → 本スクリプト（語彙）→ ハングル音節。
 * 語彙のみ＋ハングルは tts:words:all:* を使う。
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
const WORD_DIR = path.join(OUT_DIR, 'word');
const EXAMPLE_DIR = path.join(OUT_DIR, 'example');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const REMOTE_PREFIX = `tts/ko/${targetKey}`;
const WORDS_DIR = path.resolve(PROJECT_ROOT, 'out/ko_ja_words_glosses');

const dryRun = process.argv.includes('--dry-run');
const forceRegenerate = process.env.TTS_FORCE_REGENERATE === '1';
const wordEnding = process.env.TTS_WORD_ENDING ?? '.';
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'ko-KR-Neural2-A';
const wordSpeakingRate = parseFloat(process.env.GOOGLE_TTS_WORD_SPEAKING_RATE ?? '0.88');
const exampleSpeakingRate = parseFloat(process.env.GOOGLE_TTS_EXAMPLE_SPEAKING_RATE ?? '1.0');
const levelsCsv = process.env.TTS_WORD_LEVELS?.trim() || '1,2,3,4,5,6';
const levels = levelsCsv.split(',').map((s) => s.trim()).filter(Boolean);
const perRequestDelayMs = Number.parseInt(process.env.TTS_DELAY_MS ?? '25', 10);
/** 進捗を stderr に出す間隔（0 で無効） */
const progressEvery = Number.parseInt(process.env.TTS_PROGRESS_EVERY ?? '50', 10);

function progressLog(msg) {
  console.error(`[TTS words ${targetKey}] ${msg}`);
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

function makeAudioId(sourceType, text) {
  return createHash('sha1')
    .update(`google-tts:${voiceName}:${sourceType}:${text}`)
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

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function uniqueTargets(targets) {
  const seen = new Set();
  const out = [];
  for (const t of targets) {
    const key = `${t.sourceType}:${t.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

let client = null;
function getClient() {
  if (!client) {
    // デフォルト 300s で DEADLINE_EXCEEDED になりやすいので延長
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

async function synthesizeGoogle(text, sourceType) {
  const ttsText = sourceType === 'word' ? (/[.!?。]$/.test(text) ? text : `${text}${wordEnding}`) : text;
  const rate = sourceType === 'word' ? wordSpeakingRate : exampleSpeakingRate;
  const [response] = await getClient().synthesizeSpeech({
    input: { text: ttsText },
    voice: { languageCode: 'ko-KR', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
  });
  if (!response.audioContent) throw new Error('Google TTS returned empty audioContent');
  return Buffer.from(response.audioContent);
}

async function synthesizeWithRetry(text, sourceType, retries = 5) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await synthesizeGoogle(text, sourceType);
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }
  throw lastError ?? new Error('TTS synth failed');
}

async function collectTargets() {
  const all = [];
  for (const lv of levels) {
    const p = path.join(WORDS_DIR, `words_level${lv}.json`);
    if (!(await fileExists(p))) continue;
    const words = await loadJson(p);
    if (!Array.isArray(words)) continue;
    for (const w of words) {
      const wordText = normalizeText(w?.korean);
      const exampleText = normalizeText(w?.example?.korean);
      if (wordText) {
        all.push({
          sourceType: 'word',
          sourceId: String(w?.id ?? ''),
          lessonId: String(w?.lesson_id ?? ''),
          text: wordText,
        });
      }
      if (exampleText) {
        all.push({
          sourceType: 'example',
          sourceId: `${String(w?.id ?? '')}:example`,
          lessonId: String(w?.lesson_id ?? ''),
          text: exampleText,
        });
      }
    }
  }
  return uniqueTargets(all);
}

function mergeItems(existingItems, wordItems) {
  const map = new Map();
  for (const item of existingItems) {
    if (!item?.sourceType || !item?.text || !item?.file) continue;
    map.set(`${item.sourceType}:${normalizeText(item.text)}`, item);
  }
  for (const item of wordItems) {
    map.set(`${item.sourceType}:${normalizeText(item.text)}`, item);
  }
  return Array.from(map.values());
}

async function main() {
  loadEnvFromProjectRoot();
  await mkdir(WORD_DIR, { recursive: true });
  await mkdir(EXAMPLE_DIR, { recursive: true });

  const targets = await collectTargets();
  if (targets.length === 0) throw new Error('No word targets found');

  let generated = 0;
  let skipped = 0;
  const wordItems = [];

  progressLog(`start targets=${targets.length} voice=${voiceName} levels=${levelsCsv}`);

  let i = 0;
  for (const t of targets) {
    i += 1;
    const id = makeAudioId(t.sourceType, t.text);
    const fileName = `${id}.mp3`;
    const localDir = t.sourceType === 'word' ? WORD_DIR : EXAMPLE_DIR;
    const outPath = path.join(localDir, fileName);
    const exists = await fileExists(outPath);

    if (exists && !forceRegenerate) {
      skipped += 1;
    } else if (!dryRun) {
      const bytes = await synthesizeWithRetry(t.text, t.sourceType, 5);
      await writeFile(outPath, bytes);
      generated += 1;
      if (perRequestDelayMs > 0) await new Promise((r) => setTimeout(r, perRequestDelayMs));
    } else {
      generated += 1;
    }

    if (progressEvery > 0 && (i % progressEvery === 0 || i === targets.length)) {
      progressLog(`progress ${i}/${targets.length} generated=${generated} skipped=${skipped}`);
    }

    wordItems.push({
      sourceType: t.sourceType,
      text: t.text,
      file: `${REMOTE_PREFIX}/${t.sourceType}/${fileName}`,
    });
  }

  let existing = { items: [] };
  if (await fileExists(MANIFEST_PATH)) {
    existing = await loadJson(MANIFEST_PATH);
  }
  const mergedItems = mergeItems(Array.isArray(existing?.items) ? existing.items : [], wordItems);
  const manifest = {
    ...existing,
    scope: existing?.scope || 'topik_words_and_examples',
    lessonRange: `ko_W1_*..ko_W6_* (${levelsCsv})`,
    sourcePath: 'out/ko_ja_words_glosses/words_level*.json + existing manifest',
    ttsProvider: 'google-cloud',
    voiceName,
    total: mergedItems.length,
    items: mergedItems,
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest));

  progressLog(
    `done targets=${targets.length} generated=${generated} skipped=${skipped} dryRun=${dryRun} manifestItems=${manifest.total}`
  );
  console.log(
    `Done all words. targets=${targets.length}, generated=${generated}, skipped=${skipped}, dryRun=${dryRun}, levels=${levelsCsv}`
  );
  console.log(`Manifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
