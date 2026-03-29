/**
 * 文法「並び替え」クイズの正誤判定。
 * 同じ Unicode のチャンク（例: 「이」＝指示 vs 主格助詞）が複数あると、
 * プール上では区別できないため、インデックス完全一致ではなく「並べた文が正しい語順と一致するか」で判定する。
 */

const CHUNK_JOIN = ' ';

/** selectedIndices が 0..n-1 の順列か */
function isFullPermutation(selectedIndices: number[], n: number): boolean {
  if (selectedIndices.length !== n) return false;
  const sorted = [...selectedIndices].sort((a, b) => a - b);
  return sorted.every((val, i) => val === i);
}

/**
 * @param chunks 正解の語順のチャンク配列
 * @param selectedIndices ユーザーがタップした順のチャンク添字
 */
export function isGrammarReorderAnswerCorrect(chunks: string[], selectedIndices: number[]): boolean {
  const n = chunks.length;
  if (n === 0) return false;
  if (!isFullPermutation(selectedIndices, n)) return false;
  const expected = chunks.join(CHUNK_JOIN);
  const built = selectedIndices.map((i) => chunks[i]).join(CHUNK_JOIN);
  return built === expected;
}
