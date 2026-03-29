import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { BUCKET_CONTENT, fetchJsonFromStorage } from '../supabase/storage';
import { supabase } from '../supabase/client';
import { logger } from './logger';
import { useFeedbackStore } from '../store/feedbackStore';
import { grammarTitleForSpeech, type GrammarItem } from '../data/grammar';
import { sameGrammarHeadingSpeechText } from './grammarHeadingSpeech';
import { ensureAudioPlaybackMode } from './quizSoundEffects';

const MANIFEST_PATH_BY_PRESET = {
  female: 'tts/ko/topik1/manifest.json',
  male: 'tts/ko/topik1_male/manifest.json',
} as const;

const GRAMMAR_HEADING_MANIFEST_BY_PRESET = {
  female: 'tts/ko/grammar_headings/manifest.json',
  male: 'tts/ko/grammar_headings_male/manifest.json',
} as const;

type SourceType = 'word' | 'example';

type ManifestItem = {
  sourceType: SourceType;
  text: string;
  file: string;
};

type Manifest = {
  items?: ManifestItem[];
};

type GrammarHeadingManifestItem = {
  grammarId: string;
  text?: string;
  file: string;
};

type GrammarHeadingManifest = {
  items?: GrammarHeadingManifestItem[];
};

type SpeakOptions = {
  language?: string;
  rate?: number;
  volume?: number;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

const MAX_PRELOADED_SOUNDS = 24;

let currentSound: Audio.Sound | null = null;
let audioPathMap: Map<string, string> | null = null;
type GrammarHeadingManifestEntry = { file: string; text?: string };
let grammarHeadingAudioPathMap: Map<string, GrammarHeadingManifestEntry> | null = null;
let manifestMapInflight: Promise<Map<string, string>> | null = null;
let grammarHeadingManifestInflight: Promise<Map<string, GrammarHeadingManifestEntry>> | null = null;
let loadedPreset: 'female' | 'male' | null = null;
const preloadedByPath = new Map<string, Audio.Sound>();
const preloadingByPath = new Map<string, Promise<void>>();
const preloadOrder: string[] = [];

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?。]+$/g, '')
    .trim();
}

function makeKey(sourceType: SourceType, text: string): string {
  return `${sourceType}:${normalizeText(text)}`;
}

function resetCachesIfPresetChanged(): void {
  const preset = useFeedbackStore.getState().ttsVoicePreset;
  if (loadedPreset !== preset) {
    loadedPreset = preset;
    manifestMapInflight = null;
    grammarHeadingManifestInflight = null;
    audioPathMap = null;
    grammarHeadingAudioPathMap = null;
    void clearPreloadedSounds();
  }
}

async function fetchManifestJsonOnce<T>(path: string, label: string): Promise<T | null> {
  let data = await fetchJsonFromStorage<T>(path);
  if (data !== null) return data;
  await new Promise((r) => setTimeout(r, 400));
  data = await fetchJsonFromStorage<T>(path);
  if (data === null) {
    logger.warn('[GeneratedWordSpeech] manifest fetch failed after retry:', label);
  }
  return data;
}

async function stopCurrentAudio(): Promise<void> {
  if (!currentSound) return;
  const sound = currentSound;
  currentSound = null;
  try {
    await sound.stopAsync();
  } catch {
    // ignore
  }
}

async function clearPreloadedSounds(): Promise<void> {
  const sounds = Array.from(preloadedByPath.values());
  preloadedByPath.clear();
  preloadingByPath.clear();
  preloadOrder.length = 0;
  await Promise.all(sounds.map(async (s) => {
    try {
      await s.unloadAsync();
    } catch {
      // ignore
    }
  }));
}

