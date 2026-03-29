# iOS Release Checklist

## やること一覧（テスト → リリース）

### フェーズ A: 課金が動くまで（TestFlight で購入できるようにする）

- [ ] **有料アプリ契約**（App Store Connect → 契約・税務・銀行）を有効にする ※済み
- [ ] **バージョンにビルドを選ぶ**（TOPIK NEO → 配信 → 1.0 → ビルドで TestFlight のビルドを選択）
- [ ] 有料契約・ビルド選択後、**数時間〜1日待って** TestFlight で課金「再試行」
- [ ] RevenueCat の **Product ID** と App Store Connect の **アプリ内課金** の Product ID が完全一致しているか確認

### フェーズ B: TestFlight で動作確認

- [ ] アプリ起動（クラッシュしないか）
- [ ] ログイン（Apple / メールなど）
- [ ] 単語・文法データが表示される（Supabase 接続 OK）
- [ ] 課金画面で **購入・復元** ができる（サンドボックス用 Apple ID でテスト）
- [ ] プライバシーポリシー・利用規約リンクが開ける
- [ ] 設定（通知・ハプティック・音声など）が期待どおり動く
- [ ] （任意）アカウント削除ができる

### フェーズ C: リリース前に必須（App Store 提出用）

- [ ] **App Store Connect** → TOPIK NEO → バージョン 1.0 で以下を埋める  
  - ビルドの選択  
  - 概要・キーワード・サポートURL（日本語）  
  - プレビューとスクリーンショット（6.5インチなど必須サイズ）  
  - 連絡先情報・カテゴリ・年齢制限（App 情報）
- [ ] EAS に **EXPO_PUBLIC_PRIVACY_POLICY_URL** と **EXPO_PUBLIC_TERMS_URL** を設定（未設定なら）
- [ ] EAS に Sentry 用の **SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN** を設定（Sentry運用時）
- [ ] Supabase の **delete-user** Edge Function をデプロイし、**SUPABASE_SERVICE_ROLE_KEY** を Secrets に設定

### フェーズ D: 審査提出

- [ ] App Store Connect でエラーが消えていることを確認
- [ ] **「審査用に追加」** をクリックして提出
- [ ] 審査結果を待つ

---

## 1. Secrets and environment

**EAS の Environment variables（expo.dev → プロジェクト → Environment variables）で production / preview に以下を設定すること。未設定だと TestFlight でクラッシュや動作不良の原因になる。**

- `EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY`（必須）
- `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`（課金利用時）
- `EXPO_PUBLIC_SENTRY_DSN`（Sentry 利用時）
- `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`（Sentry Expo プラグイン利用時）
- `EXPO_PUBLIC_PRIVACY_POLICY_URL` と `EXPO_PUBLIC_TERMS_URL`（公開用 URL）
- （任意）`EXPO_PUBLIC_IAP_PRODUCT_ID_MONTHLY` など。未設定時は `monthly` / `yearly` / `lifetime` を使用。
- Confirm the production bundle identifier is `com.kla.app`.

### TestFlight でクラッシュする場合

1. **EAS の環境変数**  
   production ビルドに上記が入っているか確認。設定し直したら **必ずビルドし直す**（環境変数はビルド時に埋め込まれる）。

2. **クラッシュログの取得**  
   - **iPhone**: 設定 → プライバシーとセキュリティ → 分析と改善 → 分析データ → アプリ名で絞り込み。該当ログを開いて「共有」で Mac に送る。  
   - **Mac + Xcode**: Xcode → Window → Organizer → Crashes。該当アプリのクラッシュを選択してスタックトレースを確認。  
   ログの「Exception Type」や最初のスタックフレームで、RevenueCat / Supabase / SQLite など原因モジュールを特定できる。

## 2. Supabase release prerequisites

- Run the required SQL in `supabase/schema.sql` and `supabase/migrations/`.
- Deploy the account-deletion function:

```bash
supabase functions deploy delete-user
```

- Set the function secret before release:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## 3. Automated checks

- Unit tests:

```bash
npm run test:unit
```

- Maestro flows after installing a preview or production build:

```bash
maestro test .maestro/flows/
```

## 4. Manual release checks

- Login with Apple, Google, and email.
- Purchase, restore, and upgrade/downgrade each subscription plan in a non-Expo-Go iOS build.
- Open privacy policy and terms links from the **設定** screen (`/settings`) and `subscription`.
- Delete an account from the app and confirm the user can no longer sign in.
- Verify reminders, haptics, and sound settings on a physical iPhone.

## 5. Build and submit

- Preview build:

```bash
npm run build:ios:preview
```

- Production build:

```bash
npm run build:ios:production
```

- Submit to App Store Connect:

```bash
npm run submit:ios:production
```
