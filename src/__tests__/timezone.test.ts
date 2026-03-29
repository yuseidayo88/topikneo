import {
  getDateFromISOInTimezone,
  getDateOffsetInTimezone,
  getTodayInTimezone,
  TIMEZONE_OPTIONS,
} from '../utils/timezone';

describe('timezone', () => {
  describe('getDateFromISOInTimezone', () => {
    it('ISO 文字列を指定タイムゾーンの日付 YYYY-MM-DD に変換する', () => {
      // UTC 23:00 は Tokyo では翌日 08:00
      expect(getDateFromISOInTimezone('2025-02-20T23:00:00.000Z', 'Asia/Tokyo')).toBe('2025-02-21');
      expect(getDateFromISOInTimezone('2025-02-20T12:00:00.000Z', 'Asia/Tokyo')).toBe('2025-02-20');
    });
  });

  describe('getTodayInTimezone', () => {
    it('指定タイムゾーンで YYYY-MM-DD 形式の文字列を返す', () => {
      const result = getTodayInTimezone('Asia/Tokyo');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getDateOffsetInTimezone', () => {
    it('今日からオフセットした日付を YYYY-MM-DD で返す', () => {
      const today = getTodayInTimezone('UTC');
      const offset0 = getDateOffsetInTimezone('UTC', 0);
      expect(offset0).toBe(today);
    });
  });

  describe('TIMEZONE_OPTIONS', () => {
    it('日本と韓国を含む', () => {
      const values = TIMEZONE_OPTIONS.map((o) => o.value);
      expect(values).toContain('Asia/Tokyo');
      expect(values).toContain('Asia/Seoul');
    });
  });
});
