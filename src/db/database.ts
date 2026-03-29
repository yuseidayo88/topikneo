import * as SQLite from 'expo-sqlite';
import {
  getTodayInTimezone,
  getYesterdayInTimezone,
  getDateOffsetInTimezone,
  getDateFromISOInTimezone,
  getDeviceTimezone,
} from '../utils/timezone';

/** 未ログイン時のローカルユーザーID。 */
const LOCAL_USER_ID = 'local';
/** 現在アクティブなユーザーID。ログイン中は auth.user.id、未ログイン時は local。 */
let USER_ID = LOCAL_USER_ID;

let db: SQLite.SQLiteDatabase | null = null;
let databaseSyncHandler: (() => void) | null = null;
/** ローカル DB 更新時に progressStore を再描画用に通知（ホームのストリーク等） */
let localProgressBumpHandler: (() => void) | null = null;

/** 設定した国・地域に合わせて「今日」が変動する。起動時と設定変更時にアプリからセットする。 */
let _appTimezone: string = getDeviceTimezone();

export function setDatabaseTimezone(timezone: string): void {
  _appTimezone = timezone;
}

export function getLocalDatabaseUserId(): string {
  return LOCAL_USER_ID;
}

export function getActiveDatabaseUserId(): string {
  return USER_ID;
}

export function setActiveDatabaseUserId(userId: string | null | undefined): void {
  const next = userId?.trim();
  USER_ID = next ? next : LOCAL_USER_ID;
}

export function setDatabaseSyncHandler(handler: (() => void) | null): void {
  databaseSyncHandler = handler;
}

export function setLocalProgressBumpHandler(handler: (() => void) | null): void {
  localProgressBumpHandler = handler;
}

function notifyDatabaseMutation(): void {
  databaseSyncHandler?.();
  localProgressBumpHandler?.();
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('kla.db');
    initTables();
  }
  return db;
}

