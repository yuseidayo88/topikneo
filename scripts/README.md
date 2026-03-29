# 単語を頻出順に並べるスクリプト

## 前提

- Node.js 18+
- [OpenAI API キー](https://platform.openai.com/api-keys)（有料）

## 使い方

```bash
# CSV のパスを指定（省略時はプロジェクト内の 単語一覧 - シート1.csv）
OPENAI_API_KEY=sk-... node scripts/sort-words-by-frequency.mjs "/Users/youce/Downloads/単語一覧 - シート1.csv"
```

出力先: `scripts/words-sorted.json`（2番目の引数で変更可能）

## 出力形式

各単語に `id`, `korean`, `japanese`, `frequency_rank`（1＝最も頻出）などが付いた JSON。  
アプリの `WordItem` 形式に近いので、そのまま Supabase 用や `words_level1.json` の元データとして使えます。

## 注意

- 4,000語程度を1回の API 呼び出しで送るため、レスポンスまで 1〜2 分かかることがあります。
- トークン消費が多いため、少しコストがかかります。

---

## 文法を難易度・頻出で並べる

文法CSV（1列目: 韓国語文法パターン、2列目: 日本語の意味）を読み、OpenAI で難易度・頻出度のスコアを付けて並び替えた JSON を出力します。

```bash
OPENAI_API_KEY=sk-... node scripts/sort-grammar-by-difficulty-frequency.mjs "/Users/youce/Downloads/文法一覧 - シート1.csv"
```

- 出力先: `scripts/grammar-sorted.json`（2番目の引数で変更可能）
- 約80件ずつバッチで API を呼ぶため、200件で数分かかります。
- 出力の `order_rank` が小さいほど「易しくて頻出」な順です。この順で「2文法＝1レッスン」に割り当ててアプリの文法データを組み立てられます。

### 2. レッスン割り当て（2文法＝1レッスン）

```bash
node scripts/prepare-grammar-lessons.mjs
```

→ `scripts/grammar-lessons.json`（117レッスン分）ができる。

### 3. クイズ生成（1文法5問・OpenAI）

```bash
# 全文法で実行（233文法＝約16バッチ、時間・コスト多め）
OPENAI_API_KEY=sk-... node scripts/generate-grammar-quiz.mjs

# テスト用：先頭20文法だけ
GRAMMAR_LIMIT=20 OPENAI_API_KEY=sk-... node scripts/generate-grammar-quiz.mjs
```

→ `scripts/grammar-quiz.json`。未実行の場合はアプリでは「クイズは準備中です」となる。

### 4. アプリ用データの組み立て

```bash
node scripts/prepare-grammar-for-app.mjs
```

→ `scripts/grammar-for-app.json`。文法データはアプリにバンドルされないため、**必ず Supabase Storage の `grammar/ko_ja/grammar.json` にアップロード**する（詳細は `scripts/README-grammar-pipeline.md`）。

---

## 例文を生成する（任意）

各単語に `example: { korean, japanese }` を付けるスクリプト。**OpenAI API を使うため時間・コストがかかります**（単語並び替えと同程度〜やや長め、約 40 分〜1 時間）。

```bash
OPENAI_API_KEY=sk-... node scripts/generate-word-examples.mjs scripts/words-sorted.json
```

- `words-sorted.json` を**上書き**します。必要なら事前にバックアップを取ってください。
- 完了後、再度 `prepare-words-for-supabase.mjs` と `upload-words-to-supabase.mjs` を実行して Supabase を更新してください。

---

## Supabase で単語を管理する

1. **レベル別に分割**（1 レッスン 10 語。`words-sorted.json` が既にある場合）:
   ```bash
   node scripts/prepare-words-for-supabase.mjs scripts/words-sorted.json
   ```
   → `scripts/words-by-level/words_level1.json` … `words_level6.json` ができる。

2. **カタカナ混入の修正と検証**（推奨・アップロード前に実行）:
   ```bash
   node scripts/fix-korean-katakana.mjs
   node scripts/check-korean-no-japanese.mjs
   ```
   - `fix-korean-katakana.mjs`: `korean` / `example.korean` に混入したカタカナをハングルに置換する。
   - `check-korean-no-japanese.mjs`: 置換後、カタカナ・ひらがなが残っていないか検証する。混入があれば exit 1。
   - レベル 1 をアプリの `assets/data/ko/words_level1.json` と同期する場合:  
     `node scripts/fix-korean-katakana.mjs scripts/words-by-level/words_level1.json` のあと、  
     `scripts/words-by-level/words_level1.json` を `assets/data/ko/words_level1.json` にコピーする。

3. **Supabase でバケット作成**  
   Dashboard → **Storage** → **New bucket** → 名前: `content`（Public オン推奨）

4. **アップロード**:
   ```bash
   node scripts/upload-words-to-supabase.mjs
   ```
   `.env` に `EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` が必要。  
   アプリ起動時に Supabase から単語を取得し、取得できたレベルはそちらを表示する。

### データを修正したあと（再アップロード）

単語 JSON を編集したり `fix-korean-katakana.mjs` で修正したあとは、**再度アップロード**しないとアプリに反映されません。

1. 必要なら `check-korean-no-japanese.mjs` で検証
2. `node scripts/upload-words-to-supabase.mjs` で再アップロード
3. アプリで単語タブを開き直すか、下に引いて「再読み込み」する
