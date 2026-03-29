import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ContentLocale } from '../config/locale';
import { DEFAULT_LOCALE } from '../config/locale';
import { getCommonStrings } from '../i18n/common';
import type { AppLocale } from '../i18n/appLocale';
import { FALLBACK_APP_LOCALE } from '../i18n/appLocale';
import { logger } from '../utils/logger';

/** 旧キー（ko_ja のみ）。読み取り後にロケール付きキーへ移行可能 */
const WORDS_CACHE_KEY_LEGACY = 'kla_words_cache';

function getWordsCacheKey(locale: ContentLocale): string {
  return `kla_words_cache_${locale}`;
}

// キャッシュは TTL なしでオフライン優先。常に Supabase 取得を試み、成功時のみ上書き保存する。

// フェーズ1: 1級のみローカル（ko_ja のみ）。英語版 ko_en は Supabase のみ。
const wordsLevel1 = require('../../assets/data/ko/words_level1.json') as WordItem[];

export interface WordItem {
  id: string;
  language: string;
  korean: string;
  reading: string;
  /** 表示言語の訳（日本語版 JSON では日本語。英語版では英語を格納） */
  japanese: string;
  topik_level: number;
  lesson_id: string;
  example: { korean: string; japanese: string };
}

function isWordItem(value: unknown): value is WordItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const example = item.example as Record<string, unknown> | undefined;
  return (
    typeof item.id === 'string' &&
    typeof item.language === 'string' &&
    typeof item.korean === 'string' &&
    typeof item.reading === 'string' &&
    typeof item.japanese === 'string' &&
    typeof item.topik_level === 'number' &&
    typeof item.lesson_id === 'string' &&
    !!example &&
    typeof example.korean === 'string' &&
    typeof example.japanese === 'string'
  );
}

function normalizeWordList(raw: unknown, level: number): WordItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isWordItem).filter((item) => item.topik_level === level);
}

const byLevelJa: Record<number, WordItem[]> = {
  1: wordsLevel1,
};

/** Supabase から取得した単語（レベル別）。未取得のレベルは未定義 */
let remoteByLevel: Record<number, WordItem[]> = {};

/** 現在 `getEffectiveByLevel` に効いているコンテンツロケール */
let activeWordsContentLocale: ContentLocale = DEFAULT_LOCALE;

/** 並列 `initWordsFromSupabase` で古い取得結果が後から上書きしないようにする */
let wordsLoadSeq = 0;

export function getActiveWordsContentLocale(): ContentLocale {
  return activeWordsContentLocale;
}

function getEffectiveByLevel(): Record<number, WordItem[]> {
  const out: Record<number, WordItem[]> = {};
  if (activeWordsContentLocale === 'ko_ja') {
    out[1] = byLevelJa[1];
  }
  for (const level of [1, 2, 3, 4, 5, 6]) {
    if (remoteByLevel[level]?.length) out[level] = remoteByLevel[level];
  }
  return out;
}