function initTables() {
  const d = getDb();
  d.execSync(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review_date TEXT,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, word_id)
    );
    CREATE TABLE IF NOT EXISTS lesson_progress (
      user_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      type TEXT NOT NULL,
      is_cleared INTEGER DEFAULT 0,
      cleared_at TEXT,
      PRIMARY KEY (user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS saved_words (
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      PRIMARY KEY (user_id, word_id)
    );
    CREATE TABLE IF NOT EXISTS streak (
      user_id TEXT PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      last_cleared_date TEXT,
      longest_streak INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS daily_stats (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      lessons_cleared INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );
    CREATE TABLE IF NOT EXISTS lesson_quiz_last_result (
      user_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      result TEXT NOT NULL,
      PRIMARY KEY (user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS quiz_word_order (
      user_id TEXT NOT NULL,
      quiz_type TEXT NOT NULL,
      word_ids TEXT NOT NULL,
      PRIMARY KEY (user_id, quiz_type)
    );
    CREATE TABLE IF NOT EXISTS lesson_quiz_progress (
      user_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      current_index INTEGER NOT NULL,
      order_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      PRIMARY KEY (user_id, lesson_id)
    );
  `);
}

// --- user_progress (SM-2)
export function getUserProgressWithCounts(wordId: string): {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string | null;
  correctCount: number;
  wrongCount: number;
} | null {
  const row = getDb().getFirstSync<{
    ease_factor: number;
    interval: number;
    repetitions: number;
    next_review_date: string | null;
    correct_count: number;
    wrong_count: number;
  }>(
    'SELECT ease_factor, interval, repetitions, next_review_date, correct_count, wrong_count FROM user_progress WHERE user_id = ? AND word_id = ?',
    USER_ID,
    wordId
  );
  return row
    ? {
        easeFactor: row.ease_factor,
        interval: row.interval,
        repetitions: row.repetitions,
        nextReviewDate: row.next_review_date,
        correctCount: row.correct_count ?? 0,
        wrongCount: row.wrong_count ?? 0,
      }
    : null;
}

export function upsertUserProgress(
  wordId: string,
  data: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: string;
    correctCount: number;
    wrongCount: number;
  }
) {
  getDb().runSync(
    `INSERT INTO user_progress (user_id, word_id, ease_factor, interval, repetitions, next_review_date, correct_count, wrong_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, word_id) DO UPDATE SET
       ease_factor = excluded.ease_factor,
       interval = excluded.interval,
       repetitions = excluded.repetitions,
       next_review_date = excluded.next_review_date,
       correct_count = excluded.correct_count,
       wrong_count = excluded.wrong_count`,
    USER_ID,
    wordId,
    data.easeFactor,
    data.interval,
    data.repetitions,
    data.nextReviewDate,
    data.correctCount,
    data.wrongCount
  );
  notifyDatabaseMutation();
}

export function getWordsDueForReview(limit: number): string[] {
  const today = getToday();
  const rows = getDb().getAllSync<{ word_id: string }>(
    `SELECT word_id FROM user_progress WHERE user_id = ? AND (next_review_date IS NULL OR next_review_date <= ?) ORDER BY next_review_date LIMIT ?`,
    USER_ID,
    today,
    limit
  );
  return rows.map((r) => r.word_id);
}

/** 指定日の復習予定件数（next_review_date がその日である単語数） */
export function getReviewCountForDate(dateStr: string): number {
  const row = getDb().getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM user_progress WHERE user_id = ? AND next_review_date = ?',
    USER_ID,
    dateStr
  );
  return row?.cnt ?? 0;
}

/** 今日の daily_stats（レッスンクリア数） */
export function getTodayDailyStats(): { lessonsCleared: number } | null {
  const today = getToday();
  const row = getDb().getFirstSync<{ lessons_cleared: number }>(
    'SELECT lessons_cleared FROM daily_stats WHERE user_id = ? AND date = ?',
    USER_ID,
    today
  );
  return row ? { lessonsCleared: row.lessons_cleared } : null;
}

/** 指定月の日別レッスンクリア数（カレンダー用）。date は YYYY-MM-DD、キーで日付を参照 */
export function getMonthlyStats(year: number, month: number): Record<string, number> {
  const lastDay = new Date(year, month, 0).getDate();
  const result: Record<string, number> = {};
  const monthStr = String(month).padStart(2, '0');
  for (let day = 1; day <= lastDay; day++) {
    const date = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    const row = getDb().getFirstSync<{ lessons_cleared: number }>(
      'SELECT lessons_cleared FROM daily_stats WHERE user_id = ? AND date = ?',
      USER_ID,
      date
    );
    result[date] = row?.lessons_cleared ?? 0;
  }
  return result;
}

// --- lesson_progress
export function isLessonCleared(lessonId: string, type: 'word' | 'grammar'): boolean {
  const row = getDb().getFirstSync<{ is_cleared: number }>(
    'SELECT is_cleared FROM lesson_progress WHERE user_id = ? AND lesson_id = ? AND type = ?',
    USER_ID,
    lessonId,
    type
  );
  return row?.is_cleared === 1;
}

export function setLessonCleared(lessonId: string, type: 'word' | 'grammar') {
  const now = new Date().toISOString();
  getDb().runSync(
    `INSERT INTO lesson_progress (user_id, lesson_id, type, is_cleared, cleared_at) VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET is_cleared = 1, cleared_at = excluded.cleared_at`,
    USER_ID,
    lessonId,
    type,
    now
  );
  notifyDatabaseMutation();
}

/** レッスンを未クリアに戻す（例: 単語クイズで10問全正解でなかった場合） */
export function setLessonUncleared(lessonId: string, type: 'word' | 'grammar') {
  getDb().runSync(
    'UPDATE lesson_progress SET is_cleared = 0 WHERE user_id = ? AND lesson_id = ? AND type = ?',
    USER_ID,
    lessonId,
    type
  );
  notifyDatabaseMutation();
}

export function getLevelProgress(level: number, type: 'word' | 'grammar'): number {
  const prefix = type === 'word' ? `ko_W${level}_` : `ko_G${level}_`;
  const row = getDb().getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM lesson_progress WHERE user_id = ? AND type = ? AND lesson_id LIKE ? AND is_cleared = 1`,
    USER_ID,
    type,
    `${prefix}%`
  );
  return row?.count ?? 0;
}

export function getTotalLessonsCleared(): number {
  const row = getDb().getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM lesson_progress WHERE user_id = ? AND is_cleared = 1',
    USER_ID
  );
  return row?.count ?? 0;
}

// --- lesson_quiz_last_result（レッスン一覧のドット表示用：最後のクイズの正解/不正解。user_id で分離されているため本番・別ユーザーでも問題なし）
export function saveLessonQuizResult(lessonId: string, result: number[]): void {
  getDb().runSync(
    'INSERT INTO lesson_quiz_last_result (user_id, lesson_id, result) VALUES (?, ?, ?) ON CONFLICT(user_id, lesson_id) DO UPDATE SET result = excluded.result',
    USER_ID,
    lessonId,
    JSON.stringify(result)
  );
}

export function getLessonQuizResult(lessonId: string): number[] | null {
  const row = getDb().getFirstSync<{ result: string }>(
    'SELECT result FROM lesson_quiz_last_result WHERE user_id = ? AND lesson_id = ?',
    USER_ID,
    lessonId
  );
  if (!row?.result) return null;
  try {
    const arr = JSON.parse(row.result) as number[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

/** 復習・保存クイズの出題順単語ID（結果画面の間違えた単語一覧用） */
export function setLastQuizWordIds(quizType: 'saved' | 'review', wordIds: string[]): void {
  getDb().runSync(
    'INSERT INTO quiz_word_order (user_id, quiz_type, word_ids) VALUES (?, ?, ?) ON CONFLICT(user_id, quiz_type) DO UPDATE SET word_ids = excluded.word_ids',
    USER_ID,
    quizType,
    JSON.stringify(wordIds)
  );
}

export function getLastQuizWordIds(quizType: 'saved' | 'review'): string[] {
  const row = getDb().getFirstSync<{ word_ids: string }>(
    'SELECT word_ids FROM quiz_word_order WHERE user_id = ? AND quiz_type = ?',
    USER_ID,
    quizType
  );
  if (!row?.word_ids) return [];
  try {
    const arr = JSON.parse(row.word_ids) as string[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** クリア済みレッスンID一覧（単語・文法で出題するため） */
export function getClearedLessonIds(type: 'word' | 'grammar'): string[] {
  const rows = getDb().getAllSync<{ lesson_id: string }>(
    'SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND type = ? AND is_cleared = 1 ORDER BY cleared_at ASC',
    USER_ID,
    type
  );
  return rows.map((r) => r.lesson_id);
}

/**
 * cleared_at は UTC の ISO 文字列で保存される。LIKE で日付プレフィックスを付けると
 * ユーザータイムゾーンの「今日」と UTC 日付がずれてカウント漏れする（例: JST 深夜）。
 * 設定タイムゾーン上の暦日で比較する。
 */
function countLessonsClearedOnCalendarDate(type: 'word' | 'grammar', dateYmd: string): number {
  const rows = getDb().getAllSync<{ cleared_at: string | null }>(
    'SELECT cleared_at FROM lesson_progress WHERE user_id = ? AND type = ? AND is_cleared = 1',
    USER_ID,
    type
  );
  let count = 0;
  for (const row of rows) {
    if (!row.cleared_at) continue;
    const d = getDateFromISOInTimezone(row.cleared_at, _appTimezone);
    if (d === dateYmd) count++;
  }
  return count;
}

/** 今日クリアしたレッスン数（単語 or 文法）。デイリー目標の達成表示用。 */
export function getTodayLessonsClearedByType(type: 'word' | 'grammar'): number {
  return countLessonsClearedOnCalendarDate(type, getToday());
}

/** 指定日の単語・文法クリア数（カレンダー詳細用） */
export function getDailyStatsByType(date: string): { word: number; grammar: number } {
  return {
    word: countLessonsClearedOnCalendarDate('word', date),
    grammar: countLessonsClearedOnCalendarDate('grammar', date),
  };
}

// --- saved_words
export function getSavedWordIds(): string[] {
  const rows = getDb().getAllSync<{ word_id: string }>(
    'SELECT word_id FROM saved_words WHERE user_id = ? ORDER BY saved_at DESC',
    USER_ID
  );
  return rows.map((r) => r.word_id);
}

export function isWordSaved(wordId: string): boolean {
  const row = getDb().getFirstSync<{ word_id: string }>(
    'SELECT word_id FROM saved_words WHERE user_id = ? AND word_id = ?',
    USER_ID,
    wordId
  );
  return !!row;
}

export function toggleSavedWord(wordId: string): boolean {
  const now = new Date().toISOString();
  const existing = getDb().getFirstSync<{ word_id: string }>(
    'SELECT word_id FROM saved_words WHERE user_id = ? AND word_id = ?',
    USER_ID,
    wordId
  );
  if (existing) {
    getDb().runSync('DELETE FROM saved_words WHERE user_id = ? AND word_id = ?', USER_ID, wordId);
    notifyDatabaseMutation();
    return false;
  } else {
    getDb().runSync('INSERT INTO saved_words (user_id, word_id, saved_at) VALUES (?, ?, ?)', USER_ID, wordId, now);
    notifyDatabaseMutation();
    return true;
  }
}

// --- streak
function getToday(): string {
  return getTodayInTimezone(_appTimezone);
}

function getYesterday(): string {
  return getYesterdayInTimezone(_appTimezone);
}

export function getStreak(): { current: number; longest: number; lastCleared: string | null } {
  const row = getDb().getFirstSync<{
    current_streak: number;
    longest_streak: number;
    last_cleared_date: string | null;
  }>('SELECT current_streak, longest_streak, last_cleared_date FROM streak WHERE user_id = ?', USER_ID);
  if (!row) return { current: 0, longest: 0, lastCleared: null };
  const today = getToday();
  const yesterday = getYesterday();
  // 設定タイムゾーンで0時リセット: last_cleared が昨日以前ならストリークは0にリセット
  let current = row.current_streak;
  if (row.last_cleared_date) {
    const lastDateInTz = getDateFromISOInTimezone(row.last_cleared_date, _appTimezone);
    if (lastDateInTz < yesterday) {
      current = 0;
    }
  }
  return {
    current,
    longest: row.longest_streak,
    lastCleared: row.last_cleared_date,
  };
}

export function incrementStreak() {
  const today = getToday();
  const yesterday = getYesterday();
  const streak = getStreak();
  const lastCleared = streak.lastCleared;
  let newCurrent = streak.current;
  if (!lastCleared) {
    newCurrent = 1;
  } else {
    const lastDateInTz = getDateFromISOInTimezone(lastCleared, _appTimezone);
    if (lastDateInTz === yesterday) {
      newCurrent = streak.current + 1;
    } else if (lastDateInTz !== today) {
      newCurrent = 1;
    }
  }
  const newLongest = Math.max(streak.longest, newCurrent);
  getDb().runSync(
    `INSERT INTO streak (user_id, current_streak, last_cleared_date, longest_streak) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET current_streak = ?, last_cleared_date = ?, longest_streak = ?`,
    USER_ID,
    newCurrent,
    today,
    newLongest,
    newCurrent,
    today,
    newLongest
  );
  notifyDatabaseMutation();
}

// --- daily_stats
export function addDailyStats(lessonsCleared: number, correctCount: number) {
  const today = getToday();
  const row = getDb().getFirstSync<{ lessons_cleared: number; correct_count: number }>(
    'SELECT lessons_cleared, correct_count FROM daily_stats WHERE user_id = ? AND date = ?',
    USER_ID,
    today
  );
  if (row) {
    getDb().runSync(
      'UPDATE daily_stats SET lessons_cleared = lessons_cleared + ?, correct_count = correct_count + ? WHERE user_id = ? AND date = ?',
      lessonsCleared,
      correctCount,
      USER_ID,
      today
    );
  } else {
    getDb().runSync(
      'INSERT INTO daily_stats (user_id, date, lessons_cleared, correct_count) VALUES (?, ?, ?, ?)',
      USER_ID,
      today,
      lessonsCleared,
      correctCount
    );
  }
  notifyDatabaseMutation();
}

export function getWeeklyStats(): { date: string; lessonsCleared: number; correctCount: number }[] {
  const result: { date: string; lessonsCleared: number; correctCount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = getDateOffsetInTimezone(_appTimezone, -i);
    const row = getDb().getFirstSync<{ lessons_cleared: number; correct_count: number }>(
      'SELECT lessons_cleared, correct_count FROM daily_stats WHERE user_id = ? AND date = ?',
      USER_ID,
      date
    );
    result.push({
      date,
      lessonsCleared: row?.lessons_cleared ?? 0,
      correctCount: row?.correct_count ?? 0,
    });
  }
  return result;
}

export function getTotalCorrect(): number {
  const row = getDb().getFirstSync<{ total: number }>(
    'SELECT COALESCE(SUM(correct_count), 0) as total FROM user_progress WHERE user_id = ?',
    USER_ID
  );
  return row?.total ?? 0;
}

export function getTotalWrong(): number {
  const row = getDb().getFirstSync<{ total: number }>(
    'SELECT COALESCE(SUM(wrong_count), 0) as total FROM user_progress WHERE user_id = ?',
    USER_ID
  );
  return row?.total ?? 0;
}

export function resetAllData() {
  const d = getDb();
  d.runSync('DELETE FROM user_progress WHERE user_id = ?', USER_ID);
  d.runSync('DELETE FROM lesson_progress WHERE user_id = ?', USER_ID);
  d.runSync('DELETE FROM lesson_quiz_last_result WHERE user_id = ?', USER_ID);
  d.runSync('DELETE FROM quiz_word_order WHERE user_id = ?', USER_ID);
  d.runSync('DELETE FROM lesson_quiz_progress WHERE user_id = ?', USER_ID);
  d.runSync('DELETE FROM saved_words WHERE user_id = ?', USER_ID);
  d.runSync('DELETE FROM streak WHERE user_id = ?', USER_ID);
  d.runSync('DELETE FROM daily_stats WHERE user_id = ?', USER_ID);
  notifyDatabaseMutation();
}

export type UserProgressRow = {
  word_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string | null;
  correct_count: number;
  wrong_count: number;
};

export type LessonProgressRow = {
  lesson_id: string;
  type: 'word' | 'grammar';
  is_cleared: number;
  cleared_at: string | null;
};

export type SavedWordRow = {
  word_id: string;
  saved_at: string;
};

export type StreakRow = {
  current_streak: number;
  last_cleared_date: string | null;
  longest_streak: number;
};

export type DailyStatsRow = {
  date: string;
  lessons_cleared: number;
  correct_count: number;
};

export type DatabaseSnapshot = {
  userProgress: UserProgressRow[];
  lessonProgress: LessonProgressRow[];
  savedWords: SavedWordRow[];
  streak: StreakRow | null;
  dailyStats: DailyStatsRow[];
};

export function exportDatabaseSnapshot(userId: string = USER_ID): DatabaseSnapshot {
  const d = getDb();
  return {
    userProgress: d.getAllSync<UserProgressRow>(
      'SELECT word_id, ease_factor, interval, repetitions, next_review_date, correct_count, wrong_count FROM user_progress WHERE user_id = ?',
      userId
    ),
    lessonProgress: d.getAllSync<LessonProgressRow>(
      'SELECT lesson_id, type, is_cleared, cleared_at FROM lesson_progress WHERE user_id = ?',
      userId
    ) as LessonProgressRow[],
    savedWords: d.getAllSync<SavedWordRow>(
      'SELECT word_id, saved_at FROM saved_words WHERE user_id = ?',
      userId
    ),
    streak:
      d.getFirstSync<StreakRow>(
        'SELECT current_streak, last_cleared_date, longest_streak FROM streak WHERE user_id = ?',
        userId
      ) ?? null,
    dailyStats: d.getAllSync<DailyStatsRow>(
      'SELECT date, lessons_cleared, correct_count FROM daily_stats WHERE user_id = ?',
      userId
    ),
  };
}

export function hasAnyDatabaseData(userId: string = USER_ID): boolean {
  const d = getDb();
  const row = d.getFirstSync<{ count: number }>(
    `SELECT (
      (SELECT COUNT(*) FROM user_progress WHERE user_id = ?)
      + (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ?)
      + (SELECT COUNT(*) FROM saved_words WHERE user_id = ?)
      + (SELECT COUNT(*) FROM streak WHERE user_id = ?)
      + (SELECT COUNT(*) FROM daily_stats WHERE user_id = ?)
      + (SELECT COUNT(*) FROM lesson_quiz_last_result WHERE user_id = ?)
      + (SELECT COUNT(*) FROM quiz_word_order WHERE user_id = ?)
      + (SELECT COUNT(*) FROM lesson_quiz_progress WHERE user_id = ?)
    ) as count`,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId
  );
  return (row?.count ?? 0) > 0;
}

export function replaceDatabaseSnapshot(snapshot: DatabaseSnapshot, userId: string = USER_ID): void {
  const d = getDb();
  d.runSync('DELETE FROM user_progress WHERE user_id = ?', userId);
  d.runSync('DELETE FROM lesson_progress WHERE user_id = ?', userId);
  d.runSync('DELETE FROM saved_words WHERE user_id = ?', userId);
  d.runSync('DELETE FROM streak WHERE user_id = ?', userId);
  d.runSync('DELETE FROM daily_stats WHERE user_id = ?', userId);

  for (const row of snapshot.userProgress) {
    d.runSync(
      `INSERT INTO user_progress (user_id, word_id, ease_factor, interval, repetitions, next_review_date, correct_count, wrong_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      userId,
      row.word_id,
      row.ease_factor,
      row.interval,
      row.repetitions,
      row.next_review_date,
      row.correct_count,
      row.wrong_count
    );
  }

  for (const row of snapshot.lessonProgress) {
    d.runSync(
      `INSERT INTO lesson_progress (user_id, lesson_id, type, is_cleared, cleared_at)
       VALUES (?, ?, ?, ?, ?)`,
      userId,
      row.lesson_id,
      row.type,
      row.is_cleared,
      row.cleared_at
    );
  }

  for (const row of snapshot.savedWords) {
    d.runSync(
      `INSERT INTO saved_words (user_id, word_id, saved_at)
       VALUES (?, ?, ?)`,
      userId,
      row.word_id,
      row.saved_at
    );
  }

  if (snapshot.streak) {
    d.runSync(
      `INSERT INTO streak (user_id, current_streak, last_cleared_date, longest_streak)
       VALUES (?, ?, ?, ?)`,
      userId,
      snapshot.streak.current_streak,
      snapshot.streak.last_cleared_date,
      snapshot.streak.longest_streak
    );
  }

  for (const row of snapshot.dailyStats) {
    d.runSync(
      `INSERT INTO daily_stats (user_id, date, lessons_cleared, correct_count)
       VALUES (?, ?, ?, ?)`,
      userId,
      row.date,
      row.lessons_cleared,
      row.correct_count
    );
  }
}

export function cloneUserData(sourceUserId: string, targetUserId: string): void {
  const d = getDb();
  const tables = [
    'user_progress',
    'lesson_progress',
    'lesson_quiz_last_result',
    'quiz_word_order',
    'lesson_quiz_progress',
    'saved_words',
    'streak',
    'daily_stats',
  ] as const;

  for (const table of tables) {
    d.runSync(`DELETE FROM ${table} WHERE user_id = ?`, targetUserId);
  }

  d.runSync(
    `INSERT INTO user_progress (user_id, word_id, ease_factor, interval, repetitions, next_review_date, correct_count, wrong_count)
     SELECT ?, word_id, ease_factor, interval, repetitions, next_review_date, correct_count, wrong_count
     FROM user_progress WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
  d.runSync(
    `INSERT INTO lesson_progress (user_id, lesson_id, type, is_cleared, cleared_at)
     SELECT ?, lesson_id, type, is_cleared, cleared_at
     FROM lesson_progress WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
  d.runSync(
    `INSERT INTO lesson_quiz_last_result (user_id, lesson_id, result)
     SELECT ?, lesson_id, result
     FROM lesson_quiz_last_result WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
  d.runSync(
    `INSERT INTO quiz_word_order (user_id, quiz_type, word_ids)
     SELECT ?, quiz_type, word_ids
     FROM quiz_word_order WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
  d.runSync(
    `INSERT INTO lesson_quiz_progress (user_id, lesson_id, current_index, order_json, result_json)
     SELECT ?, lesson_id, current_index, order_json, result_json
     FROM lesson_quiz_progress WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
  d.runSync(
    `INSERT INTO saved_words (user_id, word_id, saved_at)
     SELECT ?, word_id, saved_at
     FROM saved_words WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
  d.runSync(
    `INSERT INTO streak (user_id, current_streak, last_cleared_date, longest_streak)
     SELECT ?, current_streak, last_cleared_date, longest_streak
     FROM streak WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
  d.runSync(
    `INSERT INTO daily_stats (user_id, date, lessons_cleared, correct_count)
     SELECT ?, date, lessons_cleared, correct_count
     FROM daily_stats WHERE user_id = ?`,
    targetUserId,
    sourceUserId
  );
}
