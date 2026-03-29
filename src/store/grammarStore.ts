import { create } from 'zustand';
import type { ContentLocale } from '../config/locale';
import {
  loadGrammarFromSupabase,
  getGrammarLessonIdsByLevel,
  getLoadedGrammarContentLocale,
  GRAMMAR_LOAD_FAILED_CODE,
} from '../data/grammar';
import { getCommonStrings } from '../i18n/common';
import { getContentLocaleFromDisplayLanguage } from '../utils/contentLocale';
import { useProfileStore } from './profileStore';

type GrammarState = {
  grammarLoaded: boolean;
  grammarLoading: boolean;
  grammarLoadError: string | null;
  lessonCountByLevel: Record<number, number> | undefined;
  grammarContentLocale: ContentLocale | null;
  loadGrammarFromSupabase: (locale?: ContentLocale) => Promise<void>;
};

export const useGrammarStore = create<GrammarState>((set, get) => ({
  grammarLoaded: false,
  grammarLoading: false,
  grammarLoadError: null,
  lessonCountByLevel: undefined,
  grammarContentLocale: null,
  loadGrammarFromSupabase: async (locale?: ContentLocale) => {
    if (get().grammarLoading) return;
    const loc = locale ?? getContentLocaleFromDisplayLanguage(useProfileStore.getState().displayLanguage);
    const ui = useProfileStore.getState().displayLanguage;
    const t = getCommonStrings(ui);
    set({ grammarLoadError: null, grammarLoading: true });
    try {
      await loadGrammarFromSupabase(loc);
      const lessonCountByLevel: Record<number, number> = {};
      for (let level = 1; level <= 6; level++) {
        lessonCountByLevel[level] = getGrammarLessonIdsByLevel(level).length;
      }
      set({
        grammarLoaded: true,
        grammarLoading: false,
        lessonCountByLevel,
        grammarLoadError: null,
        grammarContentLocale: getLoadedGrammarContentLocale() ?? loc,
      });
    } catch (e) {
      const message =
        e instanceof Error && e.message === GRAMMAR_LOAD_FAILED_CODE
          ? t.grammarLoadFailed
          : e instanceof Error
            ? e.message
            : t.grammarLoadFailed;
      const lessonCountByLevel: Record<number, number> = {};
      for (let level = 1; level <= 6; level++) {
        lessonCountByLevel[level] = getGrammarLessonIdsByLevel(level).length;
      }
      set({
        grammarLoaded: true,
        grammarLoading: false,
        grammarLoadError: message,
        lessonCountByLevel,
        grammarContentLocale: get().grammarContentLocale,
      });
    }
  },
}));
