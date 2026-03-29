/**
 * SM-2 アルゴリズム（仕様書 §23）
 * 不正解=0、正解=5 のみ使用
 */
export interface Card {
  wordId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export function createCard(wordId: string): Card {
  return {
    wordId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
  };
}

export function calculateNextReview(card: Card, score: number): Card {
  if (score < 3) {
    return {
      ...card,
      interval: 1,
      repetitions: 0,
    };
  }
  const newEF = Math.max(
    1.3,
    card.easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
  );
  let newInterval: number;
  if (card.repetitions === 0) newInterval = 1;
  else if (card.repetitions === 1) newInterval = 6;
  else newInterval = Math.round(card.interval * newEF);

  return {
    ...card,
    easeFactor: newEF,
    interval: newInterval,
    repetitions: card.repetitions + 1,
  };
}

export function getNextReviewDate(card: Card): string {
  const d = new Date();
  d.setDate(d.getDate() + card.interval);
  return d.toISOString().slice(0, 10);
}
