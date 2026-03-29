#!/usr/bin/env node
/**
 * reorderItems の chunks 内に同一文字列が複数ある問題を一覧する。
 * 並び替えUIでは見た目が同じになりユーザーが区別しにくいため、データ確認用。
 *
 * Usage: node scripts/validate-grammar-reorder-chunks.mjs [path/to/grammar.json]
 * Default: out/grammar-ko_en.json（リポジトリルートから）
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const DEFAULT_PATH = join(root, 'out', 'grammar-ko_en.json');

async function main() {
  const jsonPath = process.argv[2] ? join(process.cwd(), process.argv[2]) : DEFAULT_PATH;
  const raw = await readFile(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const items = data.reorderItems;
  if (!Array.isArray(items)) {
    console.error('No reorderItems array in', jsonPath);
    process.exit(1);
  }

  let reportCount = 0;
  for (const q of items) {
    const chunks = q.chunks;
    if (!Array.isArray(chunks)) continue;
    const byValue = new Map();
    chunks.forEach((c, i) => {
      const key = String(c);
      if (!byValue.has(key)) byValue.set(key, []);
      byValue.get(key).push(i);
    });
    const duplicates = [...byValue.entries()].filter(([, idxs]) => idxs.length > 1);
    if (duplicates.length > 0) {
      reportCount++;
      console.log(`[${q.id}] lesson_id=${q.lesson_id}`);
      for (const [value, idxs] of duplicates) {
        console.log(`  重複: "${value}" → 位置 ${idxs.join(', ')}`);
      }
    }
  }

  if (reportCount === 0) {
    console.log(`OK: ${items.length} 問に重複チャンクなし (${jsonPath})`);
  } else {
    console.log(`\n合計 ${reportCount} 問に重複チャンクあり（アプリ側は文面一致で正解判定）`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
