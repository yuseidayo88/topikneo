import { isGrammarReorderAnswerCorrect } from '../utils/grammarReorder';

describe('isGrammarReorderAnswerCorrect', () => {
  it('インデックス順が正解と一致すれば正解', () => {
    expect(isGrammarReorderAnswerCorrect(['저', '는', '학생', '입니다'], [0, 1, 2, 3])).toBe(true);
  });

  it('同じ見た目のチャンクが2つある場合、語順として同じなら正解（「이」×2 など）', () => {
    const chunks = ['이', '책', '이', '좋아요'];
    expect(isGrammarReorderAnswerCorrect(chunks, [0, 1, 2, 3])).toBe(true);
    // プールで「이」を取り違えても、並んだ文は同じ
    expect(isGrammarReorderAnswerCorrect(chunks, [2, 1, 0, 3])).toBe(true);
  });

  it('語順が違えば不正解', () => {
    const chunks = ['이', '책', '이', '좋아요'];
    expect(isGrammarReorderAnswerCorrect(chunks, [1, 0, 2, 3])).toBe(false);
  });

  it('添字の欠け・重複は不正解', () => {
    expect(isGrammarReorderAnswerCorrect(['a', 'b'], [0, 0])).toBe(false);
    expect(isGrammarReorderAnswerCorrect(['a', 'b', 'c'], [0, 1])).toBe(false);
  });
});
