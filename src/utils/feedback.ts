import { triggerLightImpact, triggerMediumImpact, triggerSelectionHaptic } from '@/src/utils/haptics';

export function runWithSelectionFeedback(action: () => void): void {
  void triggerSelectionHaptic();
  action();
}

export function runWithLightImpact(action: () => void): void {
  void triggerLightImpact();
  action();
}

export function runWithMediumImpact(action: () => void): void {
  void triggerMediumImpact();
  action();
}
