/**
 * ハングル音節の分解・組み立て（Unicode ブロック U+AC00–U+D7A3）
 * 式: syllable = 0xAC00 + cho*588 + jung*28 + jong
 */

const CHO_BASE = 0x1100; // Choseong (초성) 19字
const JUNG_BASE = 0x1161; // Jungseong (중성) 21字
const JONG_BASE = 0x11a8; // Jongseong (종성) 28字、0=なし

export const CHO_LIST: string[] = [];
export const JUNG_LIST: string[] = [];
export const JONG_LIST: string[] = ['－']; // 0 = パッチムなし

for (let i = 0; i < 19; i++) CHO_LIST.push(String.fromCodePoint(CHO_BASE + i));
for (let i = 0; i < 21; i++) JUNG_LIST.push(String.fromCodePoint(JUNG_BASE + i));
for (let i = 0; i < 27; i++) JONG_LIST.push(String.fromCodePoint(JONG_BASE + i));

const S_BASE = 0xac00;

/** 1文字のハングル音節を (초성, 중성, 종성) のインデックスに分解。非ハングルは null */
export function decompose(syllable: string): { cho: number; jung: number; jong: number } | null {
  const code = syllable.codePointAt(0);
  if (code == null || code < S_BASE || code > 0xd7a3) return null;
  const n = code - S_BASE;
  const jong = n % 28;
  const jung = Math.floor(n / 28) % 21;
  const cho = Math.floor(n / 588);
  return { cho, jung, jong };
}

/** インデックスから1文字のハングル音節を組み立て */
export function build(cho: number, jung: number, jong: number): string {
  const n = S_BASE + cho * 588 + jung * 28 + jong;
  return String.fromCodePoint(n);
}

/** ハングル1文字かどうか */
export function isHangulSyllable(c: string): boolean {
  const code = c.codePointAt(0);
  return code != null && code >= S_BASE && code <= 0xd7a3;
}

/** 初声（子音）の英語読み Revised Romanization */
export const CHO_ROMANIZATION: string[] = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '-', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
];

/** 中声（母音）の英語読み */
export const JUNG_ROMANIZATION: string[] = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];

/** 終声（パッチム）の英語読み。0=なし */
export const JONG_ROMANIZATION: string[] = [
  '-',
  'k', 'kk', 'gs', 'n', 'nj', 'nh', 't', 'r', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't',
];

/** 文字列からハングル音節1文字ずつを抽出して配列で返す */
export function getSyllablesFromString(str: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < str.length; ) {
    const cp = str.codePointAt(i);
    if (cp != null) {
      const c = String.fromCodePoint(cp);
      if (isHangulSyllable(c)) out.push(c);
      i += cp > 0xffff ? 2 : 1;
    } else break;
  }
  return out;
}

/** 1音節のハングルをローマ字表記に変換（パズル用・単語の reading とは別管理） */
export function syllableToRomanization(syllable: string): string {
  const d = decompose(syllable);
  if (!d) return '';
  const choPart = CHO_ROMANIZATION[d.cho] ?? '';
  const jungPart = JUNG_ROMANIZATION[d.jung] ?? '';
  const jongPart = d.jong === 0 ? '' : (JONG_ROMANIZATION[d.jong] ?? '');
  return choPart + jungPart + jongPart;
}
