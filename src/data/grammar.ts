/**
 * 文法データ。Supabase の grammar/{locale}/grammar.json で管理。
 * 取得失敗時はローカルキャッシュ（AsyncStorage）をフォールバックに使用する。
 * キャッシュは TTL なしでオフライン優先（単語キャッシュと同様）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ContentLocale } from '../config/locale';
import { DEFAULT_LOCALE } from '../config/locale';
import { computeGrammarHeadingSpeechText } from '../utils/grammarHeadingSpeech';
import { finalizeGrammarHeadingSpeechText, hasHangulSyllables } from '../utils/grammarHeadingTtsStrip';

const GRAMMAR_CACHE_KEY_PREFIX = 'kla_grammar_';

/** Google TTS manifest を使う文法レッスン（ko_G{数字}_*。例: ko_G5_01） */
export function lessonUsesGeneratedGrammarTts(lessonId: string | undefined): boolean {
  return /^ko_G\d+_/.test(String(lessonId ?? ''));
}

/** 1レッスンあたりの文法数（表示・クイズ数算出用） */
export const GRAMMAR_PER_LESSON = 2;
/** 1文法あたりのクイズ数 */
export const QUIZ_PER_GRAMMAR = 5;

export interface GrammarItem {
  id: string;
  lesson_id: string;
  title: string;
  /**
   * 見出しの読み上げ専用（韓国語）。未指定時は `title` をそのまま使う。
   * 表記用の ～・/・(으)・孤立した ㄴ などは TTS が不自然になりやすいので、
   * 話すときの形だけを書く（例: 「～(으)ㄴ가 보다」→「는가 보다」）。
   */
  title_speak?: string;
  structure: string;
  /** 説明文（表示言語＝locale に依存） */
  explanation: string;
  /** 例文。translation は表示言語の訳 */
  examples: { korean: string; translation: string }[];
}

/** 穴埋めクイズ用（非推奨・並び替えに移行済み）。Supabase 互換のため型のみ残す */
export interface GrammarQuizItem {
  id: string;
  lesson_id: string;
  korean: string;
  answer: string;
  translation?: string;
  translation_full?: string;
}

/** 並び替えクイズ用。chunks は正しい語順の配列。 */
export interface GrammarReorderItem {
  id: string;
  lesson_id: string;
  /** 正しい語順のチャンク（単語・助詞など） */
  chunks: string[];
  /** 表示言語の訳（ヒント用）。多言語時は locale ごとの訳を入れる */
  translation?: string;
}

/** テスト用の並び替え問題（ko_G1_01, ko_G1_02 のみ）。chunks に句点は含めない（表示時に文末に . を付ける） */
const REORDER_ITEMS_TEST: GrammarReorderItem[] = [
  { id: 'ro_001', lesson_id: 'ko_G1_01', chunks: ['저', '는', '학생', '입니다'], translation: '私は学生です。' },
  { id: 'ro_002', lesson_id: 'ko_G1_01', chunks: ['이것', '은', '책', '입니다'], translation: 'これは本です。' },
  { id: 'ro_003', lesson_id: 'ko_G1_01', chunks: ['학교', '에', '갑니다'], translation: '学校に行きます。' },
  { id: 'ro_004', lesson_id: 'ko_G1_01', chunks: ['친구', '에게', '편지를', '보냅니다'], translation: '友達に手紙を送ります。' },
  { id: 'ro_005', lesson_id: 'ko_G1_02', chunks: ['사과', '를', '먹습니다'], translation: 'りんごを食べます。' },
  { id: 'ro_006', lesson_id: 'ko_G1_02', chunks: ['한국어', '를', '공부합니다'], translation: '韓国語を勉強します。' },
  { id: 'ro_007', lesson_id: 'ko_G1_02', chunks: ['이것', '은', '제', '의', '책', '입니다'], translation: 'これは私の本です。' },
];

export interface GrammarData {
  locale: string;
  items: GrammarItem[];
  quizItems: GrammarQuizItem[];
  lessonSummaries: Record<string, string>;
}

const EMPTY_DATA: GrammarData = {
  locale: 'ko_ja',
  items: [],
  quizItems: [],
  lessonSummaries: {},
};

type GrammarDataWithReorder = GrammarData & { reorderItems?: GrammarReorderItem[] };

let cached: GrammarDataWithReorder | null = null;
let cachedLocale: ContentLocale | null = null;

