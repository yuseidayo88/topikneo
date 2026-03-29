import { supabase, isSupabaseConfigured } from './client';
import {
  cloneUserData,
  exportDatabaseSnapshot,
  getActiveDatabaseUserId,
  getLocalDatabaseUserId,
  hasAnyDatabaseData,
  replaceDatabaseSnapshot,
  setActiveDatabaseUserId,
  type DailyStatsRow,
  type DatabaseSnapshot,
  type LessonProgressRow,
  type SavedWordRow,
  type StreakRow,
  type UserProgressRow,
} from '../db/database';

type ServerSnapshot = DatabaseSnapshot;

let pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;

function isSnapshotEmpty(snapshot: ServerSnapshot): boolean {
  return (
    snapshot.userProgress.length === 0 &&
    snapshot.lessonProgress.length === 0 &&
    snapshot.savedWords.length === 0 &&
    snapshot.dailyStats.length === 0 &&
    snapshot.streak == null
  );
}

function mergeUserProgress(local: UserProgressRow[], server: UserProgressRow[]): UserProgressRow[] {
  const map = new Map<string, UserProgressRow>();
  for (const row of [...server, ...local]) {
    const prev = map.get(row.word_id);
    if (!prev) {
      map.set(row.word_id, row);
      continue;
    }
    const prevScore = (prev.correct_count ?? 0) + (prev.wrong_count ?? 0);
    const rowScore = (row.correct_count ?? 0) + (row.wrong_count ?? 0);
    if (rowScore > prevScore) {
      map.set(row.word_id, row);
      continue;
    }
    if (rowScore === prevScore) {
      const prevDate = prev.next_review_date ? new Date(prev.next_review_date).getTime() : 0;
      const rowDate = row.next_review_date ? new Date(row.next_review_date).getTime() : 0;
      if (rowDate > prevDate) map.set(row.word_id, row);
    }
  }
  return Array.from(map.values());
}

