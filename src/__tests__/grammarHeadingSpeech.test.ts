import { computeGrammarHeadingSpeechText, sameGrammarHeadingSpeechText } from '../utils/grammarHeadingSpeech';

describe('computeGrammarHeadingSpeechText', () => {
  it('英語だけの title / title_speak は無視し structure のハングルを使う', () => {
    const t = computeGrammarHeadingSpeechText(
      {
        id: 'g_031',
        title_speak: 'Before',
        title: 'Before ~',
        structure: '～기 전에',
      },
      undefined
    );
    expect(t).toBe('기 전에');
  });

  it('互換字母だけの見出しは空（発音しない）', () => {
    expect(
      computeGrammarHeadingSpeechText(
        { id: 'x1', title: 'ㄴ', title_speak: 'ㄴ', structure: '' },
        undefined
      )
    ).toBe('');
  });

  it('readings オーバーレイが英語のときはスキップして韓国語を拾う', () => {
    const t = computeGrammarHeadingSpeechText(
      {
        id: 'g_031',
        title_speak: 'Before',
        title: 'Before ~',
        structure: '～기 전에',
      },
      { g_031: 'Before' }
    );
    expect(t).toBe('기 전에');
  });

  it('正しい韓国語の title_speak を優先', () => {
    expect(
      computeGrammarHeadingSpeechText(
        { id: 'g_002', title_speak: '은, 는', title: '은/는', structure: '은/는' },
        undefined
      )
    ).toMatch(/은/);
  });
});

describe('sameGrammarHeadingSpeechText', () => {
  it('空白差のみなら同一', () => {
    expect(sameGrammarHeadingSpeechText('기  전에', '기 전에')).toBe(true);
  });
});