async function ensureManifestMap(): Promise<Map<string, string>> {
  resetCachesIfPresetChanged();
  if (audioPathMap) return audioPathMap;
  if (manifestMapInflight) return manifestMapInflight;

  manifestMapInflight = (async () => {
    const preset = useFeedbackStore.getState().ttsVoicePreset;
    const path = MANIFEST_PATH_BY_PRESET[preset];
    const data = await fetchManifestJsonOnce<Manifest>(path, path);
    const map = new Map<string, string>();
    if (data === null) {
      return map;
    }
    const items = Array.isArray(data?.items) ? data.items : [];
    for (const item of items) {
      if (!item?.file || !item?.text || (item.sourceType !== 'word' && item.sourceType !== 'example')) continue;
      map.set(makeKey(item.sourceType, item.text), item.file);
    }
    audioPathMap = map;
    return map;
  })();

  try {
    return await manifestMapInflight;
  } finally {
    manifestMapInflight = null;
  }
}

async function ensureGrammarHeadingManifestMap(): Promise<Map<string, GrammarHeadingManifestEntry>> {
  resetCachesIfPresetChanged();
  if (grammarHeadingAudioPathMap) return grammarHeadingAudioPathMap;
  if (grammarHeadingManifestInflight) return grammarHeadingManifestInflight;

  grammarHeadingManifestInflight = (async () => {
    const preset = useFeedbackStore.getState().ttsVoicePreset;
    const path = GRAMMAR_HEADING_MANIFEST_BY_PRESET[preset];
    const data = await fetchManifestJsonOnce<GrammarHeadingManifest>(path, path);
    const map = new Map<string, GrammarHeadingManifestEntry>();
    if (data === null) {
      return map;
    }
    const items = Array.isArray(data?.items) ? data.items : [];
    for (const item of items) {
      if (!item?.file || typeof item.grammarId !== 'string' || !item.grammarId.trim()) continue;
      map.set(item.grammarId.trim(), { file: item.file, text: item.text });
    }
    grammarHeadingAudioPathMap = map;
    return map;
  })();

  try {
    return await grammarHeadingManifestInflight;
  } finally {
    grammarHeadingManifestInflight = null;
  }
}

function touchPreloadOrder(pathInBucket: string): void {
  const idx = preloadOrder.indexOf(pathInBucket);
  if (idx >= 0) preloadOrder.splice(idx, 1);
  preloadOrder.push(pathInBucket);
}

async function trimPreloadedSoundsIfNeeded(): Promise<void> {
  while (preloadOrder.length > MAX_PRELOADED_SOUNDS) {
    const oldest = preloadOrder.shift();
    if (!oldest) break;
    const sound = preloadedByPath.get(oldest);
    preloadedByPath.delete(oldest);
    preloadingByPath.delete(oldest);
    if (!sound) continue;
    try {
      await sound.unloadAsync();
    } catch {
      // ignore
    }
  }
}

async function ensurePreloadedSound(pathInBucket: string, volume = 1): Promise<Audio.Sound | null> {
  const cached = preloadedByPath.get(pathInBucket);
  if (cached) {
    touchPreloadOrder(pathInBucket);
    try {
      await cached.setVolumeAsync(volume);
    } catch {
      // ignore
    }
    return cached;
  }

  const inflight = preloadingByPath.get(pathInBucket);
  if (inflight) {
    await inflight;
    const loaded = preloadedByPath.get(pathInBucket) ?? null;
    if (loaded) {
      touchPreloadOrder(pathInBucket);
      try {
        await loaded.setVolumeAsync(volume);
      } catch {
        // ignore
      }
    }
    return loaded;
  }

  const task = (async () => {
    await ensureAudioPlaybackMode();
    const { data: urlData } = supabase.storage.from(BUCKET_CONTENT).getPublicUrl(pathInBucket);
    const uri = urlData.publicUrl;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, volume }
        );
        preloadedByPath.set(pathInBucket, sound);
        touchPreloadOrder(pathInBucket);
        await trimPreloadedSoundsIfNeeded();
        return;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    }
    logger.warn('[GeneratedWordSpeech] createAsync failed:', pathInBucket, lastErr instanceof Error ? lastErr.message : lastErr);
  })();

  preloadingByPath.set(pathInBucket, task);
  try {
    await task;
  } finally {
    preloadingByPath.delete(pathInBucket);
  }

  return preloadedByPath.get(pathInBucket) ?? null;
}

