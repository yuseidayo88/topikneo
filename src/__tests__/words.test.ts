import {
  getWordsByLevel,
  getWordLessonIdsByLevel,
  getWordsByLessonId,
  type WordItem,
} from '../data/words';

describe('words', () => {
  describe('getWordsByLevel', () => {
    it('レベル1の単語配列を返す', () => {
      const list = getWordsByLevel(1);
      expect(Array.isArray(list)).toBe(true);
      if (list.length > 0) {
        const w = list[0];
        expect(w).toHaveProperty('id');
        expect(w).toHaveProperty('korean');
        expect(w).toHaveProperty('japanese');
        expect(w).toHaveProperty('lesson_id');
      }
    });

    it('未取得のレベルは空配列', () => {
      const list = getWordsByLevel(99);
      expect(list).toEqual([]);
    });
  });

  describe('getWordLessonIdsByLevel', () => {
    it('レベル1のレッスンID一覧がソート済み・ユニーク', () => {
      const ids = getWordLessonIdsByLevel(1);
      expect(Array.isArray(ids)).toBe(true);
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getWordsByLessonId', () => {
    it('存在する lesson_id でそのレッスンの単語のみ返す', () => {
      const ids = getWordLessonIdsByLevel(1);
      if (ids.length === 0) return;
      const lessonId = ids[0];
      const list = getWordsByLessonId(lessonId);
      expect(Array.isArray(list)).toBe(true);
      list.forEach((w: WordItem) => {
        expect(w.lesson_id).toBe(lessonId);
      });
    });

    it('存在しない lesson_id で空配列', () => {
      const list = getWordsByLessonId('ko_W1_999');
      expect(list).toEqual([]);
    });
  });
});
