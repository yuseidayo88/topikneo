import { getAllHangulPuzzleTtsSyllables, getSyllablePoolForCourse } from '../utils/hangulPuzzleScope';

describe('hangulPuzzleScope', () => {
  it('mixed プールはパズル最大グリッド（19×12×27）と一致する音節数', () => {
    const mixed = getSyllablePoolForCourse('mixed');
    expect(mixed.length).toBe(19 * 12 * 27);
  });

  it('全コース和集合の TTS 対象音節は重複なくソート済み', () => {
    const all = getAllHangulPuzzleTtsSyllables();
    expect(all.length).toBe(new Set(all).size);
    const sorted = [...all].sort();
    expect(all).toEqual(sorted);
    expect(all.length).toBe(19 * 12 * 27);
  });
});
