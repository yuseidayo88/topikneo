# KLA 改善点一覧

コードベースを調査し、改善余地がある点をカテゴリ別にまとめました。優先度は「高」「中」「低」で示しています。

## 実装済み（要約）

- **ルート初期ロード**: 各 store の load を `void ...catch(()=>{})` で囲み、例外でアプリが落ちないようにした。**AppLoadErrorBanner** で単語・文法 load 失敗時に「データの読み込みに失敗しました」＋再試行ボタンを表示。**index.tsx** でオンボーディング load 失敗時も再試行＋「アプリを開く」フォールバックを追加。
- **ErrorBoundary**: ルートに加え、単語・文法・ホーム・チャット・保存・クイズ・設定・サブスク・マイページなど主要画面に `contextLabel` 付きで適用済み。
- **useThemeStyles**: `src/hooks/useThemeStyles.ts` を追加。全画面で利用。`cardShadowSubtle` に加え、設定フロー用の `flowShadow`（getSettingsFlowShadow）も返し、各画面の `useMemo(() => getSettingsFlowShadow(resolvedMode), ...)` を廃止。
- **チャット**: Realtime 購読の `onStatusChange` で接続エラー時にバナー表示＋タップで再購読。表示名変更モーダルを追加。FlatList の `initialNumToRender` / `maxToRenderPerBatch` / `windowSize` を設定。メッセージ行に `accessibilityRole="listitem"` と `accessibilityLabel` を追加。
- **ログ**: `src/utils/logger.ts` を追加し、`__DEV__` 時のみ出力。_layout の Supabase 未設定警告・subscription の IAP 失敗ログも logger に統一。
- **チャット DB**: `supabase/migrations/20250102_chat_messages_content_length.sql` で本文 2000 文字制限を追加。
- **DEFAULT_ROOM_NAME**: `chat.ts` で export し、用途をコメントで明記。
- **設定**: 「学習の目的を変更」項目を追加（オンボーディング画面へ遷移）。
- **.env.example**: 説明を追記。`docs/SETUP.md` と `supabase/README.md` にチャットマイグレーション手順を追加。README に Supabase 未設定時の注意を追記。
- **単体テスト**: Jest + ts-jest を導入。subscriptionStore / wordsStore / grammarStore / authStore / sm2 / hangul / timezone / words など（`npm test` で実行）。
- **テーマ**: ルート・vocabulary レイアウトで `getGlassBorder` を `getCardBorder` に変更。未使用の `TOKEN` / `SHADOW` export を settingsFlowTokens から削除。
- **クイズ結果画面**: 「単語一覧に戻る」「文法一覧に戻る」でクイズ開始画面へ戻るように変更。間違えた単語一覧にお気に入り登録・発音再生ボタンを追加。結果画面の import を `@/src` に統一し、useThemeStyles を利用。アクセシビリティで結果カードに `accessibilityRole="summary"`、間違えた単語セクションに `accessibilityRole="list"` / `listitem` を付与。
- **チャット RLS・レート制限**: `20250105_chat_messages_rate_limit.sql` で同一 sender_id あたり 1 分間に 20 件まで制限。`docs/CHAT_RLS_RATE_LIMIT.md` と `docs/SETUP.md`・`supabase/README.md` に 20250105 を追記。
- **チャット表示名**: ヘッダーサブタイトルにルーム名・表示名と「タップで変更」を表示。`DEFAULT_ROOM_NAME` をルーム名未設定時のフォールバックとして使用。チャット入力欄に `accessibilityLabel="メッセージを入力"` を追加。
- **getGlassBorder / getBackgroundGradient**: theme から削除済み。他モジュールからの参照がないことを確認したうえで削除。
- **ホーム**: `createHomeStyles` の useMemo 依存と意図をコメントで明記。
- **import パス**: `app/` 内の相対 import（`../src/`, `../../src/`, `../../../src/` 等）を `@/src/` に統一。
- **ログイン画面**: `app/login.tsx` を `src/features/login/` に分割（`loginStyles` / `loginConstants` / `LoggedInAccountView` / `SignInView`）。ルートは状態とハンドラの配線に集約。
- **SETUP.md**: Supabase CLI を使う場合の `supabase link` / `supabase db push` 手順を追記。
- **アクセシビリティ**: 単語・文法のレッスン一覧 FlatList の各項目に `accessibilityRole="listitem"` を付与。
- **単語オフラインキャッシュ**: `src/data/words.ts` で AsyncStorage（`kla_words_cache`）にキャッシュ。起動時キャッシュ復元 → Supabase 取得試行 → 成功時上書き保存。オフライン時はキャッシュのみ表示。TTL は設けずオフライン優先。
- **E2E（Maestro）**: `.maestro/flows/start-and-navigate.yaml`（ホーム〜単語タブ）、`.maestro/flows/chat-tab-smoke.yaml`（チャットタブ）を追加。`npm run e2e:maestro` で実行。実行時はオンボーディング完了済みの状態を推奨。
- **ログイン画面 i18n**: `getLoginUiStrings`（`src/i18n/login.ts`）でラベル・ボタン文言を ja/en 化。`SignInView` / `LoggedInAccountView` に反映。
- **サポート導線**: `EXPO_PUBLIC_SUPPORT_URL` と `SUPPORT_URL`（`src/constants/legal.ts`）。設定のアプリ情報から開く。`docs/SENTRY.md` で release / ソースマップ手順を記載。
- **Supabase 型生成**: `npm run supabase:gen-types` で `src/types/database.ts` を生成する script を追加。README に手順記載。未実行時用のプレースホルダー型を `src/types/database.ts` に用意。

