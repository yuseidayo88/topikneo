#!/usr/bin/env node
/**
 * out/content-locales/<ko_xx>/ を Supabase Storage の content バケットへ一括アップロードする。
 *
 * 前提:
 *   - URL: SUPABASE_URL または EXPO_PUBLIC_SUPABASE_URL（.env に後者だけでも可）
 *   - SUPABASE_SERVICE_ROLE_KEY（Storage 書き込みに必要。anon キーでは失敗することが多い）
 *   - .env / .env.local から読み込み（シェルで export 済みの値は上書きしない）
 *
 * 実行:
 *   node scripts/upload-content-locales-to-supabase.mjs
 *
 * 任意:
 *   CONTENT_LOCALES_DIR=./out/content-locales
 *   CONTENT_BUCKET=content
 *   GRAMMAR_TITLE_SPEAK_FILE=out/grammar_title_speak.json（見出し読み・韓国語共通。未作成ならスキップ）
 *   アップロード先: tts/ko/grammar_headings/readings.json
 */

import { readFileSync } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
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

loadEnvFromProjectRoot();

async function main() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    console.error(
      'Supabase の URL が未設定です。.env に SUPABASE_URL または EXPO_PUBLIC_SUPABASE_URL を設定してください。'
    );
    process.exit(1);
  }
  if (!key) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY が未設定です。Supabase Dashboard → Settings → API の service_role（secret）を .env に追加してください。' +
        '\n※ EXPO_PUBLIC_SUPABASE_ANON_KEY では Storage への書き込みはできません。'
    );
    process.exit(1);
  }

  const baseDir = path.resolve(PROJECT_ROOT, process.env.CONTENT_LOCALES_DIR || 'out/content-locales');
  const bucket = process.env.CONTENT_BUCKET || 'content';

  let locales;
  try {
    locales = (await readdir(baseDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && d.name.startsWith('ko_'))
      .map((d) => d.name)
      .sort();
  } catch (e) {
    console.error(`ディレクトリを読めません: ${baseDir}`, e.message);
    process.exit(1);
  }

  if (locales.length === 0) {
    console.error(`${baseDir} に ko_* ロケールフォルダがありません。`);
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { error: bucketErr } = await supabase.storage.createBucket(bucket, { public: true });
  if (bucketErr && bucketErr.message !== 'The resource already exists') {
    console.warn(`Bucket "${bucket}":`, bucketErr.message);
  }

  let uploaded = 0;

  const globalTitleSpeakPath = path.resolve(
    PROJECT_ROOT,
    process.env.GRAMMAR_TITLE_SPEAK_FILE || 'out/grammar_title_speak.json'
  );
  try {
    await stat(globalTitleSpeakPath);
    const body = await readFile(globalTitleSpeakPath);
    const remotePath = 'tts/ko/grammar_headings/readings.json';
    const { error } = await supabase.storage.from(bucket).upload(remotePath, body, {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) {
      console.error(`Upload failed: ${remotePath}`, error.message);
      process.exit(1);
    }
    console.log(`Uploaded: ${remotePath}`);
    uploaded += 1;
  } catch {
    console.warn(`Skip optional: ${globalTitleSpeakPath}`);
  }

  for (const locale of locales) {
    const localeDir = path.join(baseDir, locale);
    try {
      await stat(localeDir);
    } catch {
      console.warn(`Skip missing: ${localeDir}`);
      continue;
    }

    const grammarPath = path.join(localeDir, 'grammar.json');
    try {
      await stat(grammarPath);
      const body = await readFile(grammarPath);
      const remotePath = `grammar/${locale}/grammar.json`;
      const { error } = await supabase.storage.from(bucket).upload(remotePath, body, {
        contentType: 'application/json',
        upsert: true,
      });
      if (error) {
        console.error(`Upload failed: ${remotePath}`, error.message);
        process.exit(1);
      }
      console.log(`Uploaded: ${remotePath}`);
      uploaded += 1;
    } catch {
      console.warn(`Skip grammar: ${grammarPath}`);
    }

    for (let level = 1; level <= 6; level++) {
      const file = `words_level${level}.json`;
      const fp = path.join(localeDir, file);
      try {
        await stat(fp);
      } catch {
        continue;
      }
      const body = await readFile(fp);
      const remotePath = `words/${locale}/${file}`;
      const { error } = await supabase.storage.from(bucket).upload(remotePath, body, {
        contentType: 'application/json',
        upsert: true,
      });
      if (error) {
        console.error(`Upload failed: ${remotePath}`, error.message);
        process.exit(1);
      }
      console.log(`Uploaded: ${remotePath}`);
      uploaded += 1;
    }
  }

  console.log(`Done. ${uploaded} file(s) uploaded to ${bucket}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
