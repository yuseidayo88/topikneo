# 改善実装まとめ（多言語以外）

以下の改善を実装しました。多言語対応（ko_en の追加など）は対象外です。

---

## 1. 文法データの型・ドキュメント

- **`src/data/grammar.ts`**  
  - `GrammarReorderItem.translation` のコメントを「日本語訳（ヒント用）」から **「表示言語の訳（ヒント用）。多言語時は locale ごとの訳を入れる」** に変更し、多言語を想定した説明に統一。

- **`scripts/README-grammar-pipeline.md`**  
  - **quizItems**: 「穴埋めクイズ（非推奨・並び替えに移行済み）」→ **「非推奨・アプリでは未使用。並び替えクイズに移行済み。Supabase 互換のため JSON には残す」** と明記。  
  - **reorderItems**: 「レッスン画面の『クイズ開始』で使用するのはこの並び替えのみ」と追記。

---

## 2. 単語パイプライン・Supabase 再アップロード手順

- **`scripts/README.md`**  
  - **カタカナ修正・検証**を「Supabase で単語を管理する」の手順に組み込み。  
    - レベル分割のあと、アップロード前に `fix-korean-katakana.mjs` と `check-korean-no-japanese.mjs` を実行する流れを記載。  
  - **レベル 1 の同期**: `assets/data/ko/words_level1.json` と `scripts/words-by-level/words_level1.json` を同期する場合の手順（fix 実行後コピー）を追記。  
  - **データ修正後の再アップロード**: 単語 JSON を編集・修正したあと、検証 → 再アップロード → アプリで再読み込み、の 3 ステップを明記。

- **`docs/Supabase-setup.md`**  
  - **「データを更新したあと（再アップロード）」** セクションを追加。  
    - 文法: `grammar-for-app.json` を `grammar/ko_ja/grammar.json` に再アップロードし、文法タブで下に引くか「再読み込み」で再取得。  
    - 単語: `upload-words-to-supabase.mjs` 再実行でレベル別 JSON を更新し、単語タブで下に引くか「再読み込み」で再取得。

---

## 3. Supabase 取得失敗時の再読み込み UX

- **文法タブ（`app/(tabs)/grammar/index.tsx`）**  
  - 取得失敗時（`grammarLoadError` あり）に **「再読み込み」ボタン** を表示。タップで再取得。  
  - データ未アップロード時のヒントに「下に引くか『再読み込み』で再取得できます」を追記。  
  - プルで再取得は従来どおり。

- **単語タブ（`app/(tabs)/vocabulary/index.tsx`）**  
  - **プルで再取得**を追加（`RefreshControl`）。  
  - 取得失敗時（`wordsLoadError` あり）に **エラーメッセージ**・**「ネット接続を確認してから『再読み込み』を押すか、下に引いて再取得してください」**・**「再読み込み」ボタン** を表示。  
  - 単語用ストアの `wordsLoadError` は既存のため、表示とボタンのみ追加。

---

## 4. npm スクリプトの追加

- **`package.json`**  
  - `words:fix-katakana`: `node scripts/fix-korean-katakana.mjs`（単語 JSON のカタカナ→ハングル一括置換）  
  - `words:check-korean`: `node scripts/check-korean-no-japanese.mjs`（korean フィールドにカタカナ・ひらがな混入がないか検証）

使い方の例:
```bash
npm run words:fix-katakana
npm run words:check-korean
```

---

## 変更ファイル一覧

| ファイル | 内容 |
|----------|------|
| `src/data/grammar.ts` | `GrammarReorderItem.translation` のコメント修正 |
| `app/(tabs)/grammar/index.tsx` | 取得失敗時の「再読み込み」ボタン、ヒント文言の追加 |
| `app/(tabs)/vocabulary/index.tsx` | プルで再取得、取得失敗時のエラー表示と「再読み込み」ボタン |
| `scripts/README.md` | 単語のカタカナ修正・検証・レベル1同期・再アップロード手順の追記 |
| `scripts/README-grammar-pipeline.md` | quizItems 未使用・reorderItems のみ使用の明記 |
| `docs/Supabase-setup.md` | データ更新後の再アップロード手順の追加 |
| `package.json` | `words:fix-katakana` と `words:check-korean` の追加 |
| `docs/IMPROVEMENTS-IMPLEMENTED.md` | 本まとめドキュメント（新規） |

---

## 5. 改善一括対応（ErrorBoundary・アクセシビリティ・useThemeStyles・RLS・単体テスト）

- **クイズ画面の ErrorBoundary**: `app/quiz/word/[lessonId].tsx` / `review.tsx` / `saved.tsx` / `result/[lessonId].tsx` の各 return を `ErrorBoundary contextLabel="単語クイズ"` 等でラップ。落ちた画面が分かるようにした。
- **アクセシビリティ**: 保存した単語の `ScrollView` に `accessibilityRole="list"` と `accessibilityLabel="保存した単語一覧"`、各カードに `accessibilityRole="listitem"` と `accessibilityLabel` を追加。単語レベルの `FlatList` に `accessibilityRole="list"` と `accessibilityLabel="レッスン一覧"` を追加。
- **useThemeStyles の利用**: 単語クイズ画面（`app/quiz/word/[lessonId].tsx`）で `useTheme()` + typography/cardBorder の useMemo をやめ、`useThemeStyles()` に統一。
- **チャット RLS**: `supabase/migrations/20250103_chat_messages_insert_checks.sql` を追加。空の `sender_id` / `content` を拒否する INSERT ポリシーに変更。レート制限は Edge Function 等で検討とコメント記載。
- **単体テスト**: `src/__tests__/words.test.ts` を追加。`getWordsByLevel` / `getWordLessonIdsByLevel` / `getWordsByLessonId` の基本動作をテスト（`npm test -- --testPathPattern=words` で実行可能）。