---

## 1. アーキテクチャ・一貫性

### 1.1 ErrorBoundary の適用範囲（中）→ **対応済み**
- 単語・文法・ホーム・チャット・保存・クイズ・設定・サブスク・マイページに `contextLabel` 付き ErrorBoundary を適用済み。

### 1.2 テーマ API の二重化（低）→ **対応済み**
- `getGlassBorder` / `getBackgroundGradient` を theme から削除済み。他モジュールからの参照なし。

### 1.3 スタイル生成パターンの重複（中）→ **対応済み**
- `useThemeStyles()` で typography / cardShadow / cardBorder / flowShadow をまとめて返すようにし、全画面で利用。各画面の useMemo(getTypography, getCardShadow, getSettingsFlowShadow) を廃止済み。

---

## 2. エラーハンドリング・堅牢性

### 2.1 ルートでの初期ロード（高）→ **対応済み**
- AppLoadErrorBanner で単語・文法 load 失敗時にメッセージ＋再試行ボタンを表示。index ではオンボーディング load 失敗時に再試行＋「アプリを開く」を表示。

### 2.2 チャットの Realtime 購読エラー（中）→ **対応済み**
- `subscribeMessages` の `onStatusChange` で CHANNEL_ERROR / TIMED_OUT / CLOSED 時にバナー「接続できませんでした。タップして再接続」を表示し、タップで再購読（resubscribeCount インクリメント）を実装済み。

### 2.3 本番ログ（中）→ **対応済み**
- logger は __DEV__ 時のみ出力。_layout・subscription の console.warn を logger に統一。直接 console は logger 経由以外には残していない想定。

---

## 3. アクセシビリティ

### 3.1 アクセシビリティの抜け（中）
- **現状**: 主要な Pressable / ボタンには `accessibilityLabel` や `accessibilityRole` が付いているが、画面によって付いていない要素がある。
- **改善案**: タブバー・チャットのメッセージ行・リスト行・フォーム入力など、操作・情報の塊ごとに accessibilityLabel / accessibilityRole / accessibilityState を点検し、VoiceOver / TalkBack で意味が伝わるようにする。

### 3.2 フォーカス順序・グループ（低）
- **現状**: 複雑な画面（クイズ、パズル、チャット）で論理的なフォーカス順が明示されていない場合がある。
- **改善案**: `accessibilityViewIsModal` やグループ化（ランドマーク）で、スクリーンリーダーの読み順を整理する。

---

## 4. パフォーマンス

