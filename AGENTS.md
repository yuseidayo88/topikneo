# KLA（韓国語学習）— Agent 向けメモ

## プロジェクト概要

- **KLA**: Expo（React Native）+ TypeScript のモバイルアプリ。ルーティングは `expo-router`（`app/`）。
- **バックエンド**: Supabase（認証・チャット・Storage の JSON コンテンツなど）。Edge Functions は `supabase/functions/`。
- **状態管理**: Zustand（`src/store/`）。
- **主要ドキュメント**: 初回セットアップは `docs/SETUP.md`、Supabase 詳細は `supabase/README.md`（存在する場合）。

## よく使うコマンド（リポジトリルート = 本ディレクトリ）

- 依存関係: `npm install`
- 単体テスト: `npm run test` または `npm run test:unit`
- アプリ起動: `npx expo start`（必要に応じて `--web` / `--ios` / `--android`）
- 型（リンク済みプロジェクト向け）: `npm run supabase:gen-types`

## コードを触るときの目安

- 画面・ルート: `app/`
- 共有ロジック・コンポーネント: `src/`
- コンテンツデータ: `src/data/` や Supabase Storage（アップロード系は `scripts/`）
- 新規ファイルは既存の命名・import パターンに合わせる。

---

## Cursor Cloud specific instructions

クラウドエージェント VM では次を前提にしてください。

1. **依存関係**  
   起動時に `.cursor/environment.json` の `install` として `npm install` がリポジトリルートで実行されます（冪等）。

2. **環境変数**  
   ローカルでは `.env.example` を `.env` にコピーして Supabase 等を設定します。クラウドでは **Cursor の Cloud Agents 用 Secrets**（ダッシュボード）に `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` などを登録し、ビルド・実行時に利用できるようにしてください。  
   **秘密情報をリポジトリにコミットしないこと。**

3. **検証**  
   変更の確認はまず `npm run test` / `npm run test:unit` を推奨します。Expo の実機確認が必要な場合は `npx expo start`（必要なら `--web`）を AGENTS のセッション内で実行し、詳細は `docs/SETUP.md` を参照してください。

4. **追加のセットアップ**  
   チャット・サブスク・ログイン連携などフル機能の手順は `docs/SETUP.md` の SQL 実行順と Replication 設定を参照してください。エージェント作業がスクリプトやクライアントのみの場合は、該当する `.env` 変数がなくてもテストや型チェックだけで足りることがあります。

5. **Web 起動時の注意点**  
   - `npx expo start --web` には `react-native-web` が必要です。未インストールの場合は `npm install react-native-web@^0.21.0 --legacy-peer-deps` で追加してください（`react-dom` との peer 競合があるため `--legacy-peer-deps` が必要）。  
   - `expo-sqlite` は Web では `SharedArrayBuffer` を要求し、デフォルトのローカル dev サーバーでは COOP/COEP ヘッダー不足で失敗します。ローカルDB依存の機能（進捗保存等）は Web 上では動作しませんが、UI の確認には支障ありません。

6. **TypeScript**  
   `npx tsc --noEmit` を実行すると `scripts/` と `src/supabase/chat.ts` に既存エラーが数件あります。これらはリポジトリの既知問題であり、アプリ動作には影響しません。
