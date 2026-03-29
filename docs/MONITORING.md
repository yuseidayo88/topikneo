# 監視運用メモ

## 現在の実装

- `@sentry/react-native` を導入済み。
- `app/_layout.tsx` で起動時に `Sentry.init` を実行（`EXPO_PUBLIC_SENTRY_DSN` がある場合のみ）。
- `src/utils/monitoring.ts` を共通窓口にして、例外・breadcrumb を Sentry へ送信。
- `ErrorBoundary` から例外情報を `captureException` に渡すように変更済み。

## 設定

`.env` に以下を設定:

`EXPO_PUBLIC_SENTRY_DSN=<your_dsn>`

## 最低限の確認項目

- 例外発生時に `captureException` が呼ばれること
- AppState 変化が breadcrumb として記録されること
- 監視導入後、個人情報を誤送信しないこと（メッセージ本文・メール等のマスキング）
