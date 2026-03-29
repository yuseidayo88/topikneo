# チャット RLS・レート制限の検討

## 現状

- `chat_messages` は `INSERT WITH CHECK (true)` のため、認証なしで誰でもメッセージを送信可能です。
- スパム・荒らし・不適切コンテンツの投稿を防ぐには、以下のいずれか（または組み合わせ）の検討を推奨します。

## 改善案

### 1. レート制限（Supabase Edge Function または DB トリガー）

- 同一 `sender_id` から短時間に送信できる件数に上限を設ける。
- 例: 1 分あたり 10 件まで。超過時は INSERT を拒否するか、HTTP 429 を返す。

### 2. 認証の必須化

- 長期運用では Supabase Auth を必須にし、RLS を `auth.uid()` 前提に変更。
- 例: `INSERT WITH CHECK (auth.uid() IS NOT NULL)` とし、クライアントでサインイン済みユーザーのみ送信可能にする。

### 3. モデレーション

- 不適切な語のフィルタ（Edge Function や DB の CHECK で禁止語リストと照合）を検討。

## 実装済み

- **本文 2000 文字**: `20250102_chat_messages_content_length.sql` で CHECK 制約を追加。
- **空の sender_id / content を拒否**: `20250103_chat_messages_insert_checks.sql` で INSERT 用 RLS の WITH CHECK に `trim(sender_id) <> ''` と `trim(content) <> ''` を追加。
- **挿入時も本文長を RLS でチェック**: `20250104_chat_messages_insert_content_length.sql` で `char_length(content) <= 2000` を WITH CHECK に含めた。
- **レート制限**: `20250105_chat_messages_rate_limit.sql` で同一 sender_id あたり 1 分間に 20 件までに制限（超過時は DB で INSERT 拒否）。
- **（オプション）送信をログイン済みのみに制限**: `20250107_chat_messages_insert_require_auth_optional.sql` を実行すると、未ログインではチャット送信ができなくなります。本番でスパム対策を強めたい場合に検討してください。実行後はクライアントで「ログインすると送信できます」等の案内を出すとよいです。

## 参考

- ルーム・メッセージ・RLS: `supabase/migrations/20250101_chat_rooms_messages.sql`
- マイグレーションは 20250101 → 20250102 → 20250103 → 20250104 → **20250105** → 20250106 の順で実行。20250107 は**任意**（認証必須にしたい場合のみ）。詳細は `docs/SETUP.md` を参照。
