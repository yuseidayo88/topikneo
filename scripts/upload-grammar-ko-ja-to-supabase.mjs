#!/usr/bin/env node
/**
 * scripts/grammar-for-app.json を Storage の grammar/ko_ja/grammar.json にアップロードする。
 *
 * 前提: SUPABASE_URL または EXPO_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY（.env）
 *
 * 使い方:
 *   node scripts/upload-grammar-ko-ja-to-supabase.mjs
 *   node scripts/upload-grammar-ko-ja-to-supabase.mjs path/to/grammar.json
 */

import { readFileSync } from 'fs';
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
      /* ignore */
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
      'SUPABASE_SERVICE_ROLE_KEY が未設定です。Supabase Dashboard → Settings → API の service_role を .env に追加してください。'
    );
    process.exit(1);
  }

  const localPath = path.resolve(
    PROJECT_ROOT,
    process.argv[2] || 'scripts/grammar-for-app.json'
  );
  const body = readFileSync(localPath);
  const bucket = process.env.CONTENT_BUCKET || 'content';
  const remotePath = 'grammar/ko_ja/grammar.json';

  const supabase = createClient(url, key);
  const { error } = await supabase.storage.from(bucket).upload(remotePath, body, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    console.error(`Upload failed: ${bucket}/${remotePath}`, error.message);
    process.exit(1);
  }

  console.log(`Uploaded: ${bucket}/${remotePath} ← ${path.relative(PROJECT_ROOT, localPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
