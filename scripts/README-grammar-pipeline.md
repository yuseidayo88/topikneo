# 文法データパイプライン（TOPIK 1〜6・Supabase 用）

文法一覧 CSV から、TOPIK 1〜6 のレッスン割り当て・例文・クイズまで一括生成する手順です。  
**アプリは文法データをバンドルしません。** すべて Supabase Storage の `grammar/{locale}/grammar.json` で管理し、単語と同様に表示言語（locale）ごとに取得します。

## 前提

- **CSV**: 1列目＝韓国語の文法表記、2列目＝日本語の意味。例: `에,～に`
- デフォルトパス: プロジェクトルートの `文法一覧 - シート1.csv`（または `scripts/` 内）
- 環境変数 `OPENAI_API_KEY` が必要なスクリプトでは、実行前に設定してください。

## パイプライン順序

### 1. CSV → 難易度・頻出・TOPIK級でソート

```bash
OPENAI_API_KEY=xxx node scripts/sort-grammar-by-difficulty-frequency.mjs "path/to/文法一覧 - シート1.csv" scripts/grammar-sorted.json
```

- OpenAI で各文法に **topik_level (1〜6)**・**difficulty_score**・**frequency_score** を付与
- TOPIK級 → 難易度 → 頻出度の順でソートし、`grammar-sorted.json` を出力
- 既存の `grammar-sorted.json` に `topik_level` が無い場合は、後段でレベル 1 として扱います

### 2. TOPIK 1〜6 ごとにレッスン割り当て

```bash
node scripts/prepare-grammar-lessons.mjs scripts/grammar-sorted.json scripts/grammar-lessons.json
```

- レベルごとに 2 文法＝1 レッスンで割り当て
- 出力: `grammar-lessons.json`（`lessons` に `ko_G1_01` 〜 `ko_G6_xx`、`grammarList`・`grammarById`）

### 3. クイズ問題の生成（穴埋め・日本語訳付き）

```bash
OPENAI_API_KEY=xxx node scripts/generate-grammar-quiz.mjs scripts/grammar-lessons.json scripts/grammar-quiz.json
```

- 各文法につき 5 問ずつ穴埋め問題を生成（`korean`・`answer`・`translation`）
- 先頭 N 文法だけ試す場合: `GRAMMAR_LIMIT=40 OPENAI_API_KEY=xxx node scripts/generate-grammar-quiz.mjs ...`

### 4. アプリ用 JSON の組み立てと例文（完全文）の生成

```bash
node scripts/prepare-grammar-for-app.mjs scripts/grammar-lessons.json scripts/grammar-quiz.json scripts/grammar-for-app.json
OPENAI_API_KEY=xxx node scripts/generate-grammar-examples.mjs scripts/grammar-for-app.json scripts/grammar-for-app.json
```

- `prepare-grammar-for-app.mjs`: lessons + quiz からアプリ用 1 本の JSON を組み立て（クイズ問題は `quizItems` にのみ入り、説明欄の例文には使わない）。**既存の grammar-for-app.json に例文がある場合は id で引き継ぐ**ため、prepare を再実行しても例文は消えません。
- **例文**: 文法説明の下に表示する「例文」は**穴埋めではなく完全な文**（例：학교에 갑니다。／学校に行きます。）で、`generate-grammar-examples.mjs` で各文法につき 2 つずつ生成する。この結果をそのまま `grammar-for-app.json` に書き込み、Supabase の `grammar/{locale}/grammar.json` にアップロードして管理する。
- 例文を先頭 N 文法だけ: `GRAMMAR_LIMIT=40`
- 不足分だけ生成: `ONLY_MISSING=1 OPENAI_API_KEY=xxx node scripts/generate-grammar-examples.mjs ...`

### 4.2 並び替えクイズ問題（reorderItems）の生成

レッスン画面の「クイズ開始」で使う並び替え問題は、別スクリプトで生成し `grammar-for-app.json` に `reorderItems` として追加します。

```bash
OPENAI_API_KEY=xxx node scripts/generate-grammar-reorder.mjs scripts/grammar-for-app.json scripts/grammar-for-app.json
```

- 各レッスンにつき 4 問ずつ、短文の「語順チャンク + 訳」を生成
- 出力は `grammar-for-app.json` の `reorderItems` にマージされる
- 先頭 N レッスンのみ試す: `REORDER_LESSON_LIMIT=20 OPENAI_API_KEY=xxx node scripts/generate-grammar-reorder.mjs ...`
- 不足分のみ（既に reorderItems があるレッスンはスキップ）: `ONLY_MISSING=1 OPENAI_API_KEY=xxx node scripts/generate-grammar-reorder.mjs ...`

**レッスン画面で例文が表示されない場合**  
`grammar-for-app.json`（および Supabase の `grammar/ko_ja/grammar.json`）の `items[].examples` が空になっているためです。例文を復元するには、以下を実行してから `grammar-for-app.json` を Supabase の `grammar/ko_ja/grammar.json` に再アップロードしてください。

```bash
OPENAI_API_KEY=xxx node scripts/generate-grammar-examples.mjs scripts/grammar-for-app.json scripts/grammar-for-app.json
```

### 5. クイズデータの検証（任意）

```bash
node scripts/validate-grammar-quiz.mjs scripts/grammar-quiz.json
# またはアプリ用 JSON を検証
node scripts/validate-grammar-quiz.mjs scripts/grammar-for-app.json
```

