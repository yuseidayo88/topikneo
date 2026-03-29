# Supabase の設定手順（文法・単語データ）

アプリの文法データは Supabase Storage で管理します。以下の手順で設定してください。

---

## 1. プロジェクトを作る

1. [Supabase](https://supabase.com) にログイン
2. **New project** でプロジェクトを作成（名前・パスワードは任意）
3. 作成後、左メニュー **Settings** → **API** を開く
4. **Project URL** と **anon public** のキーをコピー

---

## 2. アプリの .env を設定

KLA フォルダの `.env` に次を書く（値は Supabase の Project URL と anon key に置き換え）。

```env
EXPO_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC9...（anon public のキー）
```

---

## 3. Storage バケットを作る

1. Supabase ダッシュボードで **Storage** を開く
2. **New bucket** をクリック
3. **Name** に **`content`** と入力（この名前必須）
4. **Public bucket** にチェックを入れる（アプリから JSON を読むため）
5. **Create bucket** で作成

---

## 4. 文法データをアップロードする

1. バケット **content** を開く
2. **New folder** でフォルダ **`grammar`** を作成
3. **grammar** を開き、さらに **New folder** で **`ko_ja`** を作成
4. **grammar/ko_ja** を開く
5. **Upload file** をクリック
6. アップロードするファイル:
   - プロジェクト内の **`scripts/grammar-for-app.json`** を選ぶ
   - **ファイル名を `grammar.json` に変更してから**アップロードする  
     （またはアップロード後、Storage 上で `grammar-for-app.json` を `grammar.json` にリネーム）

**最終的なパス**: `content` バケット内の **`grammar/ko_ja/grammar.json`**

---

## 5. 動作確認

1. アプリを再起動（`npx expo start -c` でキャッシュクリア推奨）
2. **文法**タブを開く
3. Supabase からデータが読めていれば、TOPIK 1級〜6級のレッスンが表示される

---

## データを更新したあと（再アップロード）

文法や単語の JSON を修正したあとは、**同じパスに再アップロード**するとアプリに反映されます。

- **文法**: `scripts/grammar-for-app.json` を `content/grammar/ko_ja/grammar.json` に再アップロード。アプリでは文法タブで下に引くか「再読み込み」で再取得できます。
- **単語**: `scripts/upload-words-to-supabase.mjs` を再実行して `content/words/ko_ja/words_level1.json` 〜 `words_level6.json` を更新。アプリでは単語タブで下に引くか「再読み込み」で再取得できます。

---

## まとめ

| やること | 内容 |
|----------|------|
| Supabase | プロジェクト作成 → Settings → API で URL と anon key をコピー |
| .env | `EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` を設定 |
| Storage | バケット名 **content**（Public）を作成 |
| アップロード | `grammar/ko_ja/grammar.json` に `scripts/grammar-for-app.json` の中身を `grammar.json` として配置 |

---

## 多言語にする場合（英語など）

- 同じ **content** バケット内に **`grammar/ko_en/grammar.json`** を追加
- 中身は英語の説明・訳が入った JSON（形式は `grammar-for-app.json` と同じ）
- アプリで `src/config/locale.ts` の `SUPPORTED_LOCALES` に `'ko_en'` を追加し、表示言語を切り替えられるようにする

---

## 単語データも Supabase で使う場合

単語は **`content/words/ko_ja/words_level1.json`** のように、レベルごとの JSON を置きます。  
詳細は単語用の README やスクリプトを参照してください。
