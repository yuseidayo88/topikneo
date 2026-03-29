# Supabase セットアップ

## 1. 環境変数

プロジェクトルートに `.env` を作成し、Supabase の URL と anon key を設定してください。
Storage アップロードや Edge Function 用に、必要なら `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` も設定します。

```bash
cp .env.example .env
# .env を開き、EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY をダッシュボードの値に書き換え
```

- ダッシュボード: プロジェクト → **Settings** → **API**
- **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 2. 進捗同期用テーブル（ログイン機能用）

Supabase Dashboard → **SQL Editor** を開き、`schema.sql` の内容を貼り付けて実行してください。  
これで `user_progress`, `lesson_progress`, `saved_words`, `streak`, `daily_stats` が作成され、RLS でユーザーごとにアクセスが制限されます。

## 3. Storage（単語・文法 JSON）

1. **Storage** → **New bucket** でバケットを作成
   - 名前: `content`
   - Public: **オン**（アプリから単語JSONを読むため）

2. **SQL Editor** で `storage-policies.sql` を実行（`anon` は読み取りのみ。書き込みは service role / Dashboard で行う）

3. フォルダ構成の例
   - `content/words/ko_ja/words_level1.json` … 1級単語（韓日）
   - `content/words/ko_ja/words_level2.json` … 2級単語
   - `content/grammar/ko_ja/grammar.json` … 文法データ

4. バケット作成とポリシー実行後、単語データをアップロードする:
   ```bash
   node scripts/prepare-words-for-supabase.mjs scripts/words-sorted.json  # レベル別に分割（済なら不要）
   node scripts/upload-words-to-supabase.mjs                             # service role で Storage にアップロード
   ```
   アプリ側では `src/supabase/storage.ts` の `fetchWordsByLevel`, `fetchGrammarJson` で取得できます。

## 4. チャット（ルーム・メッセージ）

1. **SQL Editor** でマイグレーションを**番号順**に実行:
   - `migrations/20250101_chat_rooms_messages.sql` … テーブル作成・RLS・Realtime・テストルーム 1 件
   - `migrations/20250102_chat_messages_content_length.sql` … 本文 2000 文字制限
   - `migrations/20250103_chat_messages_insert_checks.sql` … 空の sender_id/content を拒否
   - `migrations/20250104_chat_messages_insert_content_length.sql` … 挿入時も本文長を RLS でチェック
   - `migrations/20250105_chat_messages_rate_limit.sql` … 同一送信者 1 分あたり 20 件まで（スパム対策）
   - `migrations/20250107_chat_messages_insert_require_auth_optional.sql` … チャット送信を `PRO かつログイン済み` のみに制限

2. **Realtime**: Dashboard → **Database** → **Replication** で `chat_messages` が **supabase_realtime** に含まれていることを確認。含まれていない場合は 20250101 の `ALTER PUBLICATION` を再実行するか、Replication 画面からテーブルを追加してください。

3. アプリのチャットタブでルーム名が表示され、`PRO かつログイン済み` ユーザーのみ送信できます。

## 5. 認証

Dashboard → **Authentication** → **Providers** で **Email** を有効にすると、メール・パスワードでサインアップ/サインインできます。  
アプリ側では `src/supabase/auth.ts` の `signInWithPassword`, `signUpWithPassword`, `signOut`, `getSession` を使用します。

## 6. 進捗同期

ログイン中は `user_progress`, `lesson_progress`, `saved_words`, `streak`, `daily_stats` を `Supabase` と同期します。  
初回ログイン時にサーバー側データが空なら、端末ローカルの `local` データをユーザー領域へ移行して同期します。

## 7. アカウント削除

`delete-user` Edge Function をデプロイしてください。

```bash
supabase functions deploy delete-user
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

アプリ側の退会導線はこの Function を前提に動作します。
