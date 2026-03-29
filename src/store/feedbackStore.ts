import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kla_feedback_settings';

export type FeedbackVolumeKey = 'low' | 'standard' | 'high';
export type TtsVoicePreset = 'female' | 'male';

export type FeedbackSettingsPayload = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  soundVolume: FeedbackVolumeKey;
  ttsVoicePreset: TtsVoicePreset;
};

type FeedbackSettingsState = FeedbackSettingsPayload & {
  load: () => Promise<void>;
  save: (partial: Partial<FeedbackSettingsPayload>) => Promise<void>;
};

const defaultPayload: FeedbackSettingsPayload = {
  soundEnabled: true,
  hapticsEnabled: true,
  soundVolume: 'standard',
  ttsVoicePreset: 'female',
};

export const useFeedbackStore = create<FeedbackSettingsState>((set, get) => ({
  ...defaultPayload,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set(defaultPayload);
        return;
      }
      const data = JSON.parse(raw) as Partial<FeedbackSettingsPayload>;
      set({
        soundEnabled: data.soundEnabled ?? defaultPayload.soundEnabled,
        hapticsEnabled: data.hapticsEnabled ?? defaultPayload.hapticsEnabled,
        soundVolume: data.soundVolume === 'low' || data.soundVolume === 'high' ? data.soundVolume : 'standard',
        ttsVoicePreset: data.ttsVoicePreset === 'male' ? 'male' : 'female',
      });
    } catch {
      set(defaultPayload);
    }
  },
  save: async (partial) => {
    const prev = get();
    const next: FeedbackSettingsPayload = {
      soundEnabled: partial.soundEnabled ?? prev.soundEnabled,
      hapticsEnabled: partial.hapticsEnabled ?? prev.hapticsEnabled,
      soundVolume: partial.soundVolume ?? prev.soundVolume,
      ttsVoicePreset: partial.ttsVoicePreset ?? prev.ttsVoicePreset,
    };
    set(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  },
}));
