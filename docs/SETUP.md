# KLA セットアップ手順

## 初回セットアップの流れ

1. **環境変数** … `.env.example` をコピーして `.env` を作成し、Supabase の URL と anon key を設定
2. **Supabase プロジェクト** … ダッシュボードでプロジェクト作成後、Storage バケット・マイグレーションを実行
3. **チャット利用時** … SQL Editor で次のマイグレーションを**順に**実行し、Database → Replication で `chat_messages` を有効化:
   - `20250101_chat_rooms_messages.sql`（ルーム・メッセージ・RLS）
   - `20250102_chat_messages_content_length.sql`（本文 2000 文字制約）
   - `20250103_chat_messages_insert_checks.sql`（空の sender_id/content を拒否）
   - `20250104_chat_messages_insert_content_length.sql`（挿入時も本文長を RLS でチェック）
   - `20250105_chat_messages_rate_limit.sql`（同一送信者 1 分あたり 20 件まで）
   - `20250106_user_subscriptions.sql`（ログイン済みユーザーのサブスク状態。複数デバイスで利用可能にする）
   - （任意）`20250107_chat_messages_insert_require_auth_optional.sql` … チャット送信をログイン済みのみに制限したい場合のみ実行。未実行なら匿名でも送信可。
4. **アプリ起動** … `npm install` → `npx expo start`

---

## 1. 環境変数

```bash
cp .env.example .env
```

`.env` を開き、以下を設定:

- **EXPO_PUBLIC_SUPABASE_URL** … Supabase ダッシュボード → Settings → API → Project URL
- **EXPO_PUBLIC_SUPABASE_ANON_KEY** … 同 → anon public key

本番では RLS とポリシーでデータを保護する前提です。秘密鍵は .env に書かず、EXPO_PUBLIC_ の変数はクライアントに含まれるため機密情報を入れないでください。

## 2. Supabase プロジェクト

1. [Supabase](https://supabase.com) でプロジェクト作成
2. 上記の URL / anon key を .env にコピー
3. 以下は `supabase/README.md` を参照:
   - Storage バケット `content`（単語・文法 JSON）
   - チャット用: `supabase/migrations/` の 20250101〜20250106 を**番号順**に SQL Editor で実行（20250107 は認証必須にしたい場合のみ）
   - サブスク紐付け用: `20250106_user_subscriptions.sql` を実行（ログイン時に購入をアカウントに紐付け、別デバイスでも有効にする）
   - Replication で `chat_messages` を有効化

### Supabase CLI を使う場合（任意）

プロジェクトに [Supabase CLI](https://supabase.com/docs/guides/cli) を導入している場合は、マイグレーションを一括適用できます。

```bash
# プロジェクトルート（KLA）で
npx supabase link --project-ref <プロジェクトID>
npx supabase db push
```

`supabase db push` は `supabase/migrations/` 内の SQL を**番号順**に実行します。既に Dashboard の SQL Editor で実行済みの場合は不要です。Replication の有効化は Dashboard → Database → Replication で手動確認してください。

## 3. アプリ起動

```bash
npm install
npx expo start
```

Expo Go で開くか、iOS/Android シミュレータで実行してください。

## 4. ログイン（Apple / Google）

設定 → マイページから「アカウント」をタップするとログイン画面が開きます。

### Supabase Dashboard での設定

1. **Authentication → URL Configuration**  
   - **Redirect URLs** に `kla://auth/callback` を追加して保存。

2. **Authentication → Providers → Google**  
   - 有効化し、Google Cloud Console で取得したクライアントID・シークレットを設定。  
   - 手順は [Supabase: Google ログイン](https://supabase.com/docs/guides/auth/social-login/auth-google) を参照。

3. **Authentication → Providers → Apple**  
   - 有効化し、**Client IDs** に `com.kla.app`（必須）と、作成済みなら Services ID もカンマ区切りで追加（例: `com.kla.app,com.kla.app.auth`）。  
   - **Secret Key** には **Client Secret（JWT の1行）** が必要です（`.p8` の PEM をそのまま貼ることはできません）。Apple Developer で **Services ID**・**Keys（.p8）**・Team ID / Key ID を用意し、JWT を生成して貼り付けます。JWT は最長で約6ヶ月で失効するため、期限前に再生成して Supabase を更新してください。  
   - 手順の詳細は [Supabase: Apple ログイン](https://supabase.com/docs/guides/auth/social-login/auth-apple) を参照。

4. **iOS 実機での Apple ログイン**  
   - Apple ログインはシミュレータでは動作しません。実機でテストしてください。

## 5. トラブルシューティング

- **単語・文法が空** … Storage に `words/ko_ja/`, `grammar/ko_ja/` をアップロード済みか確認。下に引いて再読み込み。
- **チャットが「ルームがありません」** … マイグレーション `20250101_chat_rooms_messages.sql` を実行したか確認。
- **チャットがリアルタイムで更新されない** … Database → Replication で `chat_messages` が有効か確認。
- **Google ログインでアプリに戻らない** … Redirect URLs に `kla://auth/callback` が追加されているか確認。
