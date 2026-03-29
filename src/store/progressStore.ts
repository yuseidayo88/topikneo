import { create } from 'zustand';
import * as db from '../db/database';

type ProgressState = {
  reviewCount: number;
  totalLessonsCleared: number;
  totalCorrect: number;
  levelProgress: Record<number, number>;
  weeklyStats: { date: string; lessonsCleared: number; correctCount: number }[];
  /**
   * refresh() や DB 更新のたびに増やす。ホーム等が db を直接読む画面で再レンダーを起こすため
   * （zustand の refresh 関数参照だけでは購読コンポーネントが再描画されない）
   */
  dataRevision: number;
  refresh: () => void;
  bumpAfterLocalDbMutation: () => void;
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  reviewCount: 0,
  totalLessonsCleared: 0,
  totalCorrect: 0,
  levelProgress: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  weeklyStats: [],
  dataRevision: 0,
  refresh: () => {
    const wordIds = db.getWordsDueForReview(999);
    const totalCleared = db.getTotalLessonsCleared();
    const totalCorrect = db.getTotalCorrect();
    const levelProgress: Record<number, number> = {};
    for (let level = 1; level <= 6; level++) {
      levelProgress[level] = db.getLevelProgress(level, 'word') + db.getLevelProgress(level, 'grammar');
    }
    const weeklyStats = db.getWeeklyStats();
    set({
      reviewCount: wordIds.length,
      totalLessonsCleared: totalCleared,
      totalCorrect,
      levelProgress,
      weeklyStats,
      dataRevision: get().dataRevision + 1,
    });
  },
  bumpAfterLocalDbMutation: () => {
    set({ dataRevision: get().dataRevision + 1 });
  },
}));
