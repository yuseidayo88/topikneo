import * as Haptics from 'expo-haptics';
import { useFeedbackStore } from '@/src/store/feedbackStore';

export function triggerSelectionHaptic(): Promise<void> {
  if (!useFeedbackStore.getState().hapticsEnabled) return Promise.resolve();
  return Haptics.selectionAsync().catch(() => {});
}

export function triggerLightImpact(): Promise<void> {
  if (!useFeedbackStore.getState().hapticsEnabled) return Promise.resolve();
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function triggerMediumImpact(): Promise<void> {
  if (!useFeedbackStore.getState().hapticsEnabled) return Promise.resolve();
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function triggerSuccessNotification(): Promise<void> {
  if (!useFeedbackStore.getState().hapticsEnabled) return Promise.resolve();
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function triggerWarningNotification(): Promise<void> {
  if (!useFeedbackStore.getState().hapticsEnabled) return Promise.resolve();
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