async function tryPlayGenerated(pathInBucket: string, options: SpeakOptions): Promise<boolean> {
  try {
    await stopCurrentAudio();
    const sound = await ensurePreloadedSound(pathInBucket, options.volume ?? 1);
    if (!sound) return false;
    try {
      await sound.setPositionAsync(0);
    } catch {
      // ignore
    }
    await sound.playAsync();
    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (!status.didJustFinish) return;
      if (currentSound === sound) currentSound = null;
      options.onDone?.();
    });
    return true;
  } catch (e) {
    logger.warn('[GeneratedWordSpeech] play failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

export async function stopGeneratedWordSpeechPlayback(): Promise<void> {
  Speech.stop();
  await stopCurrentAudio();
}

export async function preloadGeneratedWordSpeechManifest(): Promise<void> {
  try {
    await ensureManifestMap();
  } catch (e) {
    logger.warn('[GeneratedWordSpeech] preload failed:', e instanceof Error ? e.message : e);
  }
}

export async function speakWordWithGeneratedFallback(
  sourceType: SourceType,
  text: string,
  options: SpeakOptions
): Promise<void> {
  if (!normalizeText(text)) return;
  if (options.volume !== undefined && options.volume <= 0) return;
  Speech.stop();

  const map = await ensureManifestMap();
  const pathInBucket = map.get(makeKey(sourceType, text));
  if (pathInBucket) {
    const ok = await tryPlayGenerated(pathInBucket, options);
    if (ok) return;
  }

  Speech.speak(normalizeText(text), {
    language: options.language ?? 'ko-KR',
    rate: options.rate ?? 0.9,
    volume: options.volume,
    onDone: options.onDone,
    onStopped: options.onStopped,
    onError: options.onError,
  });
}

/** 文法カード見出し専用: `tts/ko/grammar_headings*` の manifest を grammarId で参照し、無ければ Expo Speech にフォールバック */
export async function speakGrammarHeading(item: GrammarItem, options: SpeakOptions): Promise<void> {
  if (options.volume !== undefined && options.volume <= 0) return;
  Speech.stop();

  const fallback = grammarTitleForSpeech(item);
  if (!normalizeText(fallback)) return;

  const map = await ensureGrammarHeadingManifestMap();
  const entry = map.get(item.id);
  const manifestText = entry?.text?.trim();
  const manifestMatches =
    entry?.file &&
    (manifestText == null ||
      manifestText === '' ||
      sameGrammarHeadingSpeechText(manifestText, fallback));
  if (manifestMatches && entry?.file) {
    const ok = await tryPlayGenerated(entry.file, options);
    if (ok) return;
  }

  Speech.speak(normalizeText(fallback), {
    language: options.language ?? 'ko-KR',
    rate: options.rate ?? 0.9,
    volume: options.volume,
    onDone: options.onDone,
    onStopped: options.onStopped,
    onError: options.onError,
  });
}

export async function preloadGeneratedWordSpeech(sourceType: SourceType, text: string): Promise<void> {
  if (!normalizeText(text)) return;
  const map = await ensureManifestMap();
  const pathInBucket = map.get(makeKey(sourceType, text));
  if (!pathInBucket) return;
  try {
    await ensurePreloadedSound(pathInBucket);
  } catch (e) {
    logger.warn('[GeneratedWordSpeech] preload item failed:', e instanceof Error ? e.message : e);
  }
}

export async function preloadGrammarHeadingAudio(item: GrammarItem): Promise<void> {
  const want = grammarTitleForSpeech(item);
  if (!normalizeText(want)) return;
  const map = await ensureGrammarHeadingManifestMap();
  const entry = map.get(item.id);
  if (!entry?.file) return;
  const manifestText = entry.text?.trim();
  if (
    manifestText != null &&
    manifestText !== '' &&
    !sameGrammarHeadingSpeechText(manifestText, want)
  ) {
    return;
  }
  try {
    await ensurePreloadedSound(entry.file);
  } catch (e) {
    logger.warn('[GeneratedWordSpeech] preload grammar heading failed:', e instanceof Error ? e.message : e);
  }
}
