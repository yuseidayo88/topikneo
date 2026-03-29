/**
 * 設定可能なタイムゾーンに基づく「今日」の日付など。
 * 日本以外の地域でも、設定した国・地域に合わせて「今日」が変動する。
 */

/** 指定タイムゾーンでの「今日」を YYYY-MM-DD で返す */
export function getTodayInTimezone(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

/** 指定タイムゾーンでの「昨日」を YYYY-MM-DD で返す */
export function getYesterdayInTimezone(timezone: string): string {
  const todayStr = getTodayInTimezone(timezone);
  const [y, m, d] = todayStr.split('-').map(Number);
  const yesterdayUtc = new Date(Date.UTC(y, m - 1, d - 1));
  return yesterdayUtc.toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * 指定タイムゾーンで、今日から daysOffset 日ずらした日付を YYYY-MM-DD で返す。
 * daysOffset: 0 = 今日, -1 = 昨日, -6 = 6日前
 */
export function getDateOffsetInTimezone(timezone: string, daysOffset: number): string {
  const todayStr = getTodayInTimezone(timezone);
  const [y, m, d] = todayStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + daysOffset));
  return target.toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * ISO 日時文字列を、指定タイムゾーンでの「日付」YYYY-MM-DD に変換する。
 * 例: "2025-02-20T23:00:00.000Z" + "Asia/Tokyo" → "2025-02-21"
 */
export function getDateFromISOInTimezone(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-CA', { timeZone: timezone });
}

/** デバイスのタイムゾーン（例: Asia/Tokyo）を返す。未設定時のデフォルトに使う */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Asia/Tokyo';
  }
}

/** 設定画面用: よく使うタイムゾーン一覧（IANA）。表示名付き */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Tokyo', label: '日本' },
  { value: 'Asia/Seoul', label: '韓国' },
  { value: 'America/New_York', label: 'アメリカ（東部）' },
  { value: 'America/Los_Angeles', label: 'アメリカ（西部）' },
  { value: 'Europe/London', label: 'イギリス' },
  { value: 'Europe/Paris', label: 'フランス' },
  { value: 'Australia/Sydney', label: 'オーストラリア（シドニー）' },
  { value: 'Asia/Shanghai', label: '中国' },
  { value: 'Asia/Singapore', label: 'シンガポール' },
  { value: 'Asia/Bangkok', label: 'タイ' },
  { value: 'Asia/Jakarta', label: 'インドネシア' },
  { value: 'Asia/Kolkata', label: 'インド' },
  { value: 'America/Sao_Paulo', label: 'ブラジル（サンパウロ）' },
  { value: 'Africa/Cairo', label: 'エジプト' },
];
