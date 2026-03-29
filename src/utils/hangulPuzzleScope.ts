/**
 * ハングルパズルの出題プール・TTS 対象音節集合（アプリと生成スクリプトで共有）
 */
import { build, decompose, getSyllablesFromString } from './hangul';
import { getWordsByLevel } from '../data/words';
import type { HangulPuzzleCourseId } from '../i18n/flowScreens';

export type PuzzleCourse = HangulPuzzleCourseId;

export const PUZZLE_COURSE_IDS: HangulPuzzleCourseId[] = ['basic', 'batchim', 'batchim2', 'tensed', 'mixed'];

const TENSED_CHO_INDICES = [1, 4, 8, 10, 13];
const ASPIRATED_CHO_INDICES = [14, 15, 16, 17, 18];
export const TENSED_POOL = [...TENSED_CHO_INDICES, ...ASPIRATED_CHO_INDICES];

/** はじめて・パッチム系では濃音激音を出題しない（普段よく使う子音のみ） */
export const COMMON_CHO = [0, 2, 3, 5, 6, 7, 9, 11, 12];
/** 単語によく使う母音 */
export const COMMON_JUNG = [0, 1, 2, 4, 5, 6, 8, 12, 13, 17, 18, 20];
/** パッチム1つ（単体） */
export const SINGLE_JONG = [1, 2, 4, 7, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26];
/** パッチム2つ（複合） */
export const DOUBLE_JONG = [3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 17];

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 単語データから全音節を収集（重複除く） — パズルは従来どおりレベル1起点 */
export function getAllSyllablesFromVocabulary(): string[] {
  const set = new Set<string>();
  const words = getWordsByLevel(1);
  for (const w of words) {
    for (const s of getSyllablesFromString(w.korean)) {
      set.add(s);
    }
  }
  return Array.from(set);
}

/** コース別に「常用字母」の全組み合わせを生成 */
export function getGeneratedSyllablesForCourse(course: PuzzleCourse): string[] {
  const out: string[] = [];
  if (course === 'basic') {
    for (const c of COMMON_CHO) for (const j of COMMON_JUNG) out.push(build(c, j, 0));
    return out;
  }
  if (course === 'batchim') {
    for (const c of COMMON_CHO)
      for (const j of COMMON_JUNG)
        for (const r of SINGLE_JONG) out.push(build(c, j, r));
    return out;
  }
  if (course === 'batchim2') {
    for (const c of COMMON_CHO)
      for (const j of COMMON_JUNG)
        for (const r of DOUBLE_JONG) out.push(build(c, j, r));
    return out;
  }
  if (course === 'tensed') {
    for (const c of TENSED_POOL)
      for (const j of COMMON_JUNG) {
        out.push(build(c, j, 0));
        for (const r of SINGLE_JONG) out.push(build(c, j, r));
      }
    return out;
  }
  if (course === 'mixed') {
    const choAll = [...COMMON_CHO, ...TENSED_POOL];
    const jongAll = [0, ...SINGLE_JONG, ...DOUBLE_JONG];
    for (const c of choAll) for (const j of COMMON_JUNG) for (const r of jongAll) out.push(build(c, j, r));
    return out;
  }
  return out;
}

/** コース用プール＝単語由来（条件一致）＋常用字母の全組み合わせ */
export function getSyllablePoolForCourse(course: PuzzleCourse): string[] {
  const all = getAllSyllablesFromVocabulary();
  const filtered: string[] = [];
  for (const s of all) {
    const d = decompose(s);
    if (!d) continue;
    if (course === 'basic') {
      if (d.jong === 0 && COMMON_CHO.includes(d.cho) && COMMON_JUNG.includes(d.jung)) filtered.push(s);
    } else if (course === 'batchim') {
      if (SINGLE_JONG.includes(d.jong) && COMMON_CHO.includes(d.cho) && COMMON_JUNG.includes(d.jung)) filtered.push(s);
    } else if (course === 'batchim2') {
      if (DOUBLE_JONG.includes(d.jong) && COMMON_CHO.includes(d.cho) && COMMON_JUNG.includes(d.jung)) filtered.push(s);
    } else if (course === 'tensed') {
      if (TENSED_POOL.includes(d.cho) && COMMON_JUNG.includes(d.jung)) filtered.push(s);
    } else {
      if (
        COMMON_JUNG.includes(d.jung) &&
        (d.jong === 0 || SINGLE_JONG.includes(d.jong) || DOUBLE_JONG.includes(d.jong))
      )
        filtered.push(s);
    }
  }
  const generated = getGeneratedSyllablesForCourse(course);
  return Array.from(new Set<string>([...filtered, ...generated]));
}

/** Google TTS 用：全コースで出うる音節の和集合（重複除き・ソート） */
export function getAllHangulPuzzleTtsSyllables(): string[] {
  const set = new Set<string>();
  for (const course of PUZZLE_COURSE_IDS) {
    for (const s of getSyllablePoolForCourse(course)) set.add(s);
  }
  return Array.from(set).sort();
}

export function pickRandomSyllable(course: PuzzleCourse, pool: string[]): string {
  if (pool.length > 0) return pickFrom(pool);
  const cho = (): number => {
    if (course === 'tensed') return pickFrom(TENSED_POOL);
    if (course === 'basic' || course === 'batchim' || course === 'batchim2') return pickFrom(COMMON_CHO);
    return Math.floor(Math.random() * 19);
  };
  const jung = (): number => pickFrom(COMMON_JUNG);
  const jong = (): number => {
    if (course === 'basic') return 0;
    if (course === 'batchim') return pickFrom(SINGLE_JONG);
    if (course === 'batchim2') return pickFrom(DOUBLE_JONG);
    if (course === 'tensed') return Math.random() < 0.5 ? 0 : pickFrom(SINGLE_JONG);
    return Math.random() < 0.5 ? 0 : pickFrom([...SINGLE_JONG, ...DOUBLE_JONG]);
  };
  return build(cho(), jung(), jong());
}

export function getOptionsFromPool(correctIdx: number, pool: number[], count: number): number[] {
  const rest = pool.filter((i) => i !== correctIdx).sort(() => Math.random() - 0.5);
  const out = [correctIdx, ...rest.slice(0, count - 1)];
  return out.sort(() => Math.random() - 0.5);
}

export function getChoOptionsForCourse(correctIdx: number, count: number, course: PuzzleCourse): number[] {
  const pool =
    course === 'basic' || course === 'batchim' || course === 'batchim2'
      ? COMMON_CHO
      : course === 'tensed'
        ? TENSED_POOL
        : Array.from({ length: 19 }, (_, i) => i);
  return getOptionsFromPool(correctIdx, pool, Math.min(count, pool.length));
}

export function getJongPoolForCourse(course: PuzzleCourse): number[] {
  if (course === 'batchim') return SINGLE_JONG;
  if (course === 'batchim2') return DOUBLE_JONG;
  return [...SINGLE_JONG, ...DOUBLE_JONG];
}
