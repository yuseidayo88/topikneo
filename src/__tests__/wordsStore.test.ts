/**
 * wordsStore の単体テスト。initWordsFromSupabase をモックして成功・失敗時の状態を検証する。
 */
jest.mock('../store/profileStore', () => ({
  useProfileStore: {
    getState: () => ({ displayLanguage: 'ja' }),
  },
}));

import { useWordsStore } from '../store/wordsStore';

jest.mock('../data/words', () => ({
  initWordsFromSupabase: jest.fn(),
  getWordLessonIdsByLevel: jest.fn((level: number) => (level >= 1 && level <= 6 ? [`ko_W${level}_01`] : [])),
  getActiveWordsContentLocale: jest.fn(() => 'ko_ja'),
}));

const { initWordsFromSupabase } = require('../data/words');

beforeEach(() => {
  jest.clearAllMocks();
  useWordsStore.setState({
    wordsLoadedFromSupabase: false,
    wordsLoading: false,
    lessonCountByLevel: undefined,
    wordsLoadError: null,
    wordsContentLocale: null,
  });
});

describe('wordsStore', () => {
  it('初期状態が期待どおり', () => {
    const state = useWordsStore.getState();
    expect(state.wordsLoadedFromSupabase).toBe(false);
    expect(state.wordsLoadError).toBeNull();
    expect(state.lessonCountByLevel).toBeUndefined();
  });

  it('loadWordsFromSupabase が成功すると wordsLoadedFromSupabase が true になり lessonCountByLevel が設定される', async () => {
    (initWordsFromSupabase as jest.Mock).mockResolvedValue(undefined);
    await useWordsStore.getState().loadWordsFromSupabase();
    const state = useWordsStore.getState();
    expect(state.wordsLoadedFromSupabase).toBe(true);
    expect(state.wordsLoadError).toBeNull();
    expect(state.lessonCountByLevel).toBeDefined();
    expect(state.lessonCountByLevel![1]).toBe(1);
  });

  it('loadWordsFromSupabase が失敗すると wordsLoadError にメッセージが入る', async () => {
    (initWordsFromSupabase as jest.Mock).mockRejectedValue(new Error('Network error'));
    await useWordsStore.getState().loadWordsFromSupabase();
    const state = useWordsStore.getState();
    expect(state.wordsLoadedFromSupabase).toBe(true);
    expect(state.wordsLoadError).toBe('Network error');
  });
});
