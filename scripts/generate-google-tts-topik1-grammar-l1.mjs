#!/usr/bin/env node
/**
 * TOPIK1 文法レッスン1（ko_G1_01）の
 * - 文法タイトル
 * - 例文
 * - 並び替えクイズ正解文
 * を Google Cloud TTS で生成し、既存 topik1 manifest に追記する。
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
const LESSON_ID = 'ko_G1_01';

const dryRun = process.argv.includes('--dry-run');
const forceRegenerate = process.env.TTS_FORCE_REGENERATE === '1';
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'ko-KR-Neural2-A';
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
      // ignore
    }
  }
}

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
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
  if (!client) client = new TextToSpeechClient();
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
    .filter((g) => String(g?.lesson_id ?? '') === LESSON_ID)
    .flatMap((g) => {
      const list = [];
      const title = normalizeText(g?.title);
      if (title) {
        list.push({
          sourceType: 'example',
          sourceId: `grammar:${g.id}:title`,
          lessonId: LESSON_ID,
          text: title,
        });
      }
      const examples = Array.isArray(g?.examples) ? g.examples : [];
      for (let i = 0; i < examples.length; i += 1) {
        const ex = normalizeText(examples[i]?.korean);
        if (!ex) continue;
        list.push({
          sourceType: 'example',
          sourceId: `grammar:${g.id}:example:${i + 1}`,
          lessonId: LESSON_ID,
          text: ex,
        });
      }
      return list;
    });

  const reorderTargets = reorderItems
    .filter((r) => String(r?.lesson_id ?? '') === LESSON_ID)
    .map((r) => ({
      sourceType: 'example',
      sourceId: `grammar:${r.id}`,
      lessonId: LESSON_ID,
      text: makeSentence(r.chunks),
    }));

  const targets = uniqueByText([...lessonGrammarTargets, ...reorderTargets].filter((r) => r.text));

  if (targets.length === 0) {
    throw new Error(`No reorder items found for ${LESSON_ID} in ${path.relative(PROJECT_ROOT, GRAMMAR_PATH)}`);
  }

  let manifest = {
    scope: 'topik1_words_and_examples',
    lessonRange: 'ko_W1_* + ko_G1_01',
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

  for (const t of targets) {
    const id = audioId(t.text);
    const fileName = `${id}.mp3`;
    const outPath = path.join(EXAMPLE_DIR, fileName);
    const exists = await fileExists(outPath);

    if (exists && !forceRegenerate) {
      skipped += 1;
    } else if (!dryRun) {
      const bytes = await synthesizeGoogle(t.text);
      await writeFile(outPath, bytes);
      generated += 1;
      await new Promise((r) => setTimeout(r, 80));
    } else {
      generated += 1;
    }

    const nextItem = {
      sourceType: 'example',
      text: t.text,
      file: `${REMOTE_PREFIX}/example/${fileName}`,
    };

    const idx = manifest.items.findIndex((m) => m?.sourceType === 'example' && normalizeText(m?.text) === normalizeText(t.text));
    if (idx >= 0) manifest.items[idx] = nextItem;
    else manifest.items.push(nextItem);
  }

  manifest.scope = manifest.scope || 'topik1_words_and_examples';
  manifest.lessonRange = `${manifest.lessonRange ?? 'ko_W1_*'} + ko_G1_01`;
  manifest.sourcePath = 'out/grammar-ko_en.json + existing topik1 manifest';
  manifest.ttsProvider = 'google-cloud';
  manifest.voiceName = voiceName;
  manifest.total = manifest.items.length;

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest));
  console.log(`Done grammar ${LESSON_ID}. targets=${targets.length}, generated=${generated}, skipped=${skipped}, dryRun=${dryRun}`);
  console.log(`Manifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
