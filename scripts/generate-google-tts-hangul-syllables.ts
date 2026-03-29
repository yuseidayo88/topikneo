#!/usr/bin/env npx tsx
/**
 * ハングルパズルで出うる全音節を Google TTS で生成し、既存 manifest にマージする。
 * マニフェスト上は sourceType: word（キー word:<音節>）で単語 TTS と同じルックアップ。
 *
 * 環境変数:
 *   TTS_PROGRESS_EVERY=50  進捗ログ間隔（1=毎件）
 *   TTS_DELAY_MS=25      合成の間隔（ms）
 *   --dry-run             manifest / mp3 は書かない
 */
import { readFileSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getAllHangulPuzzleTtsSyllables } from '../src/utils/hangulPuzzleScope';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

const targetKey = process.env.TTS_TARGET_KEY?.trim() || 'topik1';
const OUT_DIR = path.resolve(PROJECT_ROOT, `generated/audio/google-tts/ko/${targetKey}`);
const WORD_DIR = path.join(OUT_DIR, 'word');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const REMOTE_PREFIX = `tts/ko/${targetKey}`;

const dryRun = process.argv.includes('--dry-run');
const forceRegenerate = process.env.TTS_FORCE_REGENERATE === '1';
const wordEnding = process.env.TTS_WORD_ENDING ?? '.';
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'ko-KR-Neural2-A';
const wordSpeakingRate = parseFloat(process.env.GOOGLE_TTS_WORD_SPEAKING_RATE ?? '0.88');
const perRequestDelayMs = Number.parseInt(process.env.TTS_DELAY_MS ?? '25', 10);
const progressEvery = Number.parseInt(process.env.TTS_PROGRESS_EVERY ?? '50', 10);

function progressLog(msg: string) {
  console.error(`[TTS hangul puzzle ${targetKey}] ${msg}`);
}

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${Math.round(totalSec)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}m ${s}s`;
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

function normalizeText(text: string): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function makeAudioId(sourceType: string, text: string): string {
  return createHash('sha1')
    .update(`google-tts:${voiceName}:${sourceType}:${text}`)
    .digest('hex')
    .slice(0, 16);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadJson(filePath: string): Promise<{ items?: unknown[] }> {
  return JSON.parse(await readFile(filePath, 'utf8')) as { items?: unknown[] };
}

function mergeItems(
  existingItems: { sourceType?: string; text?: string; file?: string }[],
  newItems: typeof existingItems
) {
  const map = new Map<string, { sourceType?: string; text?: string; file?: string }>();
  for (const item of existingItems) {
    if (!item?.sourceType || !item?.text || !item?.file) continue;
    map.set(`${item.sourceType}:${normalizeText(item.text)}`, item);
  }
  for (const item of newItems) {
    map.set(`${item.sourceType}:${normalizeText(item.text ?? '')}`, item);
  }
  return Array.from(map.values());
}

let client: TextToSpeechClient | null = null;
function getClient(): TextToSpeechClient {
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

async function synthesizeGoogle(text: string): Promise<Buffer> {
  const ttsText = /[.!?。]$/.test(text) ? text : `${text}${wordEnding}`;
  const [response] = await getClient().synthesizeSpeech({
    input: { text: ttsText },
    voice: { languageCode: 'ko-KR', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: wordSpeakingRate },
  });
  if (!response.audioContent) throw new Error('Google TTS returned empty audioContent');
  return Buffer.from(response.audioContent);
}

async function synthesizeWithRetry(text: string, retries = 5): Promise<Buffer> {
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

async function main() {
  loadEnvFromProjectRoot();
  await mkdir(WORD_DIR, { recursive: true });

  const syllables = getAllHangulPuzzleTtsSyllables();
  if (syllables.length === 0) throw new Error('No hangul puzzle syllables');

  progressLog(
    `start syllables=${syllables.length} voice=${voiceName} dryRun=${dryRun} progressEvery=${progressEvery} delayMs=${perRequestDelayMs}`
  );

  let generated = 0;
  let skipped = 0;
  const startedAt = Date.now();
  const wordItems: { sourceType: string; text: string; file: string }[] = [];

  let i = 0;
  for (const text of syllables) {
    i += 1;
    const sourceType = 'word';
    const id = makeAudioId(sourceType, text);
    const fileName = `${id}.mp3`;
    const outPath = path.join(WORD_DIR, fileName);
    const exists = await fileExists(outPath);

    if (exists && !forceRegenerate) {
      skipped += 1;
    } else if (!dryRun) {
      const bytes = await synthesizeWithRetry(text, 5);
      await writeFile(outPath, bytes);
      generated += 1;
      if (perRequestDelayMs > 0) await new Promise((r) => setTimeout(r, perRequestDelayMs));
    } else {
      generated += 1;
    }

    const elapsedSec = (Date.now() - startedAt) / 1000;
    const pct = ((i / syllables.length) * 100).toFixed(1);
    let etaStr = '—';
    if (i > 0 && i < syllables.length) {
      const secPerItem = elapsedSec / i;
      etaStr = formatDuration(secPerItem * (syllables.length - i));
    } else if (i >= syllables.length) {
      etaStr = '0s';
    }

    const shouldLog =
      progressEvery > 0 &&
      (i === 1 || i === syllables.length || i % progressEvery === 0 || progressEvery === 1);

    if (shouldLog) {
      progressLog(
        `progress ${i}/${syllables.length} (${pct}%) synthWrites=${generated} fileSkipped=${skipped} elapsed=${formatDuration(elapsedSec)} eta≈${etaStr}`
      );
      if (progressEvery === 1) {
        progressLog(`  → ${text}`);
      }
    }

    wordItems.push({
      sourceType,
      text,
      file: `${REMOTE_PREFIX}/${sourceType}/${fileName}`,
    });
  }

  let existing: { items?: unknown[]; scope?: string } = { items: [] };
  if (await fileExists(MANIFEST_PATH)) {
    existing = await loadJson(MANIFEST_PATH);
  }
  const mergedItems = mergeItems(
    Array.isArray(existing?.items) ? (existing.items as { sourceType?: string; text?: string; file?: string }[]) : [],
    wordItems
  );
  const manifest = {
    ...existing,
    scope: existing?.scope || 'topik_words_examples_and_hangul_puzzle',
    hangulPuzzleSyllables: syllables.length,
    sourcePath: 'getAllHangulPuzzleTtsSyllables + merged manifest',
    ttsProvider: 'google-cloud',
    voiceName,
    total: mergedItems.length,
    items: mergedItems,
  };

  if (!dryRun) {
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest));
  }

  const totalElapsedSec = (Date.now() - startedAt) / 1000;

  progressLog(
    `done syllables=${syllables.length} synthWrites=${generated} fileSkipped=${skipped} totalTime=${formatDuration(totalElapsedSec)} mergedItems=${manifest.total} dryRun=${dryRun}`
  );
  console.log(
    `Done hangul puzzle TTS. syllables=${syllables.length}, synthWrites=${generated}, fileSkipped=${skipped}, dryRun=${dryRun}, totalTime=${formatDuration(totalElapsedSec)}, mergedItems=${manifest.total}`
  );
  if (!dryRun) {
    console.log(`Manifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
