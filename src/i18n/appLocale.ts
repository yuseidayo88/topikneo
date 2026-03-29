/**
 * アプリ UI の表示言語（学習コンテンツの訳語ロケール ko_ja / ko_en とは別）
 */
export const APP_LOCALES = ['ja', 'en', 'zh', 'vi', 'es', 'id', 'th'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const FALLBACK_APP_LOCALE: AppLocale = 'en';

/** 設定・言語選択に表示するラベル（各言語の自国語名） */
export const APP_LOCALE_LABELS: Record<AppLocale, string> = {
  ja: '日本語',
  en: 'English',
  zh: '简体中文',
  vi: 'Tiếng Việt',
  es: 'Español',
  id: 'Bahasa Indonesia',
  th: 'ไทย',
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (APP_LOCALES as readonly string[]).includes(value);
}

export function coerceAppLocale(value: unknown, fallback: AppLocale): AppLocale {
  return isAppLocale(value) ? value : fallback;
}

/** `Intl` / `toLocaleDateString` 用（チャット日付・ホームカレンダーなど） */
export const APP_LOCALE_BCP47: Record<AppLocale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  zh: 'zh-CN',
  vi: 'vi-VN',
  es: 'es-ES',
  id: 'id-ID',
  th: 'th-TH',
};
