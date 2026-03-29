/**
 * プライバシーポリシー・利用規約・サポートページの URL。
 * 既定値は Notion 公開ページ。別ドメインに移す場合は .env または EAS Secrets の EXPO_PUBLIC_* で上書き。
 *
 * PRIVACY_POLICY_URL / TERMS_URL は本番でも必ず https の文字列になるよう、
 * 環境変数が無効・未設定でも最終フォールバックへ落とす。
 */
function normalizeLegalUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (/example\.com/i.test(trimmed) || /yourdomain\.com/i.test(trimmed)) return null;
  return trimmed;
}

/** normalize が通らない場合でもブラウザで開けるよう、同一 Notion をリテラルで保証 */
const HARD_FALLBACK_PRIVACY =
  'https://misty-market-659.notion.site/3293cd561519800f83d0d6f220e89d90?source=copy_link';
const HARD_FALLBACK_TERMS =
  'https://misty-market-659.notion.site/3293cd5615198007ba5dfbdb2b606319?source=copy_link';

/** 本番公開用（Notion）。EAS ビルドで EXPO_PUBLIC_* が未設定でも TestFlight / ストア版でリンクが動くようにする */
const DEFAULT_PRIVACY_POLICY_URL =
  'https://misty-market-659.notion.site/3293cd561519800f83d0d6f220e89d90?source=copy_link';
const DEFAULT_TERMS_URL =
  'https://misty-market-659.notion.site/3293cd5615198007ba5dfbdb2b606319?source=copy_link';

function resolvePrivacyPolicyUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_PRIVACY_POLICY_URL : undefined;
  return (
    normalizeLegalUrl(fromEnv) ??
    normalizeLegalUrl(DEFAULT_PRIVACY_POLICY_URL) ??
    HARD_FALLBACK_PRIVACY
  );
}

function resolveTermsUrl(): string {
  const fromEnv = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_TERMS_URL : undefined;
  return normalizeLegalUrl(fromEnv) ?? normalizeLegalUrl(DEFAULT_TERMS_URL) ?? HARD_FALLBACK_TERMS;
}

/** HTTPS ページまたは mailto:（サポート用） */
function normalizeSupportUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^mailto:/i.test(trimmed)) {
    if (/yourdomain\.com/i.test(trimmed) || /example\.com/i.test(trimmed)) return null;
    return trimmed;
  }
  return normalizeLegalUrl(trimmed);
}

/** デフォルトのサポート・お問い合わせ先（Notion）。EXPO_PUBLIC_SUPPORT_URL で上書き可 */
export const DEFAULT_SUPPORT_URL =
  'https://misty-market-659.notion.site/TOPIK-NEO-3293cd56151980d59732c45f51579535?source=copy_link';

/** お問い合わせ・サポート（公開ページまたは mailto:）。環境変数未設定時は Notion の公開ページを使う */
const HARD_FALLBACK_SUPPORT =
  'https://misty-market-659.notion.site/TOPIK-NEO-3293cd56151980d59732c45f51579535?source=copy_link';

export const SUPPORT_URL: string =
  normalizeSupportUrl(
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SUPPORT_URL : undefined
  ) ??
  normalizeSupportUrl(DEFAULT_SUPPORT_URL) ??
  HARD_FALLBACK_SUPPORT;

/** 常に非 null。本番で EXPO_PUBLIC_* が空・無効でも Notion 公開 URL にフォールバック */
export const PRIVACY_POLICY_URL: string = resolvePrivacyPolicyUrl();
export const TERMS_URL: string = resolveTermsUrl();

/**
 * Apple の標準ライセンス（Licensed Application End User License Agreement）。
 * App Store 審査ではサブスク購入フローに「利用規約（EULA）」として本リンクの提示が求められることがある。
 */
export const APPLE_STANDARD_EULA_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
