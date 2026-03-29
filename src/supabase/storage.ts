import { supabase, isSupabaseConfigured } from './client';
import { DEFAULT_LOCALE, getWordsStoragePrefix, getGrammarStoragePrefix } from '../config/locale';
import { logger } from '../utils/logger';

/** Storage のバケット名（Supabase ダッシュボードで作成する） */
export const BUCKET_CONTENT = 'content';

/** 単語 JSON のパスプレフィックス（locale 対応）。例: words/ko_ja */
export const WORDS_PREFIX = getWordsStoragePrefix(DEFAULT_LOCALE);
/** 文法 JSON のパスプレフィックス。例: grammar/ko_ja */
export const GRAMMAR_PREFIX = getGrammarStoragePrefix(DEFAULT_LOCALE);

/**
 * バケット内の JSON ファイルを取得してパースする。
 * download が失敗した場合、公開 URL で fetch を試す（Public バケット用）。
 */
export async function fetchJsonFromStorage<T>(path: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase.storage.from(BUCKET_CONTENT).download(path);
  if (!error && data && typeof data.text === 'function') {
    try {
      let text = await data.text();
      text = text.replace(/^\uFEFF/, ''); // BOM 除去
      return JSON.parse(text) as T;
    } catch (_e) {
      const raw = await data.text().catch(() => '(read failed)');
      const snippet = raw.slice(0, 300).replace(/\n/g, ' ');
      logger.warn('[Supabase Storage] invalid JSON:', path, 'snippet:', snippet);
      return null;
    }
  }

  if (error) {
    logger.warn('[Supabase Storage] download error:', path, error.message);
  }

  // React Native/Expo では download の data が Blob でないことがあるため、公開 URL で取得
  const { data: urlData } = supabase.storage.from(BUCKET_CONTENT).getPublicUrl(path);
  const bustUrl = (() => {
    const u = urlData.publicUrl;
    const sep = u.includes('?') ? '&' : '?';
    return `${u}${sep}_cb=${Date.now()}`;
  })();
  try {
    const res = await fetch(bustUrl);
    if (!res.ok) {
      logger.warn('[Supabase Storage] public fetch failed:', path, res.status, res.statusText);
      return null;
    }
    let text = await res.text();
    text = text.replace(/^\uFEFF/, '');
    return JSON.parse(text) as T;
  } catch (e) {
    logger.warn('[Supabase Storage] public fetch error:', path, e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * 指定レベルの単語 JSON を取得（例: words_level1.json）
 */
export async function fetchWordsByLevel(level: number): Promise<unknown[] | null> {
  const path = `${WORDS_PREFIX}/words_level${level}.json`;
  return fetchJsonFromStorage<unknown[]>(path);
}

async function fetchGrammarJsonOnce(
  url: string,
  path: string
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn('[Supabase Storage] grammar fetch failed:', path, res.status, res.statusText);
      return { ok: false };
    }
    let text = await res.text();
    text = text.replace(/^\uFEFF/, '');
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch (e) {
    logger.warn('[Supabase Storage] grammar fetch error:', path, e instanceof Error ? e.message : e);
    return { ok: false };
  }
}

/** 文法データ取得のリトライ待機時間（ミリ秒） */
const GRAMMAR_FETCH_RETRY_DELAY_MS = 2000;

/**
 * 文法データ JSON を取得（locale 対応）。例: grammar/ko_ja/grammar.json
 * 失敗時は1回だけリトライする。
 */
export async function fetchGrammarJson(
  locale: import('../config/locale').ContentLocale = DEFAULT_LOCALE
): Promise<unknown | null> {
  const prefix = getGrammarStoragePrefix(locale);
  const path = `${prefix}/grammar.json`;
  if (!isSupabaseConfigured()) return null;

  const { data: urlData } = supabase.storage.from(BUCKET_CONTENT).getPublicUrl(path);
  const url = `${urlData.publicUrl}?t=${Date.now()}`;
  let result = await fetchGrammarJsonOnce(url, path);
  if (!result.ok) {
    await new Promise((r) => setTimeout(r, GRAMMAR_FETCH_RETRY_DELAY_MS));
    result = await fetchGrammarJsonOnce(`${urlData.publicUrl}?t=${Date.now()}`, path);
  }
  return result.ok ? result.data : null;
}

/** grammar.json と別ファイルで渡す見出し読み上げ用テキスト（任意） */
export type GrammarTitleSpeakOverlay = {
  /** 文法 item の id（例 g_153）→ TTS 用の韓国語 */
  byId?: Record<string, string>;
};

/**
 * `tts/ko/grammar_headings/readings.json` を取得（無ければ null）。
 * 見出しの読み上げは韓国語のみのためロケール別に分けない（全表示言語で共通）。
 */
export async function fetchGrammarTitleSpeakOverlay(): Promise<GrammarTitleSpeakOverlay | null> {
  return fetchJsonFromStorage<GrammarTitleSpeakOverlay>('tts/ko/grammar_headings/readings.json');
}

/**
 * 多言語対応時用: ロケールを指定して単語を取得（例: ko_ja, ko_en）
 */
export async function fetchWordsByLevelAndLocale(
  level: number,
  locale: string = DEFAULT_LOCALE
): Promise<unknown[] | null> {
  const prefix = getWordsStoragePrefix(locale as import('../config/locale').ContentLocale);
  const path = `${prefix}/words_level${level}.json`;
  return fetchJsonFromStorage<unknown[]>(path);
}
