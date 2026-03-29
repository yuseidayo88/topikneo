import {
  finalizeGrammarHeadingSpeechText,
  hasHangulSyllables,
  normalizeGrammarHeadingSpeechWhitespace,
} from './grammarHeadingTtsStrip';

export type GrammarHeadingFields = {
  id: string;
  title_speak?: string;
  title?: string;
  structure?: string;
};

/**
 * 文法見出しの読み上げ用テキストを一意に決定する。
 * - `readingsById` あり: 生成スクリプト用（オーバーレイ → title_speak → title → structure）
 * - `readingsById` なし: アプリ用（Supabase マージ済み item。title_speak → title → structure）
 */
export function computeGrammarHeadingSpeechText(
  item: GrammarHeadingFields,
  readingsById?: Record<string, string> | null
): string {
  const tryStrip = (raw: string | undefined) => {
    if (!raw?.trim()) return '';
    return finalizeGrammarHeadingSpeechText(raw.trim());
  };

  const parts: string[] = [];
  if (readingsById) {
    const ov = readingsById[item.id];
    if (typeof ov === 'string' && ov.trim()) parts.push(ov.trim());
  }
  if (item.title_speak?.trim()) parts.push(item.title_speak.trim());
  if (item.title?.trim()) parts.push(item.title.trim());
  if (item.structure?.trim()) parts.push(item.structure.trim());

  for (const raw of parts) {
    const t = tryStrip(raw);
    if (t.length > 0 && hasHangulSyllables(t)) return t;
  }
  const fallback = tryStrip(item.title_speak) || tryStrip(item.title) || tryStrip(item.structure);
  return hasHangulSyllables(fallback) ? fallback : '';
}

/** manifest の text とアプリ側の期待が同じか（古い CDN 音声の誤再生防止） */
export function sameGrammarHeadingSpeechText(a: string, b: string): boolean {
  const ca = normalizeGrammarHeadingSpeechWhitespace(a).normalize('NFC');
  const cb = normalizeGrammarHeadingSpeechWhitespace(b).normalize('NFC');
  return ca === cb;
}