### 4.1 ホーム画面の createHomeStyles（中）
- **現状**: `createHomeStyles` が毎回 StyleSheet.create で新規オブジェクトを返している。useMemo の依存に `resolvedMode` が入っており、テーマ切り替え時は再生成でよいが、不要な再生成がないか確認の余地あり。
- **改善案**: 依存配列を必要最小限にし、styles の参照が安定するようにする。非常に大きなスタイルオブジェクトなら、スタイルを分割してメモ化する選択肢もある。

### 4.2 チャットのメッセージリスト（中）
- **現状**: FlatList で `keyExtractor={(item) => item.id}` を使用。メッセージが増えたときのパフォーマンスは FlatList 任せ。
- **改善案**: 必要に応じて `windowSize` / `maxToRenderPerBatch` / `initialNumToRender` を調整。Realtime で末尾に追加される前提なら、`inverted` を true にして「最新が下」の UX にすると、スクロール位置の管理が楽になる場合がある。

### 4.3 単語・文法データのキャッシュ（低）→ **対応済み**
- 単語も AsyncStorage（`kla_words_cache`）にキャッシュ。起動時キャッシュ復元のうえで Supabase 取得を試み、オフライン時はキャッシュのみ表示。文法は従来どおり AsyncStorage キャッシュをフォールバックに利用。いずれも TTL は設けずオフライン優先。

---

## 5. セキュリティ

### 5.1 チャットの RLS が「誰でも挿入可」（高）→ **本番方針は対応済み**
- **対応**: `migrations/20250107_chat_messages_insert_require_auth_optional.sql` で **PRO 契約かつログイン済み** のみ `INSERT` 可能に変更。あわせて `20250105` でレート制限。クライアントも未ログイン・非 PRO では送信 UI を出さない。
- **補足**: 古い DB にのみ当てはまる「誰でも挿入」の記述は、マイグレーション未適用の環境では残り得る。本番では `supabase/README.md` の手順で 20250107 まで適用すること。

### 5.2 チャット本文の長さ・サニタイズ（中）→ **長さ制限は対応済み**
- **対応済み**: DB の `content` に 2000 文字の CHECK 制約（20250102）および RLS の WITH CHECK（20250104）を追加済み。クライアントは `maxLength={500}` で入力制限。
- **残り**: 表示は React Native の Text のため XSS は起きにくい。将来 Web や埋め込み HTML を出す場合はサニタイズを検討する。

### 5.3 環境変数・秘密情報（低）
- **現状**: Supabase の URL/anon key は EXPO_PUBLIC_ でクライアントに露出。anon key は想定どおり公開用。
- **改善案**: 本番では Supabase の RLS とポリシーで守る前提をドキュメントに明記。他の秘密（API キー等）が .env に入る場合は EXPO_PUBLIC_ にしないよう注意する。

---

## 6. UX・表示

### 6.1 チャットの「参加人数」表示（低）
- **現状**: チャットヘッダーに「アプリ全体のチャット（1ルーム）」とだけ表示。参考画像のような「211人がチャット中」はない。
- **改善案**: リアルタイム参加者数は実装コストが高いため、まずは「テストルーム」などのルーム名を明確に表示。将来、presence やメッセージ送信者数の概算を表示する拡張を検討する。

### 6.2 チャットの送信者名変更（低）
- **現状**: `setSenderName` は chat.ts で export されているが、UI から呼ぶ設定画面がない。デフォルトは「ゲスト」。
- **改善案**: チャット画面のヘッダーや設定に「表示名を変更」を追加し、`setSenderName` を呼んでから再送信できるようにする。

### 6.3 オンボーディング・設定の導線（低）→ **一部対応済み**
- **対応**: 設定に「学習の目的を変更」があり、オンボーディング画面へ遷移できる。
- **残り**: 「きっかけ」など他フィールドの個別編集 UI が必要なら、同様に設定から辿れるようにする。

---

## 7. コード品質・保守性

### 7.1 未使用 export・定数（低）→ **DEFAULT_ROOM_NAME は利用中**
- **現状**: `DEFAULT_ROOM_NAME` は `app/(tabs)/chat.tsx` のルーム名フォールバックで使用。他に未使用の export があれば随時整理する。

