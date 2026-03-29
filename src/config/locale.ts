/**
 * 単語・文法の表示言語（ロケール）。
 * Storage のパス words/{locale}/, grammar/{locale}/ で切り替え。
 */
export type ContentLocale =
  | 'ko_ja'
  | 'ko_en'
  | 'ko_zh'
  | 'ko_vi'
  | 'ko_es'
  | 'ko_id'
  | 'ko_th';

export const SUPPORTED_LOCALES: ContentLocale[] = [
  'ko_ja',
  'ko_en',
  'ko_zh',
  'ko_vi',
  'ko_es',
  'ko_id',
  'ko_th',
];

/** アプリで使用するデフォルトロケール（単語・文法の翻訳言語） */
export const DEFAULT_LOCALE: ContentLocale = 'ko_ja';

export function getWordsStoragePrefix(locale: ContentLocale = DEFAULT_LOCALE): string {
  return `words/${locale}`;
}

export function getGrammarStoragePrefix(locale: ContentLocale = DEFAULT_LOCALE): string {
  return `grammar/${locale}`;
}
