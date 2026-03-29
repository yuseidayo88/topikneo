-- KLA 進捗同期用テーブル（Supabase Dashboard → SQL Editor で実行）
-- ログイン済みユーザーの user_id は auth.uid() と一致させる

-- 単語の復習進捗（SM-2）
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review_date TEXT,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, word_id)
);

-- レッスンクリア済み
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  type TEXT NOT NULL,
  is_cleared INTEGER DEFAULT 0,
  cleared_at TEXT,
  PRIMARY KEY (user_id, lesson_id)
);

-- 保存した単語
CREATE TABLE IF NOT EXISTS saved_words (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (user_id, word_id)
);

-- 連続学習日数
CREATE TABLE IF NOT EXISTS streak (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  last_cleared_date TEXT,
  longest_streak INTEGER DEFAULT 0
);

-- 日別サマリー
CREATE TABLE IF NOT EXISTS daily_stats (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  lessons_cleared INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- RLS: 自分の行だけ読み書き可能
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_progress_own" ON user_progress;
DROP POLICY IF EXISTS "lesson_progress_own" ON lesson_progress;
DROP POLICY IF EXISTS "saved_words_own" ON saved_words;
DROP POLICY IF EXISTS "streak_own" ON streak;
DROP POLICY IF EXISTS "daily_stats_own" ON daily_stats;

CREATE POLICY "user_progress_own" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "lesson_progress_own" ON lesson_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "saved_words_own" ON saved_words
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "streak_own" ON streak
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "daily_stats_own" ON daily_stats
  FOR ALL USING (auth.uid() = user_id);