### 7.2 型の厳格化（低）
- **現状**: 多くの画面で `useTheme()` の返り値や、スタイルの型が推論任せ。Supabase の返り値は `as ChatMessage` などでキャストしている箇所がある。
- **改善案**: Supabase の型生成（codegen）を導入し、`ChatMessage` 等を DB スキーマから生成する。それに合わせてキャストを減らす。

### 7.3 相対 import の深さ（低）→ **対応済み**
- **現状**: `app/` 内で深い相対パス（`../../../../../src/theme` 等）があった。
- **対応**: `app/` 内の相対 import を `@/src/` に統一。tsconfig の `paths` で `@/src/*` を利用。

---

## 8. テスト・品質保証

### 8.1 単体テスト（中）→ **導入済み**
- **現状**: Jest + ts-jest を利用。`npm test` で subscriptionStore / wordsStore / grammarStore / authStore / sm2 / hangul / timezone / words 等を実行。
- **残り**: 画面コンポーネントのテストやカバレッジ拡大は任意。

### 8.2 E2E テスト（低）→ **対応済み**
- Maestro で `start-and-navigate.yaml`（起動 → タブ遷移）と `chat-tab-smoke.yaml`（チャットタブ）を追加。`npm run e2e:maestro` で実行。オンボーディング完了済みの状態で実行することを推奨。

---

## 9. ドキュメント・運用

### 9.1 Supabase マイグレーションの実行方法（中）→ **対応済み**
- **対応**: `docs/SETUP.md` に初回セットアップの流れ（.env → マイグレーション順 → Replication）を記載。Supabase CLI 利用時は `supabase link` / `supabase db push` の手順を追記済み。

### 9.2 環境変数一覧（低）
- **現状**: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が client で参照されている。.env.example の有無は未確認。
- **改善案**: .env.example に必要な変数と説明を列挙し、新規開発者が迷わないようにする。

### 9.3 ルートの useEffect 依存（低）
- **現状**: `app/_layout.tsx` の `useEffect(() => { load(); loadWords...; loadGrammar...; }, []);` は依存配列が空。ESLint の exhaustive-deps では store の関数が変わるたびに実行されるべきかどうかは議論の余地あり。
- **改善案**: 意図的に「マウント時1回だけ」ならコメントで明記。store の関数を安定させる（useCallback や store 外に定義）と、依存配列を素直に書ける。

---

## 10. その他・軽微な点

- **getBackgroundGradient / getBackgroundGradientDirection**: theme から削除済み。
- **文法の locale**: ルートでは `loadGrammarFromSupabase()` を引数なしで呼んでおり、DEFAULT_LOCALE が使われる。設定で locale を切り替える機能がなければ現状でよいが、将来多言語対応する場合は store や設定から locale を渡す必要がある。
- **チャットの FlatList inverted**: 現在は `inverted={false}`。最新メッセージが下に来る一般的なチャットでは、`inverted={true}` にすると「末尾に追加」がパフォーマンス的に有利になる場合がある。UX は好みに応じて検討。

---

## 優先度別サマリ

| 優先度 | 項目 |
|--------|------|
| **高** | ルート初期ロードの try/catch とエラー表示（2.1）、チャット RLS・レート制限の本番適用確認（5.1） |
| **中** | ErrorBoundary の適用範囲（1.1）、スタイル用フックの共通化（1.3）、Realtime 購読エラー処理（2.2）、本番ログ方針（2.3）、アクセシビリティの抜け（3.1）、ホーム/チャットのパフォーマンス（4.1〜4.2）、チャット本文の制約・サニタイズ（5.2）、マイグレーション手順のドキュメント（9.1） |
| **低** | テーマ API の整理（1.2）、フォーカス順（3.2）、キャッシュ戦略（4.3）、環境変数・秘密（5.3）、参加人数・表示名変更（6.1〜6.2）、オンボーディング導線（6.3）、未使用定数・型・パス（7.1〜7.3）、E2E（8.2）、.env.example・useEffect コメント（9.2〜9.3）、その他軽微（10） |

必要に応じて、上記をタスク管理ツールに落とし込み、スプリント単位で対応するとよいです。
