#!/usr/bin/env node
/**
 * scripts/words-by-level/*.json を Supabase Storage の content/words/ko_ja/ にアップロードする。
 * .env / .env.local から SUPABASE_URL（または EXPO_PUBLIC_SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY を読み込む。
 * 実行: node scripts/upload-words-to-supabase.mjs
 */

import { readFileSync } from 'fs';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

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
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    } catch {
      /* ファイルなしは無視 */
    }
  }
}

async function main() {
  loadEnvFromProjectRoot();
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'SUPABASE_URL（または EXPO_PUBLIC_SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY を .env または .env.local に設定してください。'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { error: bucketErr } = await supabase.storage.createBucket('content', { public: true });
  if (bucketErr && bucketErr.message !== 'The resource already exists') {
    console.warn('Bucket "content" の作成をスキップ（既に存在するか権限不足）:', bucketErr.message);
  } else if (!bucketErr) {
    console.log('Bucket "content" を作成しました。');
  }

  const dir = path.join(process.cwd(), 'scripts', 'words-by-level');
  const files = (await readdir(dir)).filter((f) => f.startsWith('words_level') && f.endsWith('.json'));

  for (const file of files.sort()) {
    const fullPath = path.join(dir, file);
    const body = await readFile(fullPath);
    const remotePath = `words/ko_ja/${file}`;
    const { error } = await supabase.storage.from('content').upload(remotePath, body, {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) {
      console.error(`Upload failed: ${remotePath}`, error.message);
      process.exit(1);
    }
    console.log(`Uploaded: ${remotePath}`);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
