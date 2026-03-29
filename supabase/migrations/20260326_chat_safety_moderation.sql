-- UGC 安全対策（App Store Guideline 1.2）向けのチャット保護テーブル
-- - 規約同意
-- - 通報
-- - ブロック
-- - 自動BAN
-- Supabase Dashboard の SQL Editor で実行するか、supabase db push で適用してください。

-- チャット規約同意（UGC アクセス前提）
CREATE TABLE IF NOT EXISTS public.chat_terms_agreements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ユーザーのブロック関係（blocker が blocked_user を非表示）
CREATE TABLE IF NOT EXISTS public.chat_user_blocks (
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_user_blocks_blocker
  ON public.chat_user_blocks (blocker_user_id, created_at DESC);

-- 通報ログ
CREATE TABLE IF NOT EXISTS public.chat_message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reports_created
  ON public.chat_message_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_reports_reported_user
  ON public.chat_message_reports (reported_user_id, created_at DESC);

-- BAN テーブル（自動/手動共通）
CREATE TABLE IF NOT EXISTS public.chat_user_bans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('auto_ai', 'manual_report', 'admin_manual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_user_bans_active
  ON public.chat_user_bans (is_active, created_at DESC);

-- 監査イベント（AI 判定の記録）
CREATE TABLE IF NOT EXISTS public.chat_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('allow', 'blocked_and_banned', 'report_received', 'user_blocked')),
  reason TEXT,
  score REAL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_moderation_events_created
  ON public.chat_moderation_events (created_at DESC);

-- RLS
ALTER TABLE public.chat_terms_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own chat terms agreements" ON public.chat_terms_agreements;
DROP POLICY IF EXISTS "Users can insert own chat terms agreements" ON public.chat_terms_agreements;
DROP POLICY IF EXISTS "Users can update own chat terms agreements" ON public.chat_terms_agreements;

CREATE POLICY "Users can read own chat terms agreements"
  ON public.chat_terms_agreements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat terms agreements"
  ON public.chat_terms_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat terms agreements"
  ON public.chat_terms_agreements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own blocks" ON public.chat_user_blocks;
DROP POLICY IF EXISTS "Users can insert own blocks" ON public.chat_user_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON public.chat_user_blocks;

CREATE POLICY "Users can read own blocks"
  ON public.chat_user_blocks FOR SELECT
  USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can insert own blocks"
  ON public.chat_user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_user_id);

CREATE POLICY "Users can delete own blocks"
  ON public.chat_user_blocks FOR DELETE
  USING (auth.uid() = blocker_user_id);

DROP POLICY IF EXISTS "Users can read own reports" ON public.chat_message_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.chat_message_reports;

CREATE POLICY "Users can read own reports"
  ON public.chat_message_reports FOR SELECT
  USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can insert own reports"
  ON public.chat_message_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

-- BAN は本人のみ閲覧可。作成/更新はサービスロール or Edge Function 経由を前提。
DROP POLICY IF EXISTS "Users can read own bans" ON public.chat_user_bans;
CREATE POLICY "Users can read own bans"
  ON public.chat_user_bans FOR SELECT
  USING (auth.uid() = user_id);

-- 監査イベントは一般ユーザー非公開（必要なら管理者向けに別途）
DROP POLICY IF EXISTS "No direct read moderation events" ON public.chat_moderation_events;
CREATE POLICY "No direct read moderation events"
  ON public.chat_moderation_events FOR SELECT
  USING (false);

-- チャット送信は Edge Function（chat-send-message）経由に限定し、直接 INSERT を不可にする。
DROP POLICY IF EXISTS "Allow insert chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow insert chat_messages (require auth + pro)" ON public.chat_messages;
DROP POLICY IF EXISTS "No direct insert chat_messages" ON public.chat_messages;
CREATE POLICY "No direct insert chat_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (false);
