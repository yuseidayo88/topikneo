/**
 * デバイスの表示言語を取得。初回起動時の既定 UI 言語に使う。
 */
import type { AppLocale } from '../i18n/appLocale';

export type DisplayLocale = AppLocale;

export function getDeviceDisplayLocale(): AppLocale {
  try {
    const { getLocales } = require('expo-localization');
    const locales = getLocales();
    const code = locales[0]?.languageCode?.toLowerCase?.();
    if (code === 'ja') return 'ja';
    if (code === 'zh') return 'zh';
    if (code === 'vi') return 'vi';
    if (code === 'es') return 'es';
    if (code === 'id') return 'id';
    if (code === 'th') return 'th';
    return 'en';
  } catch {
    return 'en';
  }
}