function mergeLessonProgress(local: LessonProgressRow[], server: LessonProgressRow[]): LessonProgressRow[] {
  const map = new Map<string, LessonProgressRow>();
  for (const row of [...server, ...local]) {
    const key = `${row.lesson_id}:${row.type}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    if ((row.is_cleared ?? 0) > (prev.is_cleared ?? 0)) {
      map.set(key, row);
      continue;
    }
    const prevDate = prev.cleared_at ? new Date(prev.cleared_at).getTime() : 0;
    const rowDate = row.cleared_at ? new Date(row.cleared_at).getTime() : 0;
    if (rowDate > prevDate) map.set(key, row);
  }
  return Array.from(map.values());
}

function mergeSavedWords(local: SavedWordRow[], server: SavedWordRow[]): SavedWordRow[] {
  const map = new Map<string, SavedWordRow>();
  for (const row of [...server, ...local]) {
    const prev = map.get(row.word_id);
    if (!prev) {
      map.set(row.word_id, row);
      continue;
    }
    const prevDate = new Date(prev.saved_at).getTime();
    const rowDate = new Date(row.saved_at).getTime();
    if (rowDate > prevDate) map.set(row.word_id, row);
  }
  return Array.from(map.values());
}

function mergeDailyStats(local: DailyStatsRow[], server: DailyStatsRow[]): DailyStatsRow[] {
  const map = new Map<string, DailyStatsRow>();
  for (const row of [...server, ...local]) {
    const prev = map.get(row.date);
    if (!prev) {
      map.set(row.date, row);
      continue;
    }
    map.set(row.date, {
      date: row.date,
      lessons_cleared: Math.max(prev.lessons_cleared ?? 0, row.lessons_cleared ?? 0),
      correct_count: Math.max(prev.correct_count ?? 0, row.correct_count ?? 0),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeStreak(local: StreakRow | null, server: StreakRow | null): StreakRow | null {
  if (!local) return server;
  if (!server) return local;
  const localDate = local.last_cleared_date ? new Date(local.last_cleared_date).getTime() : 0;
  const serverDate = server.last_cleared_date ? new Date(server.last_cleared_date).getTime() : 0;
  return {
    current_streak: Math.max(local.current_streak ?? 0, server.current_streak ?? 0),
    longest_streak: Math.max(local.longest_streak ?? 0, server.longest_streak ?? 0),
    last_cleared_date: localDate >= serverDate ? local.last_cleared_date : server.last_cleared_date,
  };
}

function mergeSnapshots(primary: ServerSnapshot, secondary: ServerSnapshot): ServerSnapshot {
  return {
    userProgress: mergeUserProgress(primary.userProgress, secondary.userProgress),
    lessonProgress: mergeLessonProgress(primary.lessonProgress, secondary.lessonProgress),
    savedWords: mergeSavedWords(primary.savedWords, secondary.savedWords),
    dailyStats: mergeDailyStats(primary.dailyStats, secondary.dailyStats),
    streak: mergeStreak(primary.streak, secondary.streak),
  };
}

async function fetchServerSnapshot(userId: string): Promise<ServerSnapshot> {
  if (!isSupabaseConfigured()) {
    return { userProgress: [], lessonProgress: [], savedWords: [], streak: null, dailyStats: [] };
  }

  const [userProgressRes, lessonProgressRes, savedWordsRes, streakRes, dailyStatsRes] = await Promise.all([
    supabase
      .from('user_progress')
      .select('word_id, ease_factor, interval, repetitions, next_review_date, correct_count, wrong_count')
      .eq('user_id', userId),
    supabase
      .from('lesson_progress')
      .select('lesson_id, type, is_cleared, cleared_at')
      .eq('user_id', userId),
    supabase
      .from('saved_words')
      .select('word_id, saved_at')
      .eq('user_id', userId),
    supabase
      .from('streak')
      .select('current_streak, last_cleared_date, longest_streak')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('daily_stats')
      .select('date, lessons_cleared, correct_count')
      .eq('user_id', userId),
  ]);

  return {
    userProgress: (userProgressRes.data ?? []) as UserProgressRow[],
    lessonProgress: (lessonProgressRes.data ?? []) as LessonProgressRow[],
    savedWords: (savedWordsRes.data ?? []) as SavedWordRow[],
    streak: (streakRes.data ?? null) as StreakRow | null,
    dailyStats: (dailyStatsRes.data ?? []) as DailyStatsRow[],
  };
}

async function replaceServerSnapshot(userId: string, snapshot: ServerSnapshot): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await Promise.all([
    supabase.from('user_progress').delete().eq('user_id', userId),
    supabase.from('lesson_progress').delete().eq('user_id', userId),
    supabase.from('saved_words').delete().eq('user_id', userId),
    supabase.from('streak').delete().eq('user_id', userId),
    supabase.from('daily_stats').delete().eq('user_id', userId),
  ]);

  if (snapshot.userProgress.length > 0) {
    await supabase.from('user_progress').insert(
      snapshot.userProgress.map((row) => ({ user_id: userId, ...row }))
    );
  }
  if (snapshot.lessonProgress.length > 0) {
    await supabase.from('lesson_progress').insert(
      snapshot.lessonProgress.map((row) => ({ user_id: userId, ...row }))
    );
  }
  if (snapshot.savedWords.length > 0) {
    await supabase.from('saved_words').insert(
      snapshot.savedWords.map((row) => ({ user_id: userId, ...row }))
    );
  }
  if (snapshot.streak) {
    await supabase.from('streak').insert({ user_id: userId, ...snapshot.streak });
  }
  if (snapshot.dailyStats.length > 0) {
    await supabase.from('daily_stats').insert(
      snapshot.dailyStats.map((row) => ({ user_id: userId, ...row }))
    );
  }
}

export async function initializeSupabaseProgressSync(userId: string): Promise<void> {
  setActiveDatabaseUserId(userId);

  const userSnapshot = exportDatabaseSnapshot(userId);
  const localGuestId = getLocalDatabaseUserId();
  const guestSnapshot = exportDatabaseSnapshot(localGuestId);
  const serverSnapshot = await fetchServerSnapshot(userId);

  if (isSnapshotEmpty(serverSnapshot)) {
    if (!isSnapshotEmpty(userSnapshot)) {
      await replaceServerSnapshot(userId, userSnapshot);
      return;
    }
    if (!isSnapshotEmpty(guestSnapshot) && !hasAnyDatabaseData(userId)) {
      cloneUserData(localGuestId, userId);
      const migrated = exportDatabaseSnapshot(userId);
      await replaceServerSnapshot(userId, migrated);
    }
    return;
  }

  const merged = mergeSnapshots(serverSnapshot, userSnapshot);
  replaceDatabaseSnapshot(merged, userId);
  if (!isSnapshotEmpty(guestSnapshot) && !hasAnyDatabaseData(userId)) {
    cloneUserData(localGuestId, userId);
  }
  await replaceServerSnapshot(userId, exportDatabaseSnapshot(userId));
}

export function resetToLocalProgressMode(): void {
  if (pendingSyncTimer) {
    clearTimeout(pendingSyncTimer);
    pendingSyncTimer = null;
  }
  setActiveDatabaseUserId(getLocalDatabaseUserId());
}

export async function syncSupabaseProgressNow(): Promise<void> {
  const userId = getActiveDatabaseUserId();
  if (!isSupabaseConfigured() || userId === getLocalDatabaseUserId()) return;
  await replaceServerSnapshot(userId, exportDatabaseSnapshot(userId));
}

export function requestSupabaseProgressSync(): void {
  if (pendingSyncTimer) clearTimeout(pendingSyncTimer);
  pendingSyncTimer = setTimeout(() => {
    pendingSyncTimer = null;
    if (!syncInFlight) {
      syncInFlight = syncSupabaseProgressNow().finally(() => {
        syncInFlight = null;
      });
    }
  }, 1200);
}
