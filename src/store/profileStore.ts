import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceDisplayLocale } from '../utils/deviceLocale';
import { coerceAppLocale, type AppLocale } from '../i18n/appLocale';
import { useAuthStore } from './authStore';

const STORAGE_KEY_PREFIX = 'kla_profile';

/** 学習レベル（自己申告） */
export type StudyLevelKey = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | '';

/** @deprecated getStudyLevelLabels(locale) を使用 */
export const STUDY_LEVEL_LABELS: Record<Exclude<StudyLevelKey, ''>, string> = {
  beginner: '初級（はじめて）',
  elementary: '初中級',
  intermediate: '中級',
  advanced: '上級',
};

/** アプリ表示言語 */
export type DisplayLanguage = AppLocale;

export type ProfilePayload = {
  /** 名前（表示名）プロフィールに表示する名前 */
  name: string;
  /** ユーザー名（@ハンドル） */
  displayName: string;
  email: string;
  bio: string;
  nativeLanguage: string;
  studyLevel: StudyLevelKey;
  displayLanguage: DisplayLanguage;
};

export type ProfileState = ProfilePayload & {
  load: () => Promise<void>;
  save: (data: Partial<ProfilePayload>) => Promise<void>;
  clear: () => Promise<void>;
};

/** 保存データがないときの初期値。displayLanguage は load() で端末言語に合わせるためここでは仮値。 */
const defaultPayload = (displayLanguage: DisplayLanguage): ProfilePayload => ({
  name: '',
  displayName: '',
  email: '',
  bio: '',
  nativeLanguage: '日本語',
  studyLevel: '',
  displayLanguage,
});

/** 起動直後の表示言語（load 前） */
const initialPayload = defaultPayload(getDeviceDisplayLocale());

function getScopedProfileStorageKey(): string {
  const userId = useAuthStore.getState().user?.id;
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : `${STORAGE_KEY_PREFIX}:local`;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...initialPayload,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(getScopedProfileStorageKey());
      const deviceLocale = getDeviceDisplayLocale();
      const user = useAuthStore.getState().user;
      if (!raw) {
        set({ ...defaultPayload(deviceLocale), email: user?.email ?? '' });
        return;
      }
      const data = JSON.parse(raw) as Partial<ProfilePayload>;
      const savedLang = coerceAppLocale(data.displayLanguage, deviceLocale);
      set({
        name: data.name ?? '',
        displayName: data.displayName ?? '',
        email: data.email ?? user?.email ?? '',
        bio: data.bio ?? '',
        nativeLanguage: data.nativeLanguage ?? '日本語',
        studyLevel: (data.studyLevel as StudyLevelKey) ?? '',
        displayLanguage: savedLang,
      });
    } catch {
      set({ ...defaultPayload(getDeviceDisplayLocale()), email: useAuthStore.getState().user?.email ?? '' });
    }
  },
  save: async (partial) => {
    const prev = get();
    const user = useAuthStore.getState().user;
    const next: ProfilePayload = {
      name: partial.name ?? prev.name,
      displayName: partial.displayName ?? prev.displayName,
      email: partial.email ?? prev.email ?? user?.email ?? '',
      bio: partial.bio ?? prev.bio,
      nativeLanguage: partial.nativeLanguage ?? prev.nativeLanguage,
      studyLevel: partial.studyLevel !== undefined ? partial.studyLevel : prev.studyLevel,
      displayLanguage: partial.displayLanguage ?? prev.displayLanguage,
    };
    set(next);
    try {
      await AsyncStorage.setItem(getScopedProfileStorageKey(), JSON.stringify(next));
    } catch {
      // ignore
    }
  },
  clear: async () => {
    set({ ...defaultPayload(getDeviceDisplayLocale()), email: useAuthStore.getState().user?.email ?? '' });
    try {
      await AsyncStorage.removeItem(getScopedProfileStorageKey());
    } catch {
      // ignore
    }
  },
}));