function isGrammarItem(value: unknown): value is GrammarItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.lesson_id === 'string' &&
    typeof item.title === 'string' &&
    (item.title_speak === undefined || typeof item.title_speak === 'string') &&
    typeof item.structure === 'string' &&
    typeof item.explanation === 'string' &&
    Array.isArray(item.examples) &&
    item.examples.every(
      (example) =>
        example &&
        typeof example === 'object' &&
        typeof (example as { korean?: unknown }).korean === 'string' &&
        typeof (example as { translation?: unknown }).translation === 'string'
    )
  );
}

function isGrammarQuizItem(value: unknown): value is GrammarQuizItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.lesson_id === 'string' &&
    typeof item.korean === 'string' &&
    typeof item.answer === 'string'
  );
}

function isGrammarReorderItem(value: unknown): value is GrammarReorderItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.lesson_id === 'string' &&
    Array.isArray(item.chunks) &&
    item.chunks.every((chunk) => typeof chunk === 'string') &&
    (item.translation === undefined || typeof item.translation === 'string')
  );
}

function normalizeGrammarData(raw: unknown, locale: ContentLocale): GrammarDataWithReorder {
  const d = raw as Record<string, unknown>;
  const base: GrammarData = {
    locale: (d?.locale as string) ?? locale,
    items: Array.isArray(d?.items) ? d.items.filter(isGrammarItem) : [],
    quizItems: Array.isArray(d?.quizItems) ? d.quizItems.filter(isGrammarQuizItem) : [],
    lessonSummaries: d?.lessonSummaries && typeof d.lessonSummaries === 'object' ? d.lessonSummaries as Record<string, string> : {},
  };
  const out: GrammarDataWithReorder = { ...base };
  if (Array.isArray(d?.reorderItems)) out.reorderItems = d.reorderItems.filter(isGrammarReorderItem);
  return out;
}

/** readings.json（tts/ko/grammar_headings/readings.json）の byId を items にマージ（同じ id があれば上書き） */
function mergeTitleSpeakOverlay(
  data: GrammarDataWithReorder,
  overlay: import('../supabase/storage').GrammarTitleSpeakOverlay | null
): GrammarDataWithReorder {
  const byId = overlay?.byId;
  if (!byId || typeof byId !== 'object') return data;
  const items = data.items.map((item) => {
    const ts = byId[item.id];
    if (typeof ts === 'string' && ts.trim().length > 0) {
      const stripped = finalizeGrammarHeadingSpeechText(ts.trim());
      if (hasHangulSyllables(stripped)) {
        return { ...item, title_speak: ts.trim() };
      }
    }
    return item;
  });
  return { ...data, items };
}

function isValidGrammarData(raw: unknown): raw is GrammarData {
  return raw !== null && typeof raw === 'object' && 'items' in raw && Array.isArray((raw as GrammarData).items);
}

/** ローカルに文法データを保存（オフライン・再試行失敗時のフォールバック用） */
async function saveGrammarCache(locale: ContentLocale, data: GrammarDataWithReorder): Promise<void> {
  try {
    await AsyncStorage.setItem(GRAMMAR_CACHE_KEY_PREFIX + locale, JSON.stringify(data));
  } catch (_e) {
    // 保存失敗は無視（取得は成功しているため）
  }
}

/** ローカルから文法データを読み込み */
async function loadGrammarCache(locale: ContentLocale): Promise<GrammarDataWithReorder | null> {
  try {
    const raw = await AsyncStorage.getItem(GRAMMAR_CACHE_KEY_PREFIX + locale);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidGrammarData(parsed)) return null;
    return normalizeGrammarData(parsed, locale);
  } catch (_e) {
    return null;
  }
}

/** loadGrammarFromSupabase が投げるエラー（grammarStore で表示言語の文言に差し替える） */
export const GRAMMAR_LOAD_FAILED_CODE = 'GRAMMAR_LOAD_FAILED';

/**
 * 1 ロケール分だけ取得を試みる。成功時は cached を設定して true。
 */
async function loadGrammarForLocaleOnce(locale: ContentLocale): Promise<boolean> {
  const { fetchGrammarJson, fetchGrammarTitleSpeakOverlay } = await import('../supabase/storage');
  const { isSupabaseConfigured } = await import('../supabase/client');
  if (!isSupabaseConfigured()) {
    const fallback = await loadGrammarCache(locale);
    if (fallback) {
      cached = fallback;
      cachedLocale = locale;
      return true;
    }
    cached = null;
    cachedLocale = locale;
    return false;
  }

  const data = await fetchGrammarJson(locale);
  if (data && isValidGrammarData(data)) {
    const normalized = normalizeGrammarData(data, locale);
    const overlay = await fetchGrammarTitleSpeakOverlay();
    const merged = mergeTitleSpeakOverlay(normalized, overlay);
    cached = merged;
    cachedLocale = locale;
    await saveGrammarCache(locale, merged);
    return true;
  }

  const fallback = await loadGrammarCache(locale);
  if (fallback) {
    cached = fallback;
    cachedLocale = locale;
    return true;
  }

  return false;
}

