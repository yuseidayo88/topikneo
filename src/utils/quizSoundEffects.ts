/**
 * クイズや開始操作の効果音。expo-av で再生。
 * 正解＝correct.wav、不正解＝incorrect.mp3、開始＝start.mp3。
 */
import { Audio } from 'expo-av';
import { useFeedbackStore } from '@/src/store/feedbackStore';

/** 正解音（correct.wav）は少し控えめに */
const CORRECT_VOLUME = 0.38;
/** 不正解音（incorrect.mp3）もやや控えめに */
const INCORRECT_VOLUME = 0.34;
/** 開始音（start.mp3）は短めなので控えめを維持 */
const START_VOLUME = 0.3;
/** 開始音と重なりすぎない最小限の待機 */
export const QUIZ_START_SPEECH_DELAY_MS = 80;
/** クイズ中の読み上げは全体より少しだけ抑える */
export const QUIZ_SPEECH_VOLUME = 0.72;
let audioModeSet = false;

function getConfiguredEffectVolume(baseVolume: number): number {
  const { soundEnabled, soundVolume } = useFeedbackStore.getState();
  if (!soundEnabled) return 0;
  const multiplier = soundVolume === 'low' ? 0.8 : soundVolume === 'high' ? 1.15 : 1;
  return Math.min(1, baseVolume * multiplier);
}

/**
 * 設定の音トグル／音量に応じた読み上げ音量（0〜1）。オフなら 0。
 * クイズ・ハングルパズル・単語／例文の再生で共通。
 */
export function getConfiguredSpeechVolume(baseVolume: number = QUIZ_SPEECH_VOLUME): number {
  return getConfiguredEffectVolume(baseVolume);
}

async function ensureAudioMode() {
  if (audioModeSet) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioModeSet = true;
  } catch {
    // 設定失敗時は再生のみ試行
  }
}

/** リモート MP3（生成 TTS）など expo-av 再生前に呼ぶ。効果音と同じモード（iOS マナーで無音になるのを防ぐ） */
export async function ensureAudioPlaybackMode(): Promise<void> {
  await ensureAudioMode();
}

async function playEffectSound(source: number, volume: number): Promise<void> {
  try {
    const finalVolume = getConfiguredEffectVolume(volume);
    if (finalVolume <= 0) return;
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(
      source,
      { shouldPlay: true, volume: finalVolume }
    );
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded && (s as { didJustFinishAndNotReset?: boolean }).didJustFinishAndNotReset) {
        sound.unloadAsync().catch(() => {});
      }
    });
    setTimeout(() => sound.unloadAsync().catch(() => {}), 2500);
  } catch {
    // 再生失敗時は静かに無視
  }
}

/** 正解時の短い効果音を再生。失敗時は無視。 */
export async function playCorrectSound(): Promise<void> {
  await playEffectSound(require('../../assets/sounds/correct.wav'), CORRECT_VOLUME);
}

/** 不正解時の短い効果音を再生。失敗時は無視。 */
export async function playIncorrectSound(): Promise<void> {
  await playEffectSound(require('../../assets/sounds/incorrect.mp3'), INCORRECT_VOLUME);
}

/** 開始時の短い効果音を再生。失敗時は無視。 */
export async function playStartSound(): Promise<void> {
  await playEffectSound(require('../../assets/sounds/start.mp3'), START_VOLUME);
}
