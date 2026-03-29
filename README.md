# KLA（韓国語学習アプリ）

Expo (React Native) でつくった韓国語学習アプリです。

**注意:** 以下のコマンドはすべて **KLA フォルダ内**（`package.json` があるディレクトリ）で実行してください。リポジトリのルートが `Korean` の場合は、先に `cd KLA` してから実行します。

## セットアップ

```bash
cd KLA   # リポジトリルートから KLA に入る場合
npm install
npx expo start
```

**環境変数:** Supabase の URL / anon key が未設定だと、単語・文法データの取得ができません。`.env.example` を `.env` にコピーし、`EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` を設定してください。

## キャッシュクリア手順

ナビゲーションや表示の不具合、古いコードが残っているようなときは、以下を試してください。

### 1. Metro のキャッシュを消して起動（まず試す）

```bash
cd KLA
npx expo start --clear
```

### 2. さらにクリーンにしたい場合

```bash
cd KLA
# キャッシュディレクトリを削除
rm -rf node_modules/.cache
rm -rf .expo

# 依存関係の入れ直し（任意）
rm -rf node_modules
npm install

# キャッシュクリアで起動
npx expo start --clear
```

### 3. Watchman を使っている場合

```bash
watchman watch-del-all
```

その後、`npx expo start --clear` で起動し直してください。

### 4. iOS シミュレータのビルドキャッシュ

```bash
# シミュレータでアプリを削除してから再インストール
# または
npx expo run:ios --no-build-cache
```

## 本番ビルド・リリース

### 環境変数（EAS Build / 本番）

- `.env` は git に含めず、本番では **EAS Secrets** または CI の環境変数で設定してください。
- 必要な変数は `.env.example` を参照してください。
  - **必須（Supabase 利用時）**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - **推奨（ストア審査）**: `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_URL`
- **課金本番化**: `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`, `EXPO_PUBLIC_REVENUECAT_OFFERING_ID`, `EXPO_PUBLIC_IAP_PRODUCT_ID_MONTHLY`, `EXPO_PUBLIC_IAP_PRODUCT_ID_YEARLY`, `EXPO_PUBLIC_IAP_PRODUCT_ID_LIFETIME`

### アプリ内課金（RevenueCat）

- 課金は **RevenueCat (`react-native-purchases`)** を使います。実購入テストは **Development Build / TestFlight / App Store ビルド** で行ってください。
- iOS は `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` に Public Apple SDK Key を設定し、RevenueCat Dashboard の Offering / Entitlement / Product をアプリ設定と一致させてください。
- `EXPO_PUBLIC_IAP_PRODUCT_ID_*` は RevenueCat / App Store Connect と同じ product id を入れてください。未設定時は `monthly`, `yearly`, `lifetime` を既定値として扱います。

### チャット（RLS・スパム対策）

- チャットの INSERT は匿名でも可能です。本番でスパム対策を行う場合は、認証必須化・レート制限・モデレーションの検討を推奨します。詳細は **`docs/CHAT_RLS_RATE_LIMIT.md`** を参照してください。

### Deep Link

- スキームは **`kla`** です。ログイン認証コールバックは `kla://auth/callback` で受け取り、`app/login.tsx` の `Linking.addEventListener('url', handleDeepLink)` で処理しています。Supabase Dashboard のリダイレクト URL に `kla://auth/callback` を登録してください。

### ストア提出用

- `app.json` の `ios.bundleIdentifier` / `android.package` はデフォルトで `com.kla.app` です。必要に応じて変更してください。
- プライバシーポリシー・利用規約は **設定** と **サブスクリプション画面** からリンクされています。URL は環境変数で指定できます。

## 開発者向け

### E2E テスト（Maestro）

- シナリオ: `KLA/.maestro/flows/start-and-navigate.yaml`（起動 → タブ遷移の確認）
- 実行前に **Maestro CLI** をインストールし、シミュレータでアプリ（`com.kla.app`）を起動した状態で実行します。
- 実行: `cd KLA && npm run e2e:maestro`
- **注意**: 初回起動時はオンボーディングが表示されるため、「ホーム」の表示を前提にしたフローは失敗することがあります。オンボーディング完了済みの状態で実行することを推奨します。

### Supabase 型生成

- DB スキーマから TypeScript 型を生成する場合: `src/types/database.ts` を出力する npm script を用意しています。
- 手順:
  1. [Supabase CLI](https://supabase.com/docs/guides/cli) をインストールし、`supabase login` 済みにする。
  2. プロジェクトをリンク: `npx supabase link`（プロジェクト ID が `.supabase` に保存される）、または環境変数 `SUPABASE_PROJECT_REF` にプロジェクト ID を設定する。
  3. `npm run supabase:gen-types` を実行。生成された `src/types/database.ts` をインポートして利用できます。

### オフライン・キャッシュ

- **単語**: 起動時に AsyncStorage のキャッシュ（`kla_words_cache`）を読み、表示に利用します。続けて Supabase から取得し、成功時はキャッシュを更新。オフライン時はキャッシュのみで表示します。
- **文法**: 既存の AsyncStorage キャッシュ（`GRAMMAR_CACHE_KEY_PREFIX` + locale）を利用。取得失敗時はキャッシュをフォールバックします。

---
