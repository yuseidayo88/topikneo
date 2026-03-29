# Sentry（クラッシュ・イベント）

## アプリ側の設定

`app/_layout.tsx` で `EXPO_PUBLIC_SENTRY_DSN` が設定されているときだけ `Sentry.init` します。

- **release**: `kla@${appVersion}`（`expo.version`）
- **dist**: iOS は `ios.buildNumber`、それ以外は `dev`
- **environment**: 開発ビルドは `development`、それ以外は `production`

本番のスタックトレースとソースを対応付けるには、**同じ release / dist** でソースマップを Sentry にアップロードしてください。

## EAS Build とソースマップ

`app.json` の `plugins` に `@sentry/react-native` が含まれており、ビルド時にソースマップをアップロードできます。

1. [Sentry Auth Token](https://docs.sentry.io/account/auth-tokens/)（`project:releases` 等）を発行する。
2. EAS のシークレットまたは `eas.json` の `env` に以下を設定する。
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`（組織スラッグ）
   - `SENTRY_PROJECT`（プロジェクトスラッグ）

3. 現状 `eas.json` の **preview / production** では `SENTRY_DISABLE_AUTO_UPLOAD=true` により自動アップロードを止めています。ソースマップを上げる場合はこの変数を外すか `false` にし、上記シークレットを設定したうえでビルドしてください。

アップロード後、Sentry の **Releases** で該当リリースにアーティファクトが紐づいているか確認します。

## 手動確認

開発時に `EXPO_PUBLIC_ENABLE_SENTRY_TEST_BUTTON=true` を設定すると、設定画面からテストイベントを送信できます。
