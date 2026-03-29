#!/usr/bin/env node
/**
 * generated/audio/google-tts/ko/grammar_headings（または TTS_TARGET_KEY）の manifest + mp3 を Supabase Storage (content) へ。
 * 任意で `out/grammar_title_speak.json` を `tts/ko/grammar_headings/readings.json` にもアップロード（男女声で共通）。
 *
 *   --readings-only   manifest と mp3 は送らず、readings.json のみ（ローカル generated が無いとき用）
 */
import { readFileSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const targetKey = process.env.TTS_TARGET_KEY?.trim() || 'grammar_headings';
const LOCAL_DIR = path.resolve(PROJECT_ROOT, `generated/audio/google-tts/ko/${targetKey}`);
const REMOTE_PREFIX = `tts/ko/${targetKey}`;
const READINGS_LOCAL = path.resolve(
  PROJECT_ROOT,
  process.env.GRAMMAR_READINGS_FILE?.trim() || 'out/grammar_title_speak.json'
);
const READINGS_REMOTE = 'tts/ko/grammar_headings/readings.json';
const BUCKET = process.env.CONTENT_BUCKET || 'content';
const uploadProgressEvery = Number.parseInt(process.env.TTS_UPLOAD_PROGRESS_EVERY ?? '100', 10);
const readingsOnly = process.argv.includes('--readings-only');

function uploadProgressLog(msg) {
  console.error(`[TTS upload grammar_headings ${targetKey}] ${msg}`);
}

function formatDuration(totalSec) {
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
      /* ignore */
    }
  }
}

async function filterExistingFiles(files, label) {
  const out = [];
  let missing = 0;
  for (const f of files) {
    try {
      await access(f.localPath);
      out.push(f);
    } catch {
      missing += 1;
    }
  }
  if (missing > 0) {
    uploadProgressLog(`${label}: ${missing} manifest entries skipped (file not on disk)`);
  }
  return out;
}

async function uploadFiles(supabase, files, contentType, label) {
  const total = files.length;
  const startedAt = Date.now();
  if (total > 0) {
    uploadProgressLog(`${label}: ${total} files (starting)`);
  }
  let uploaded = 0;
  for (let idx = 0; idx < files.length; idx += 1) {
    const f = files[idx];
    const body = await readFile(f.localPath);
    const remotePath = f.remotePath;
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await supabase.storage.from(BUCKET).upload(remotePath, body, {
        contentType,
        upsert: true,
      });
      if (!res.error) {
        lastErr = null;
        break;
      }
      lastErr = res.error;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    if (lastErr) throw new Error(`Upload failed: ${remotePath}: ${lastErr.message}`);
    uploaded += 1;
    const n = idx + 1;
    const elapsedSec = (Date.now() - startedAt) / 1000;
    const pct = ((n / total) * 100).toFixed(1);
    let etaStr = '—';
    if (n > 0 && n < total) {
      const secPerItem = elapsedSec / n;
      etaStr = formatDuration(secPerItem * (total - n));
    } else if (n >= total) {
      etaStr = '0s';
    }
    const shouldLog =
      uploadProgressEvery > 0 &&
      (n === 1 || n === total || n % uploadProgressEvery === 0 || uploadProgressEvery === 1);
    if (shouldLog) {
      uploadProgressLog(
        `${label}: ${n}/${total} (${pct}%) elapsed=${formatDuration(elapsedSec)} eta≈${etaStr}`
      );
    }
  }
  if (total > 0) {
    uploadProgressLog(`${label}: done ${total} files in ${formatDuration((Date.now() - startedAt) / 1000)}`);
  }
  return uploaded;
}

async function main() {
  loadEnvFromProjectRoot();
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL(EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (bucketErr && bucketErr.message !== 'The resource already exists') {
    console.warn(`Bucket "${BUCKET}": ${bucketErr.message}`);
  }

  let audioCount = 0;
  let headingFilesRaw = [];
  let manifestRemotePath = `${REMOTE_PREFIX}/manifest.json`;

  if (!readingsOnly) {
    const manifestPath = path.join(LOCAL_DIR, 'manifest.json');
    const manifestBody = await readFile(manifestPath);
    const manifest = JSON.parse(manifestBody.toString('utf8'));
    manifestRemotePath = `${REMOTE_PREFIX}/manifest.json`;
    const manifestRes = await supabase.storage.from(BUCKET).upload(manifestRemotePath, manifestBody, {
      contentType: 'application/json',
      upsert: true,
    });
    if (manifestRes.error) {
      console.error(`Upload failed: ${manifestRemotePath}: ${manifestRes.error.message}`);
      process.exit(1);
    }
    uploadProgressLog('manifest.json uploaded');

    const items = Array.isArray(manifest?.items) ? manifest.items : [];
    headingFilesRaw = items
      .filter((i) => typeof i?.grammarId === 'string' && typeof i.file === 'string')
      .map((i) => ({ localPath: path.join(LOCAL_DIR, 'example', path.basename(i.file)), remotePath: i.file }));

    const headingFiles = await filterExistingFiles(headingFilesRaw, 'grammar_heading');
    audioCount = await uploadFiles(supabase, headingFiles, 'audio/mpeg', 'grammar_heading');
  } else {
    uploadProgressLog('readings-only: skip manifest + mp3');
  }

  let readingsUploaded = false;
  try {
    await access(READINGS_LOCAL);
    const body = await readFile(READINGS_LOCAL);
    const { error } = await supabase.storage.from(BUCKET).upload(READINGS_REMOTE, body, {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) {
      console.warn(`Optional readings upload failed: ${READINGS_REMOTE}: ${error.message}`);
    } else {
      console.log(`Uploaded readings: ${READINGS_REMOTE}`);
      readingsUploaded = true;
    }
  } catch {
    uploadProgressLog(`skip optional readings: ${READINGS_LOCAL}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(manifestRemotePath);
  if (readingsOnly) {
    console.log(`Uploaded readings only (${readingsUploaded ? 'ok' : 'skipped'}).`);
  } else {
    console.log(`Uploaded grammar headings manifest + audio (Google TTS).`);
    console.log(
      `grammar_heading=${audioCount} (manifest had ${headingFilesRaw.length}), readings=${readingsUploaded ? 'yes' : 'no'}`
    );
    console.log(`Manifest URL: ${data.publicUrl}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