/** ローカルキャッシュを読み込み（オフライン・起動直後の表示用） */
async function loadWordsCache(locale: ContentLocale): Promise<Record<number, WordItem[]> | null> {
  try {
    let raw = await AsyncStorage.getItem(getWordsCacheKey(locale));
    if (!raw && locale === 'ko_ja') {
      raw = await AsyncStorage.getItem(WORDS_CACHE_KEY_LEGACY);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { updatedAt?: number; byLevel?: Record<string, WordItem[]> };
    if (!parsed?.byLevel || typeof parsed.byLevel !== 'object') return null;
    const byLevel: Record<number, WordItem[]> = {};
    for (const [k, v] of Object.entries(parsed.byLevel)) {
      const level = parseInt(k, 10);
      const normalized = normalizeWordList(v, level);
      if (level >= 1 && level <= 6 && normalized.length > 0) byLevel[level] = normalized;
    }
    if (Object.keys(byLevel).length === 0) return null;
    return byLevel;
  } catch (_e) {
    return null;
  }
}

/** ローカルに単語キャッシュを保存 */
async function saveWordsCache(locale: ContentLocale, byLevel: Record<number, WordItem[]>): Promise<void> {
  try {
    const payload: Record<string, WordItem[]> = {};
    for (const [k, v] of Object.entries(byLevel)) payload[k] = v;
    await AsyncStorage.setItem(
      getWordsCacheKey(locale),
      JSON.stringify({ updatedAt: Date.now(), byLevel: payload })
    );
  } catch (_e) {
    // 保存失敗は無視
  }
}

/**
 * Supabase が有効な場合、単語データを取得してキャッシュする。
 * @param contentLocale Storage の words/{locale}/
 * @param uiLocale エラー文言用（アプリ表示言語）
 */
export async function initWordsFromSupabase(
  contentLocale: ContentLocale = DEFAULT_LOCALE,
  uiLocale: AppLocale = 'ja'
): Promise<void> {
  const seq = ++wordsLoadSeq;
  /** 切替直後に「新ロケール + 旧 remote」の組み合わせで訳が混ざるのを防ぐ */
  remoteByLevel = {};
  activeWordsContentLocale = contentLocale;
  const t = getCommonStrings(uiLocale);

  const cacheData = await loadWordsCache(contentLocale);
  if (seq !== wordsLoadSeq) return;

  let hadCache = false;
  if (cacheData && Object.keys(cacheData).length > 0) {
    remoteByLevel = cacheData;
    hadCache = true;
    logger.log('[Words] キャッシュから単語を復元しました', contentLocale);
  }

  try {
    const { isSupabaseConfigured } = await import('../supabase/client');
    const { fetchWordsByLevelAndLocale } = await import('../supabase/storage');
    if (!isSupabaseConfigured()) {
      logger.warn('[Words] Supabase が未設定です（.env の URL/KEY を確認）');
      return;
    }

    const tryLocales: ContentLocale[] =
      contentLocale === 'ko_ja' || contentLocale === 'ko_en' ? [contentLocale] : [contentLocale, 'ko_en'];

    let next: Record<number, WordItem[]> = {};
    let loadedLocale: ContentLocale = contentLocale;

    for (const loc of tryLocales) {
      if (seq !== wordsLoadSeq) return;
      next = {};
      for (let level = 1; level <= 6; level++) {
        if (seq !== wordsLoadSeq) return;
        const list = await fetchWordsByLevelAndLocale(level, loc);
        const normalized = normalizeWordList(list, level);
        if (normalized.length > 0) {
          next[level] = normalized;
          logger.log(`[Words] Level ${level}: ${normalized.length} 語取得 (${loc})`);
        }
      }
      if (Object.keys(next).length > 0) {
        loadedLocale = loc;
        break;
      }
    }

    if (seq !== wordsLoadSeq) return;

    activeWordsContentLocale = loadedLocale;
    if (Object.keys(next).length > 0) {
      if (seq !== wordsLoadSeq) return;
      remoteByLevel = next;
      await saveWordsCache(loadedLocale, next);
      if (seq !== wordsLoadSeq) return;
      logger.log('[Words] Supabase から単語を読み込みました', loadedLocale);
    } else {
      logger.warn('[Words] 取得した単語がありません（Storage のパス・ポリシーを確認）', contentLocale);
    }
  } catch (e) {
    if (seq !== wordsLoadSeq) return;
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn('[Words] Supabase 取得エラー:', msg);
    if (!hadCache) {
      throw new Error(msg || t.wordsLoadFailed);
    }
    // キャッシュがある場合はそのまま利用（オフライン）
  }
}

export function getWordsByLessonId(lessonId: string): WordItem[] {
  const match = lessonId.match(/^ko_W(\d+)_\d+$/);
  const level = match ? parseInt(match[1], 10) : 1;
  const list = getEffectiveByLevel()[level] ?? [];
  return list.filter((w) => w.lesson_id === lessonId);
}

export function getWordsByLevel(level: number): WordItem[] {
  return getEffectiveByLevel()[level] ?? [];
}

/** 指定レベルのレッスンID一覧（単語データから取得、昇順） */
export function getWordLessonIdsByLevel(level: number): string[] {
  const words = getWordsByLevel(level);
  const ids = new Set<string>();
  for (const w of words) if (w.lesson_id) ids.add(w.lesson_id);
  return Array.from(ids).sort();
}

export function getWordsByIds(ids: string[]): WordItem[] {
  const set = new Set(ids);
  const out: WordItem[] = [];
  const effective = getEffectiveByLevel();
  for (const level of Object.keys(effective).map(Number)) {
    for (const w of effective[level]) {
      if (set.has(w.id)) out.push(w);
    }
  }
  return out;
}

const DUMMY_MEANINGS_JA = [
  'りんご', 'おはよう', '水', '本', '友達', '時間', '食べ物', '愛', '学校', 'ありがとう',
  '朝', '夜', '大きい', '小さい', '多い', '少ない', '良い', '悪い', '行く', '来る',
];

const DUMMY_MEANINGS_EN = [
  'apple', 'hello', 'water', 'book', 'friend', 'time', 'food', 'love', 'school', 'thanks',
  'morning', 'night', 'big', 'small', 'many', 'few', 'good', 'bad', 'go', 'come',
];

const DUMMY_MEANINGS_ZH = [
  '苹果', '你好', '水', '书', '朋友', '时间', '食物', '爱', '学校', '谢谢',
  '早上', '晚上', '大', '小', '多', '少', '好', '坏', '去', '来',
];

/** 語彙プールが足りないときのプレースホルダー（表示言語別） */
function fallbackMeaningOptionLabel(locale: AppLocale, index1: number): string {
  switch (locale) {
    case 'ja':
      return `選択肢${index1}`;
    case 'zh':
      return `选项${index1}`;
    case 'vi':
      return `Lựa chọn ${index1}`;
    case 'es':
      return `Opción ${index1}`;
    case 'id':
      return `Opsi ${index1}`;
    case 'th':
      return `ตัวเลือก ${index1}`;
    default:
      return `Option ${index1}`;
  }
}

const DUMMY_MEANINGS_BY_LOCALE: Record<AppLocale, string[]> = {
  ja: DUMMY_MEANINGS_JA,
  en: DUMMY_MEANINGS_EN,
  zh: DUMMY_MEANINGS_ZH,
  vi: DUMMY_MEANINGS_EN,
  es: DUMMY_MEANINGS_EN,
  id: DUMMY_MEANINGS_EN,
  th: DUMMY_MEANINGS_EN,
};

/**
 * 同じレベル・他レッスンの単語から訳を集め、不足分はダミーで補う（クイズの誤答用）。
 * `japanese` フィールドは表示言語の意味（日英いずれもこのキー名のまま）。
 */
export function getWrongMeaningOptions(
  level: number,
  lessonId: string,
  correctMeaning: string,
  count: number,
  uiLocale: AppLocale = 'ja'
): string[] {
  const all = getWordsByLevel(level).filter((w) => w.lesson_id !== lessonId && w.japanese !== correctMeaning);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const options: string[] = [];
  for (let i = 0; i < count && i < shuffled.length; i++) {
    options.push(shuffled[i].japanese);
  }
  const dummies = DUMMY_MEANINGS_BY_LOCALE[uiLocale] ?? DUMMY_MEANINGS_BY_LOCALE[FALLBACK_APP_LOCALE];
  const used = new Set(options);
  used.add(correctMeaning);
  let dummyIndex = 0;
  while (options.length < count) {
    const d = dummies[dummyIndex % dummies.length];
    dummyIndex += 1;
    if (!used.has(d)) {
      options.push(d);
      used.add(d);
    }
    if (dummyIndex > dummies.length * 2) {
      const label = fallbackMeaningOptionLabel(uiLocale, options.length + 1);
      options.push(label);
      used.add(label);
    }
  }
  return options.slice(0, count);
}

/** @deprecated 互換のため残す。`getWrongMeaningOptions(..., uiLocale)` を使用 */
export function getWrongJapaneseOptions(
  level: number,
  lessonId: string,
  correctJapanese: string,
  count: number
): string[] {
  return getWrongMeaningOptions(level, lessonId, correctJapanese, count, 'ja');
}
