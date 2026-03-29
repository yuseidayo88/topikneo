import { lessonUsesGeneratedGrammarTts } from '../data/grammar';

describe('lessonUsesGeneratedGrammarTts', () => {
  it('ko_G1〜G6 のレッスンで true', () => {
    expect(lessonUsesGeneratedGrammarTts('ko_G1_01')).toBe(true);
    expect(lessonUsesGeneratedGrammarTts('ko_G3_02')).toBe(true);
    expect(lessonUsesGeneratedGrammarTts('ko_G6_99')).toBe(true);
  });

  it('ko_G で始まる文法レッスンは true（レベル番号は任意）', () => {
    expect(lessonUsesGeneratedGrammarTts('ko_G7_01')).toBe(true);
  });

  it('単語レッスンや未定義では false', () => {
    expect(lessonUsesGeneratedGrammarTts('ko_W1_01')).toBe(false);
    expect(lessonUsesGeneratedGrammarTts(undefined)).toBe(false);
  });
});
