#!/usr/bin/env node
/**
 * grammar-lessons.json を読み、各文法について穴埋め問題を5問ずつ OpenAI で生成する。
 * 使い方: OPENAI_API_KEY=xxx node scripts/generate-grammar-quiz.mjs [grammar-lessons.json] [出力パス]
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const GRAMMAR_LESSONS_PATH = process.argv[2] || path.join(process.cwd(), 'scripts', 'grammar-lessons.json');
const OUT_PATH = process.argv[3] || path.join(process.cwd(), 'scripts', 'grammar-quiz.json');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QUESTIONS_PER_GRAMMAR = 5;
const BATCH_SIZE = 15; // 15文法ずつ（75問を1回で生成）
const DELAY_MS = 65000;

if (!OPENAI_API_KEY) {
  console.error('環境変数 OPENAI_API_KEY を設定してください。');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateQuizForBatch(grammarItems, lessonIdByGrammarId) {
  const listForPrompt = grammarItems.map((g) => ({
    id: g.id,
    korean: g.korean,
    japanese: g.japanese,
  }));

  const systemPrompt = `あなたは韓国語の文法教育の専門家です。与えられた文法リストの各項目について、穴埋め問題を${QUESTIONS_PER_GRAMMAR}問ずつ生成してください。
ルール:
1. 返答は必ず単一のJSONオブジェクト。キーは "items" とし、値は配列。
2. 配列の各要素は { "grammar_id": "g_001", "sentences": [ { "korean": "文（　）文", "answer": "穴に入る語", "translation": "穴を埋めた完全な日本語の文（括弧や（　）なし）" }, ... ] } とする。
3. korean では穴の部分を全角（　）で表す。answer は穴に入る正解の語（ハングル）のみ。必ず「穴に入れる一語（または短い語尾）」にし、穴の直後に同じ語が続く形にしないこと。例: 「～줄 몰랐다」では「그녀가 나를 기억할 줄（　） 몰랐어요」で answer「몰랐」は誤り（몰랐어요と重複）。正しくは「그녀가 나를 기억（　） 줄 몰랐어요」answer「할」のように、動詞の-(으)ㄹ形だけを穴にする。
4. 韓国語の正書法に従い、単語の区切りに半角スペースを入れること。穴の直後が次の単語の始まりの場合は、（　）の直後に半角スペースを入れること。例: 가게에 들어갑니다. → 가게（　） 들어갑니다.
5. translation はその文の日本語訳で、穴を埋めた完全な一文にすること。（　）や括弧は使わない。例: korean が「저（　） 책입니다.」answer が「의」なら translation は「私の本です。」
6. 各文法につきちょうど${QUESTIONS_PER_GRAMMAR}問。短文で自然な韓国語にすること。`;

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
        { role: 'user', content: `以下の文法について、穴埋め問題を各${QUESTIONS_PER_GRAMMAR}問ずつ生成し、JSONで返してください。\n\n${JSON.stringify(listForPrompt)}` },
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
  const items = parsed.items ?? parsed.grammar ?? [];
  if (!Array.isArray(items)) throw new Error('Unexpected response shape.');

  const quizItems = [];
  let qId = 1;
  for (const item of items) {
    const lessonId = lessonIdByGrammarId[item.grammar_id];
    if (!lessonId) continue;
    const sentences = item.sentences ?? item.quiz ?? [];
    for (const s of sentences.slice(0, QUESTIONS_PER_GRAMMAR)) {
      let korean = (s.korean || s.sentence || '').replace(/\(\)|（）|___/g, '（　）');
      // 穴の直後がハングル（次の単語の先頭）の場合はスペースを入れる（가게에 들어갑니다. の区切りを反映）
      korean = korean.replace(/（　）(?=[가-힣])/g, '（　） ');
      const answer = (s.answer || s.correct || '').trim();
      const translation = (s.translation || s.japanese || '').trim();
      if (korean && answer) {
        quizItems.push({
          id: `gq_${String(qId).padStart(4, '0')}`,
          lesson_id: lessonId,
          grammar_id: item.grammar_id,
          korean,
          answer,
          ...(translation ? { translation } : {}),
        });
        qId++;
      }
    }
  }
  return quizItems;
}

async function main() {
  const raw = await readFile(GRAMMAR_LESSONS_PATH, 'utf8');
  const data = JSON.parse(raw);
  const { lessons, grammarList } = data;
  const lessonIdByGrammarId = {};
  for (const lec of lessons) {
    for (const gid of lec.grammarIds) {
      lessonIdByGrammarId[gid] = lec.lessonId;
    }
  }

  const grammarById = data.grammarById || {};
  let allGrammar = data.grammarList || [];
  const limit = process.env.GRAMMAR_LIMIT ? parseInt(process.env.GRAMMAR_LIMIT, 10) : 0;
  if (limit > 0) {
    allGrammar = allGrammar.slice(0, limit);
    console.log('Limited to', limit, 'grammar');
  }
  const batches = [];
  for (let i = 0; i < allGrammar.length; i += BATCH_SIZE) {
    batches.push(allGrammar.slice(i, i + BATCH_SIZE));
  }

  const allQuiz = [];
  for (let b = 0; b < batches.length; b++) {
    console.log(`Batch ${b + 1}/${batches.length} (${batches[b].length} grammar)...`);
    const quizItems = await generateQuizForBatch(batches[b], lessonIdByGrammarId);
    allQuiz.push(...quizItems);
    if (b < batches.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  await writeFile(OUT_PATH, JSON.stringify(allQuiz, null, 2), 'utf8');
  console.log('Written:', OUT_PATH);
  console.log('Quiz items:', allQuiz.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
