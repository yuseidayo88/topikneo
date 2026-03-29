/**
 * grammarStore の単体テスト。loadGrammarFromSupabase / getGrammarLessonIdsByLevel をモックする。
 */
jest.mock('../store/profileStore', () => ({
  useProfileStore: {
    getState: () => ({ displayLanguage: 'ja' }),
  },
}));

import { useGrammarStore } from '../store/grammarStore';

jest.mock('../data/grammar', () => ({
  loadGrammarFromSupabase: jest.fn(),
  getGrammarLessonIdsByLevel: jest.fn((level: number) => (level >= 1 && level <= 6 ? [`g_L${level}_01`] : [])),
  getLoadedGrammarContentLocale: jest.fn(() => 'ko_ja'),
  GRAMMAR_LOAD_FAILED_CODE: 'GRAMMAR_LOAD_FAILED',
  hasGrammarData: jest.fn(() => true),
}));

const { loadGrammarFromSupabase } = require('../data/grammar');

beforeEach(() => {
  jest.clearAllMocks();
  useGrammarStore.setState({
    grammarLoaded: false,
    grammarLoading: false,
    grammarLoadError: null,
    lessonCountByLevel: undefined,
    grammarContentLocale: null,
  });
});

describe('grammarStore', () => {
  it('初期状態が期待どおり', () => {
    const state = useGrammarStore.getState();
    expect(state.grammarLoaded).toBe(false);
    expect(state.grammarLoadError).toBeNull();
    expect(state.lessonCountByLevel).toBeUndefined();
  });

  it('loadGrammarFromSupabase が成功すると grammarLoaded が true になり lessonCountByLevel が設定される', async () => {
    (loadGrammarFromSupabase as jest.Mock).mockResolvedValue(undefined);
    await useGrammarStore.getState().loadGrammarFromSupabase();
    const state = useGrammarStore.getState();
    expect(state.grammarLoaded).toBe(true);
    expect(state.grammarLoadError).toBeNull();
    expect(state.lessonCountByLevel).toBeDefined();
    expect(state.lessonCountByLevel![1]).toBe(1);
  });

  it('loadGrammarFromSupabase が失敗すると grammarLoadError にメッセージが入る', async () => {
    (loadGrammarFromSupabase as jest.Mock).mockRejectedValue(new Error('Network error'));
    await useGrammarStore.getState().loadGrammarFromSupabase();
    const state = useGrammarStore.getState();
    expect(state.grammarLoaded).toBe(true);
    expect(state.grammarLoadError).toBe('Network error');
  });
});
