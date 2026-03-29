#!/usr/bin/env node
/**
 * grammar-for-app.json の各レッスン用に、並び替えクイズ問題（reorderItems）を OpenAI で生成する。
 * 出力は grammar-for-app.json に reorderItems としてマージするか、別ファイルに出力。
 * 使い方: OPENAI_API_KEY=xxx node scripts/generate-grammar-reorder.mjs [grammar-for-app.json] [出力パス]
 * 不足分のみ: ONLY_MISSING=1 で既存 reorderItems があるレッスンはスキップ。
 * 先頭 N レッスンのみ: REORDER_LESSON_LIMIT=20
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const GRAMMAR_APP_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-for-app.json');
const OUT_PATH = process.argv[3] || GRAMMAR_APP_PATH;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QUESTIONS_PER_LESSON = 4;
const LESSONS_PER_BATCH = 5;
const DELAY_MS = 65000;

if (!OPENAI_API_KEY) {
  console.error('環境変数 OPENAI_API_KEY を設定してください。');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 1バッチ分のレッスンについて並び替え問題を生成する。
 * @param {{ lessonId: string, grammarTitles: string[], summary: string }[]} lessonsBatch
 * @returns {{ lessonId: string, questions: { chunks: string[], translation: string }[] }[]}
 */
async function generateReorderBatch(lessonsBatch) {
  const systemPrompt = `あなたは韓国語の文法教材作成者です。各レッスンについて、そのレッスンで学ぶ文法を使った「並び替えクイズ」用の短文を${QUESTIONS_PER_LESSON}つずつ作ってください。
ルール:
1. 返答は必ず単一のJSONオブジェクト。キーは "lessons"、値は配列。
2. 配列の各要素は { "lessonId": "ko_G1_01", "questions": [ { "chunks": ["저","는","학생","입니다"], "translation": "私は学生です。" }, ... ] } とする。
3. lessonId は入力と完全に一致させる。各レッスンにつきちょうど${QUESTIONS_PER_LESSON}問。
4. chunks は正しい語順の韓国語を単語・助詞などに分けた配列。句点（.）は含めない。例: "저는 학생입니다." → ["저","는","학생","입니다"]
5. translation はその文の日本語訳（句点あり）。chunks をスペースでつなげた文に句点を付けたものが自然な韓国語になるようにすること。`;

  const userContent = JSON.stringify(
    lessonsBatch.map((l) => ({
      lessonId: l.lessonId,
      summary: l.summary,
      grammarTitles: l.grammarTitles,
    }))
  );

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下の各レッスンについて、並び替えクイズ用の短文を${QUESTIONS_PER_LESSON}つずつ（chunks 配列と translation）返してください。\n\n${userContent}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from OpenAI');
  const parsed = JSON.parse(content);
  const lessons = parsed.lessons ?? [];
  if (!Array.isArray(lessons)) throw new Error('Unexpected response shape.');
  return lessons;
}

function buildLessonInfos(items) {
  const byLesson = new Map();
  for (const it of items) {
    if (!it.lesson_id) continue;
    if (!byLesson.has(it.lesson_id)) {
      byLesson.set(it.lesson_id, { lessonId: it.lesson_id, titles: [], summary: '' });
    }
    const entry = byLesson.get(it.lesson_id);
    if (it.title && !entry.titles.includes(it.title)) entry.titles.push(it.title);
  }
  return Array.from(byLesson.values()).map((e) => ({
    lessonId: e.lessonId,
    grammarTitles: e.titles,
    summary: e.titles.join(' ・ ') || e.lessonId,
  }));
}

async function main() {
  const raw = await readFile(GRAMMAR_APP_PATH, 'utf8');
  const data = JSON.parse(raw);
  const items = data.items ?? [];
  const existingReorder = Array.isArray(data.reorderItems) ? data.reorderItems : [];
  const existingByLesson = new Map();
  for (const r of existingReorder) {
    if (!existingByLesson.has(r.lesson_id)) existingByLesson.set(r.lesson_id, []);
    existingByLesson.get(r.lesson_id).push(r);
  }

  const lessonInfos = buildLessonInfos(items);
  const onlyMissing = process.env.ONLY_MISSING === '1' || process.env.ONLY_MISSING === 'true';
  let toProcess = lessonInfos;
  if (onlyMissing) {
    toProcess = lessonInfos.filter((l) => !existingByLesson.has(l.lessonId) || existingByLesson.get(l.lessonId).length === 0);
    console.log('Only lessons without reorderItems:', toProcess.length, '/', lessonInfos.length);
  }
  const limit = process.env.REORDER_LESSON_LIMIT ? parseInt(process.env.REORDER_LESSON_LIMIT, 10) : 0;
  if (limit > 0) toProcess = toProcess.slice(0, limit);

  const allGenerated = [];
  let idCounter = existingReorder.length;
  const maxId = existingReorder.reduce((m, r) => {
    const num = parseInt((r.id || '').replace(/\D/g, ''), 10);
    return isNaN(num) ? m : Math.max(m, num);
  }, 0);
  idCounter = maxId + 1;

  for (let i = 0; i < toProcess.length; i += LESSONS_PER_BATCH) {
    const batch = toProcess.slice(i, i + LESSONS_PER_BATCH);
    console.log(`Batch ${Math.floor(i / LESSONS_PER_BATCH) + 1}/${Math.ceil(toProcess.length / LESSONS_PER_BATCH)} (${batch.length} lessons)...`);
    const result = await generateReorderBatch(batch);
    for (const lec of result) {
      const questions = lec.questions ?? [];
      for (const q of questions.slice(0, QUESTIONS_PER_LESSON)) {
        const chunks = Array.isArray(q.chunks) ? q.chunks.filter((c) => c != null && String(c).trim() !== '') : [];
        if (chunks.length === 0) continue;
        const translation = (q.translation ?? '').trim();
        allGenerated.push({
          id: `ro_${String(idCounter).padStart(3, '0')}`,
          lesson_id: lec.lessonId,
          chunks,
          translation: translation || undefined,
        });
        idCounter++;
      }
    }
    if (i + LESSONS_PER_BATCH < toProcess.length) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  const finalReorder = [...existingReorder];
  if (!onlyMissing) {
    finalReorder.length = 0;
    finalReorder.push(...allGenerated);
  } else {
    for (const g of allGenerated) finalReorder.push(g);
  }

  data.reorderItems = finalReorder;
  await writeFile(OUT_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('Written:', OUT_PATH);
  console.log('reorderItems total:', finalReorder.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
