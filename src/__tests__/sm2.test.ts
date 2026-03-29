import {
  createCard,
  calculateNextReview,
  getNextReviewDate,
  type Card,
} from '../utils/sm2';

describe('sm2', () => {
  describe('createCard', () => {
    it('初期カードを返す', () => {
      const card = createCard('word_1');
      expect(card.wordId).toBe('word_1');
      expect(card.easeFactor).toBe(2.5);
      expect(card.interval).toBe(0);
      expect(card.repetitions).toBe(0);
    });
  });

  describe('calculateNextReview', () => {
    it('不正解(score < 3)で interval=1, repetitions=0 にリセット', () => {
      const card: Card = { wordId: 'w1', easeFactor: 2.5, interval: 6, repetitions: 2 };
      const next = calculateNextReview(card, 0);
      expect(next.interval).toBe(1);
      expect(next.repetitions).toBe(0);
      expect(next.easeFactor).toBe(card.easeFactor);
    });

    it('正解(score >= 3)で repetitions が増え interval が伸びる', () => {
      const card = createCard('w1');
      const afterFirst = calculateNextReview(card, 5);
      expect(afterFirst.repetitions).toBe(1);
      expect(afterFirst.interval).toBe(1);

      const afterSecond = calculateNextReview(afterFirst, 5);
      expect(afterSecond.repetitions).toBe(2);
      expect(afterSecond.interval).toBe(6);

      const afterThird = calculateNextReview(afterSecond, 5);
      expect(afterThird.repetitions).toBe(3);
      expect(afterThird.interval).toBeGreaterThanOrEqual(6);
    });

    it('easeFactor は 1.3 未満にならない', () => {
      const card: Card = { wordId: 'w1', easeFactor: 1.3, interval: 1, repetitions: 1 };
      const next = calculateNextReview(card, 3);
      expect(next.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('getNextReviewDate', () => {
    it('interval 日後の日付文字列 YYYY-MM-DD を返す', () => {
      const card: Card = { wordId: 'w1', easeFactor: 2.5, interval: 3, repetitions: 1 };
      const dateStr = getNextReviewDate(card);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(dateStr)).toBe(true);
      const today = new Date();
      const expected = new Date(today);
      expected.setDate(expected.getDate() + 3);
      expect(dateStr).toBe(expected.toISOString().slice(0, 10));
    });
  });
});
