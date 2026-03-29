-- ユーザーごとのサブスクリプション状態（ログイン時にローカル購入を紐付け、複数デバイスで利用可能にする）
-- Supabase Dashboard の SQL Editor で実行するか、supabase db push で適用してください。

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly', 'lifetime')),
  expires_at TIMESTAMPTZ,
  lifetime BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_subscriptions IS 'ログイン済みユーザーのサブスク状態。サーバー検証済みの購読情報を保持する。';

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;

-- 自分の行のみ読み取り可能
CREATE POLICY "Users can read own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 書き込みはサーバー側の検証フロー/管理経由に限定する。
