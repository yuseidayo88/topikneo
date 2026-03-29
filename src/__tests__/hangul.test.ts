import {
  decompose,
  build,
  isHangulSyllable,
  getSyllablesFromString,
  syllableToRomanization,
  CHO_LIST,
  JUNG_LIST,
  JONG_LIST,
} from '../utils/hangul';

describe('hangul', () => {
  describe('decompose', () => {
    it('한(cho=18,jung=0,jong=4) を分解する', () => {
      const 한 = '한';
      const d = decompose(한);
      expect(d).not.toBeNull();
      expect(d!.cho).toBe(18);
      expect(d!.jung).toBe(0);
      expect(d!.jong).toBe(4);
    });

    it('가(0,0,0) を分解する', () => {
      const 가 = '가';
      const d = decompose(가);
      expect(d).not.toBeNull();
      expect(d!.cho).toBe(0);
      expect(d!.jung).toBe(0);
      expect(d!.jong).toBe(0);
    });

    it('非ハングルは null', () => {
      expect(decompose('a')).toBeNull();
      expect(decompose('')).toBeNull();
      expect(decompose('日')).toBeNull();
    });
  });

  describe('build', () => {
    it('cho,jung,jong から 한 を組み立てる', () => {
      expect(build(18, 0, 4)).toBe('한');
    });
    it('가 を組み立てる', () => {
      expect(build(0, 0, 0)).toBe('가');
    });
  });

  describe('roundtrip', () => {
    it('decompose(build(c,j,o)) で元に戻る', () => {
      for (let cho = 0; cho < 19; cho++) {
        for (let jung = 0; jung < 21; jung++) {
          for (let jong = 0; jong < 28; jong++) {
            const s = build(cho, jung, jong);
            const d = decompose(s);
            expect(d).not.toBeNull();
            expect(d!.cho).toBe(cho);
            expect(d!.jung).toBe(jung);
            expect(d!.jong).toBe(jong);
          }
        }
      }
    });
  });

  describe('isHangulSyllable', () => {
    it('한 は true', () => expect(isHangulSyllable('한')).toBe(true));
    it('가 は true', () => expect(isHangulSyllable('가')).toBe(true));
    it('a は false', () => expect(isHangulSyllable('a')).toBe(false));
  });

  describe('getSyllablesFromString', () => {
    it('ハングルのみ抽出', () => {
      expect(getSyllablesFromString('한국어')).toEqual(['한', '국', '어']);
    });
    it('混在時はハングルだけ', () => {
      expect(getSyllablesFromString('Hello한글')).toEqual(['한', '글']);
    });
    it('空文字は空配列', () => {
      expect(getSyllablesFromString('')).toEqual([]);
    });
  });

  describe('syllableToRomanization', () => {
    it('가 → ga', () => {
      expect(syllableToRomanization('가')).toBe('ga');
    });
    it('한 はローマ字表記になる', () => {
      const r = syllableToRomanization('한');
      expect(r.length).toBeGreaterThan(0);
      expect(r).toBe('han');
    });
    it('非ハングルは空文字', () => {
      expect(syllableToRomanization('a')).toBe('');
    });
  });

  describe('constants', () => {
    it('CHO_LIST は 19 文字', () => expect(CHO_LIST.length).toBe(19));
    it('JUNG_LIST は 21 文字', () => expect(JUNG_LIST.length).toBe(21));
    it('JONG_LIST は 28（－含む）', () => expect(JONG_LIST.length).toBe(28));
  });
});
