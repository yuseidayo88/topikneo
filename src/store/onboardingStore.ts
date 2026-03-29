import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding';

export type StudyPurpose = 'travel' | 'kpop' | 'topik' | 'work' | 'other' | null;
export type HowFound = 'search' | 'x' | 'tiktok' | 'instagram' | 'friend' | 'other' | null;
/** 韓国語レベル（Duolingo風「どのくらい？」の選択肢） */
export type KoreanLevel = 'beginner' | 'words' | 'conversation' | 'various' | 'detail' | null;

type OnboardingState = {
  /** `load()` 完了後 true（ブートストラップで先に読むと index の二重ローディングを防ぐ） */
  hydrated: boolean;
  isCompleted: boolean;
  studyPurpose: StudyPurpose;
  howFound: HowFound | null;
  /** 韓国語の自己申告レベル（オンボーディングで選択、将来のパーソナライズ用） */
  koreanLevel: KoreanLevel | null;
  /** 1日あたりの単語レッスン目標数（オンボーディングで設定、未設定時は1） */
  dailyGoalWordLessons: number;
  /** 1日あたりの文法レッスン目標数（オンボーディングで設定、未設定時は1） */
  dailyGoalGrammarLessons: number;
  /** 地域（IANAタイムゾーン）。null のときはデバイスのタイムゾーンを使う。「今日」の日付がこれに従う */
  userTimezone: string | null;
  reminderTime: string | null;
  load: () => Promise<void>;
  complete: (data: {
    studyPurpose: StudyPurpose;
    howFound: HowFound;
    koreanLevel?: KoreanLevel | null;
    reminderTime: string | null;
    dailyGoalWordLessons?: number;
    dailyGoalGrammarLessons?: number;
  }) => Promise<void>;
  /** 設定画面から1日の目標のみ更新（0＝目標なし可） */
  setDailyGoals: (wordLessons: number, grammarLessons: number) => Promise<void>;
  /** 設定画面から地域（タイムゾーン）を更新。null のときはデバイスに合わせる。「今日」の日付がこのタイムゾーンに従う */
  setUserTimezone: (timezone: string | null) => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hydrated: false,
  isCompleted: false,
  studyPurpose: null,
  howFound: null,
  koreanLevel: null,
  dailyGoalWordLessons: 1,
  dailyGoalGrammarLessons: 1,
  userTimezone: null,
  reminderTime: null,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        set({ isCompleted: false, hydrated: true });
        return;
      }
      const data = JSON.parse(raw);
      set({
        isCompleted: data.onboarding_completed === true,
        studyPurpose: data.study_purpose ?? null,
        howFound: (data.how_found === 'sns' ? 'other' : data.how_found) ?? null,
        koreanLevel: data.korean_level ?? null,
        dailyGoalWordLessons: typeof data.daily_goal_word_lessons === 'number' ? data.daily_goal_word_lessons : 1,
        dailyGoalGrammarLessons: typeof data.daily_goal_grammar_lessons === 'number' ? data.daily_goal_grammar_lessons : 1,
        userTimezone: typeof data.user_timezone === 'string' ? data.user_timezone : null,
        reminderTime: data.reminder_time ?? null,
        hydrated: true,
      });
    } catch {
      set({ isCompleted: false, hydrated: true });
    }
  },
  complete: async (data) => {
    const wordGoal = data.dailyGoalWordLessons ?? 1;
    const grammarGoal = data.dailyGoalGrammarLessons ?? 1;
    const current = get();
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        onboarding_completed: true,
        study_purpose: data.studyPurpose,
        how_found: data.howFound,
        korean_level: data.koreanLevel ?? undefined,
        reminder_time: data.reminderTime,
        daily_goal_word_lessons: wordGoal,
        daily_goal_grammar_lessons: grammarGoal,
        user_timezone: current.userTimezone ?? undefined,
      })
    );
    set({
      isCompleted: true,
      studyPurpose: data.studyPurpose,
      howFound: data.howFound,
      koreanLevel: data.koreanLevel ?? null,
      dailyGoalWordLessons: wordGoal,
      dailyGoalGrammarLessons: grammarGoal,
      reminderTime: data.reminderTime,
    });
  },
  setDailyGoals: async (wordLessons: number, grammarLessons: number) => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : {};
      const next = {
        ...data,
        daily_goal_word_lessons: wordLessons,
        daily_goal_grammar_lessons: grammarLessons,
      };
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      set({ dailyGoalWordLessons: wordLessons, dailyGoalGrammarLessons: grammarLessons });
    } catch {
      set({ dailyGoalWordLessons: wordLessons, dailyGoalGrammarLessons: grammarLessons });
    }
  },
  setUserTimezone: async (timezone: string | null) => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : {};
      const next = { ...data, user_timezone: timezone ?? undefined };
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      set({ userTimezone: timezone });
    } catch {
      set({ userTimezone: timezone });
    }
  },
}));
