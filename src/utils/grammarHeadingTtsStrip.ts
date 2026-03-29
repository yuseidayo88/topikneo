/**
 * 文法「見出し」読み上げ用テキストから、教材表記を除いて manifest キーと一致させる。
 * - 波線・チルダ
 * - 「는 (도)중에」などの省略可能 (도)（title_speak 未同期で title にフォールバックしたときのキーずれ防止）
 */
export function stripGrammarHeadingNotationForTts(text: string): string {
  return String(text ?? '')
    .replace(/[\u301C\uFF5E\u223C\u2053\u02DC~∼]/g, '')
    .replace(/\s*\(도\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 教材表記の「ㄴ」単体・パッチム字母だけなど、音節になっていない互換字母・ジャモを除去する。
 * （完成形ハングル U+AC00–U+D7A3 は残す）
 */
export function stripIsolatedHangulJamoForTts(text: string): string {
  return String(text ?? '')
    .replace(/\u3164/g, '') // HANGUL FILLER（幅だけの表記）
    .replace(/[\u1100-\u11FF\u3130-\u318F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 見出し読み用: 表記除去 → 孤立字母除去のあと */
export function stripGrammarHeadingForSpeech(text: string): string {
  return stripIsolatedHangulJamoForTts(stripGrammarHeadingNotationForTts(text));
}

/** 生成 manifest / アプリで同一の見出し読み文字列に揃える */
export function normalizeGrammarHeadingSpeechWhitespace(text: string): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/** strip 後に空白を正規化（生成スクリプトとアプリで共有） */
export function finalizeGrammarHeadingSpeechText(raw: string): string {
  return normalizeGrammarHeadingSpeechWhitespace(stripGrammarHeadingForSpeech(raw));
}

/** 見出し読みに使えるか（英語だけの誤った title_speak を除外する） */
export function hasHangulSyllables(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(String(text ?? ''));
}
