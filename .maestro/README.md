# E2E テスト（Maestro）

主要フローを Maestro で自動化しています。

## 前提

- [Maestro CLI](https://maestro.mobile.dev/docs/getting-started/installation) をインストールする
- シミュレータ（iOS）またはエミュレータ（Android）でアプリを起動した状態で実行するか、`launchApp` 用の appId を設定する

## 実行方法

```bash
# 全フロー実行
maestro test .maestro/flows/

# 単語クイズ 1 問 → 結果までのフロー
maestro run .maestro/flows/word_quiz.yaml

# 文法並び替え 1 問のフロー
maestro run .maestro/flows/grammar_quiz.yaml
```

## appId について

- **Expo Go** で試す場合: 各 YAML の `launchApp` の代わりに `openLink: "exp://127.0.0.1:8081"` を先に実行するか、手動でアプリを開いてから `maestro run` する
- **開発ビルド / 本番ビルド**: `app.json` の `expo.ios.bundleIdentifier` と `expo.android.package` を設定し、`.maestro/flows/*.yaml` の `appId` をその値に合わせる

## フロー概要

| ファイル | 内容 |
|----------|------|
| `word_quiz.yaml` | ホーム → 単語 → 入門 → レッスン1 → クイズ開始 → 1問解答 → 結果表示 |
| `grammar_quiz.yaml` | ホーム → 文法 → TOPIK 1級 → レッスン1 → クイズ開始 → 1問並び替え → 確認 → 正解表示 |

多くのステップは `optional: true` にしてあり、データ未読み込みや文言差異でも可能な範囲で通過します。リグレッション検知用に「結果画面」「正解!」の assert を入れています。
