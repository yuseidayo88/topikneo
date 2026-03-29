import { create } from 'zustand';
import type { ContentLocale } from '../config/locale';
import { initWordsFromSupabase, getWordLessonIdsByLevel, getActiveWordsContentLocale } from '../data/words';
import { getCommonStrings } from '../i18n/common';
import { getContentLocaleFromDisplayLanguage } from '../utils/contentLocale';
import { useProfileStore } from './profileStore';

/** `loadWordsFromSupabase` の並列呼び出しで、古い完了がストアを上書きしないようにする */
let wordsLoadGeneration = 0;

type WordsState = {
  wordsLoadedFromSupabase: boolean;
  wordsLoading: boolean;
  lessonCountByLevel: Record<number, number> | undefined;
  /** 取得失敗時のメッセージ（オフライン・ネットワークエラー等） */
  wordsLoadError: string | null;
  /** 最後に読み込みに成功したコンテンツロケール */
  wordsContentLocale: ContentLocale | null;
  loadWordsFromSupabase: (locale?: ContentLocale) => Promise<void>;
};

export const useWordsStore = create<WordsState>((set, get) => ({
  wordsLoadedFromSupabase: false,
  wordsLoading: false,
  lessonCountByLevel: undefined,
  wordsLoadError: null,
  wordsContentLocale: null,
  loadWordsFromSupabase: async (locale?: ContentLocale) => {
    const loc = locale ?? getContentLocaleFromDisplayLanguage(useProfileStore.getState().displayLanguage);
    const ui = useProfileStore.getState().displayLanguage;
    if (get().wordsLoading && get().wordsContentLocale === loc) return;
    const myGen = ++wordsLoadGeneration;
    set({
      wordsLoadError: null,
      wordsLoading: true,
      /** 読み込み完了を待たずにクイズ等が新ロケールで再計算されるようにする */
      wordsContentLocale: loc,
    });
    try {
      await initWordsFromSupabase(loc, ui);
      if (myGen !== wordsLoadGeneration) return;
      const lessonCountByLevel: Record<number, number> = {};
      for (let level = 1; level <= 6; level++) {
        lessonCountByLevel[level] = getWordLessonIdsByLevel(level).length;
      }
      set({
        wordsLoadedFromSupabase: true,
        wordsLoading: false,
        lessonCountByLevel,
        wordsContentLocale: getActiveWordsContentLocale(),
      });
    } catch (e) {
      if (myGen !== wordsLoadGeneration) return;
      const t = getCommonStrings(ui);
      const message = e instanceof Error ? e.message : t.wordsLoadFailed;
      const lessonCountByLevel: Record<number, number> = {};
      for (let level = 1; level <= 6; level++) {
        lessonCountByLevel[level] = getWordLessonIdsByLevel(level).length;
      }
      set({
        wordsLoadedFromSupabase: true,
        wordsLoading: false,
        wordsLoadError: message,
        lessonCountByLevel,
        wordsContentLocale: getActiveWordsContentLocale(),
      });
    }
  },
}));