- 空欄なし・正解の重複・記号入り正解などを検出。不具合があると exit 1 で終了する。
- 形式（locale, items, quizItems, lessonSummaries の有無・型）のみ確認する場合:  
  `node scripts/validate-grammar-for-app.mjs scripts/grammar-for-app.json`

### 6. Supabase への配置（必須）

アプリは文法をバンドルしないため、**必ず Supabase Storage に JSON をアップロード**してください。

1. **アップロード先**: Storage バケット `content` 内の `grammar/{locale}/grammar.json`  
   - 日本語: `grammar/ko_ja/grammar.json`  
   - 英語（多言語対応時）: `grammar/ko_en/grammar.json`
2. **アップロードするファイル**: `scripts/grammar-for-app.json` をそのまま、または例文マージ後にリネームしてアップロード  
   - 例文を既存の別 JSON から引き継ぐ場合:  
     `node scripts/merge-grammar-examples.mjs scripts/grammar-for-app.json scripts/grammar-ko_ja-current.json scripts/grammar-for-app.json`  
     その後 `grammar-for-app.json` を Supabase の `grammar/ko_ja/grammar.json` にアップロード
3. アプリ起動時に `loadGrammarFromSupabase(locale)` がこのパスから取得します。文法タブでプルすると再取得できます。

## Supabase での管理・多言語対応（将来の数カ国語対応）

- **Storage**: `grammar/{locale}/grammar.json`（例: `grammar/ko_ja/grammar.json`, `grammar/ko_en/grammar.json`）
- **1ファイルで1ロケール**: 説明文・例文・並び替えクイズの訳まで、その言語用にすべて同じ JSON にまとめます。数カ国語対応時はロケールごとに別ファイルを用意するだけです。
- **中身**: `locale`, `items`, `quizItems`, `lessonSummaries`, `reorderItems`（いずれもその locale の表示用）
- **アプリ**: `loadGrammarFromSupabase(locale)` が `grammar/{locale}/grammar.json` を取得。未アップロード・未設定の場合は文法タブは空で表示される。
- **複数言語の追加手順**:  
  1. `src/config/locale.ts` に `ContentLocale` と `SUPPORTED_LOCALES` を追加  
  2. その言語用に `items[].explanation`・`items[].examples[].translation`・`reorderItems[].translation`・`lessonSummaries` を翻訳した `grammar/{locale}/grammar.json` を用意  
  3. Supabase Storage の `grammar/{locale}/grammar.json` にアップロード  

**説明文・例文も Supabase で管理**: レッスン画面の「意味」「例文」はすべて `items[].explanation` と `items[].examples` から表示しています。翻訳や文言の変更は JSON を編集して再アップロードすれば反映されます。

## 出力形式（アプリ / Supabase 用）

- **items**: 各文法（`id`, `lesson_id`, `title`, `structure`, `explanation`（説明文）, `examples: [{ korean, translation }]`（例文・locale ごとの訳））
- **quizItems**: 穴埋めクイズ（**非推奨・アプリでは未使用**。並び替えクイズに移行済み。Supabase 互換のため JSON には残す）
- **lessonSummaries**: レッスン一覧用の一言（例: 「～に ・ ～は」）。locale ごとに翻訳可能。
- **reorderItems**: 並び替えクイズ（`id`, `lesson_id`, `chunks`, `translation`）。**レッスン画面の「クイズ開始」で使用するのはこの並び替えのみ**。`translation` は locale ごとの訳（ヒント表示用）。

## 一括実行例（CSV から最後まで）

```bash
export OPENAI_API_KEY=your_key
node scripts/sort-grammar-by-difficulty-frequency.mjs "文法一覧 - シート1.csv" scripts/grammar-sorted.json
node scripts/prepare-grammar-lessons.mjs scripts/grammar-sorted.json scripts/grammar-lessons.json
node scripts/generate-grammar-quiz.mjs scripts/grammar-lessons.json scripts/grammar-quiz.json
node scripts/prepare-grammar-for-app.mjs scripts/grammar-lessons.json scripts/grammar-quiz.json scripts/grammar-for-app.json
node scripts/generate-grammar-examples.mjs scripts/grammar-for-app.json scripts/grammar-for-app.json
OPENAI_API_KEY=xxx node scripts/generate-grammar-reorder.mjs scripts/grammar-for-app.json scripts/grammar-for-app.json
# 最後に Supabase Storage の grammar/ko_ja/grammar.json に grammar-for-app.json をアップロードする
```

※ クイズ・例文・並び替えは API 制限に合わせて `GRAMMAR_LIMIT`・`REORDER_LESSON_LIMIT` やバッチ待機時間を調整してください。

### TOPIK 2〜6 級にクイズを付ける（レッスン再割り当て後）

```bash
export OPENAI_API_KEY=your_key
node scripts/generate-grammar-quiz.mjs scripts/grammar-lessons.json scripts/grammar-quiz.json
node scripts/prepare-grammar-for-app.mjs scripts/grammar-lessons.json scripts/grammar-quiz.json scripts/grammar-for-app.json
# 必要なら例文マージ: node scripts/merge-grammar-examples.mjs scripts/grammar-for-app.json scripts/grammar-ko_ja-current.json scripts/grammar-for-app.json
# その後 Supabase の grammar/ko_ja/grammar.json にアップロード
```
