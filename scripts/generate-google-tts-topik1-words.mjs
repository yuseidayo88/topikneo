#!/usr/bin/env node
/**
 * TOPIK1 単語・例文を Google Cloud Text-to-Speech で MP3 化する。
 *
 * 前提:
 *   - GCP で Text-to-Speech API を有効化
 *   - サービスアカウント JSON を用意し、GOOGLE_APPLICATION_CREDENTIALS にパスを設定
 *
 * 任意環境変数:
 *   TTS_ONLY_LESSON_ID=ko_W1_01   レッスン1のみなど
 *   TTS_FORCE_REGENERATE=1        既存 mp3 を上書き
 *   TTS_WORD_ENDING=.             単語用に末尾へ付与（未設定時は .）
 *   GOOGLE_TTS_VOICE=ko-KR-Neural2-C
 *   GOOGLE_TTS_WORD_SPEAKING_RATE=0.88
 *   GOOGLE_TTS_EXAMPLE_SPEAKING_RATE=1.0
 */
import { readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
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
const WORDS_PATH_PRIMARY = path.resolve(PROJECT_ROOT, 'out/ko_ja_words_glosses/words_level1.json');
const WORDS_PATH_FALLBACK = path.resolve(PROJECT_ROOT, 'assets/data/ko/words_level1.json');

const dryRun = process.argv.includes('--dry-run');
const onlyLessonId = process.env.TTS_ONLY_LESSON_ID?.trim();
const lessonIdsCsv = process.env.TTS_LESSON_IDS?.trim();
const lessonIds = lessonIdsCsv
  ? new Set(
      lessonIdsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  : null;
const forceRegenerate = process.env.TTS_FORCE_REGENERATE === '1';
const wordEnding = process.env.TTS_WORD_ENDING ?? '.';
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'ko-KR-Neural2-C';
const wordSpeakingRate = parseFloat(process.env.GOOGLE_TTS_WORD_SPEAKING_RATE ?? '0.88');
const exampleSpeakingRate = parseFloat(process.env.GOOGLE_TTS_EXAMPLE_SPEAKING_RATE ?? '1.0');

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

loadEnvFromProjectRoot();

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function audioId(sourceType, text) {
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
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function resolveWordsPath() {
  if (await fileExists(WORDS_PATH_PRIMARY)) return WORDS_PATH_PRIMARY;
  return WORDS_PATH_FALLBACK;
}

function collectTargets(words) {
  const targets = [];
  for (const w of words) {
    if (w?.topik_level !== 1) continue;
    if (!String(w?.lesson_id ?? '').startsWith('ko_W1_')) continue;
    if (onlyLessonId && String(w.lesson_id) !== onlyLessonId) continue;
    if (lessonIds && !lessonIds.has(String(w.lesson_id))) continue;
    const wordText = normalizeText(w?.korean);
    const exampleText = normalizeText(w?.example?.korean);
    if (wordText) {
      targets.push({
        sourceType: 'word',
        sourceId: w.id,
        lessonId: w.lesson_id,
        text: wordText,
      });
    }
    if (exampleText) {
      targets.push({
        sourceType: 'example',
        sourceId: `${w.id}:example`,
        lessonId: w.lesson_id,
        text: exampleText,
      });
    }
  }
  return targets;
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
  if (!client) client = new TextToSpeechClient();
  return client;
}

async function synthesizeGoogle(text, sourceType) {
  const ttsText =
    sourceType === 'word'
      ? (/[.!?。]$/.test(text) ? text : `${text}${wordEnding}`)
      : text;
  const rate = sourceType === 'word' ? wordSpeakingRate : exampleSpeakingRate;
  const [response] = await getClient().synthesizeSpeech({
    input: { text: ttsText },
    voice: {
      languageCode: 'ko-KR',
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: rate,
    },
  });
  if (!response.audioContent) {
    throw new Error('Google TTS returned empty audioContent');
  }
  return Buffer.from(response.audioContent);
}

async function main() {
  // ADC は GOOGLE_APPLICATION_CREDENTIALS 以外に
  // `gcloud auth application-default login` で作成した
  // ~/.config/gcloud/application_default_credentials.json も利用可能。

  await mkdir(WORD_DIR, { recursive: true });
  await mkdir(EXAMPLE_DIR, { recursive: true });

  const wordsPath = await resolveWordsPath();
  const words = await loadJson(wordsPath);
  const targets = uniqueTargets(collectTargets(words));

  let generated = 0;
  let skipped = 0;
  const items = [];

  for (const t of targets) {
    const id = audioId(t.sourceType, t.text);
    const fileName = `${id}.mp3`;
    const localDir = t.sourceType === 'word' ? WORD_DIR : EXAMPLE_DIR;
    const outPath = path.join(localDir, fileName);
    const exists = await fileExists(outPath);

    if (exists && !forceRegenerate) {
      skipped += 1;
    } else if (!dryRun) {
      const bytes = await synthesizeGoogle(t.text, t.sourceType);
      await writeFile(outPath, bytes);
      generated += 1;
      await new Promise((r) => setTimeout(r, 80));
    } else {
      generated += 1;
    }

    items.push({
      sourceType: t.sourceType,
      text: t.text,
      file: `${REMOTE_PREFIX}/${t.sourceType}/${fileName}`,
    });
  }

  const manifest = {
    scope: 'topik1_words_and_examples',
    lessonRange: lessonIdsCsv || onlyLessonId || 'ko_W1_*',
    sourcePath: path.relative(PROJECT_ROOT, wordsPath),
    ttsProvider: 'google-cloud',
    voiceName,
    total: items.length,
    items,
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest));

  console.log(`Done. total=${items.length}, generated=${generated}, skipped=${skipped}, dryRun=${dryRun}`);
  console.log(`Manifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
