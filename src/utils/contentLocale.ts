import type { ContentLocale } from '../config/locale';
import type { AppLocale } from '../i18n/appLocale';
import { FALLBACK_APP_LOCALE } from '../i18n/appLocale';

const DISPLAY_TO_CONTENT: Record<AppLocale, ContentLocale> = {
  ja: 'ko_ja',
  en: 'ko_en',
  zh: 'ko_zh',
  vi: 'ko_vi',
  es: 'ko_es',
  id: 'ko_id',
  th: 'ko_th',
};

/** アプリ UI 言語 → 単語・文法 JSON の Storage ロケール */
export function getContentLocaleFromDisplayLanguage(lang: AppLocale): ContentLocale {
  return DISPLAY_TO_CONTENT[lang] ?? DISPLAY_TO_CONTENT[FALLBACK_APP_LOCALE];
}