/**
 * Supabase から文法データを取得してキャッシュする。失敗時は1回リトライし、
 * それでも失敗した場合はローカルキャッシュがあればそれを使用する（オフライン対応）。
 *
 * 表示言語が英語（ko_en）のときは **ko_ja に自動フォールバックしない**。
 * フォールバックすると日本語の説明・訳がそのまま表示され、英語 JSON を用意しても気づけないため。
 * ko_en は `content` バケットの `grammar/ko_en/grammar.json` に配置すること。
 *
 * 見出し読み上げだけ別管理する場合は `tts/ko/grammar_headings/readings.json`（任意・全ロケール共通）を置く。
 */
export async function loadGrammarFromSupabase(locale: ContentLocale = DEFAULT_LOCALE): Promise<void> {
  /** 別ロケールの古いキャッシュを表示しない（切替直後に日本語が残るのを防ぐ） */
  if (cachedLocale !== null && cachedLocale !== locale) {
    cached = null;
    cachedLocale = null;
  }

  /** ko_zh 等が未アップロードのときは ko_en にフォールバック（英語表示）。ko_en は ko_ja に戻さない */
  const fallbacks: ContentLocale[] =
    locale === 'ko_ja' || locale === 'ko_en' ? [locale] : [locale, 'ko_en'];

  for (const loc of fallbacks) {
    const ok = await loadGrammarForLocaleOnce(loc);
    if (ok) return;
  }

  cached = null;
  cachedLocale = locale;
  throw new Error(GRAMMAR_LOAD_FAILED_CODE);
}

/** 現在メモリに載っている文法 JSON のロケール（フォールバック後は ko_ja のことがある） */
export function getLoadedGrammarContentLocale(): ContentLocale | null {
  return cachedLocale;
}

function getData(): GrammarData {
  if (cached == null) return EMPTY_DATA;
  return cached;
}

export function getGrammarByLessonId(lessonId: string): GrammarItem[] {
  return getData().items.filter((g) => g.lesson_id === lessonId);
}

/**
 * 見出しスピーカー・生成 TTS 用。
 * ko_en などで `title` / `title_speak` が英語だけのときは `structure`（韓国語パターン）にフォールバックする。
 * 表記の 〜～ は読み上げ前に除去。
 */
export function grammarTitleForSpeech(item: GrammarItem): string {
  return computeGrammarHeadingSpeechText(item, undefined);
}

export function getGrammarLessonIdsByLevel(level: number): string[] {
  const prefix = `ko_G${level}_`;
  const ids = new Set(getData().items.map((g) => g.lesson_id).filter((id) => id.startsWith(prefix)));
  return Array.from(ids).sort();
}

/** チャンク末尾の '.' を除去（表示時に文末に付けるため） */
function normalizeChunks(chunks: string[]): string[] {
  if (chunks.length > 0 && chunks[chunks.length - 1] === '.') {
    return chunks.slice(0, -1);
  }
  return chunks;
}

/** 並び替えクイズの問題を取得。Supabase に reorderItems があればそれを使い、なければテスト用データ（ko_G1_01, ko_G1_02）を返す */
export function getGrammarReorderItems(lessonId: string): GrammarReorderItem[] {
  const d = getData();
  const fromData = (d as GrammarData & { reorderItems?: GrammarReorderItem[] }).reorderItems;
  const raw = Array.isArray(fromData) && fromData.length > 0
    ? fromData.filter((r) => r.lesson_id === lessonId)
    : REORDER_ITEMS_TEST.filter((r) => r.lesson_id === lessonId);
  return raw.map((r) => ({ ...r, chunks: normalizeChunks(r.chunks) }));
}

/** レッスン一覧用の一言説明（例: 「～に ・ ～は」） */
export function getLessonSummary(lessonId: string): string {
  return getData().lessonSummaries[lessonId] ?? '';
}

/** 文法データが Supabase から読み込まれているか（空でないか） */
export function hasGrammarData(): boolean {
  const d = cached ?? EMPTY_DATA;
  return d.items.length > 0 || d.quizItems.length > 0;
}
