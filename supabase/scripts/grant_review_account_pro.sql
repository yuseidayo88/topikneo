-- 審査用アカウントを PRO（lifetime）として user_subscriptions に登録する。
-- ログイン後の syncWithServer がサーバー行を読み、チャット等の PRO 機能が有効になる。
--
-- 手順: Supabase Dashboard → SQL Editor → New query → 本ファイルを貼り付け → Run
-- 権限: postgres / service role（RLS をバイパスして書き込めること）
--
-- メールアドレスを変える場合は下の WHERE のみ編集してください。

INSERT INTO public.user_subscriptions (user_id, plan, expires_at, lifetime, updated_at)
SELECT id, 'lifetime', NULL, true, now()
FROM auth.users
WHERE lower(email) = lower('review@topikneo.app')
ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  expires_at = EXCLUDED.expires_at,
  lifetime = EXCLUDED.lifetime,
  updated_at = now();

-- 確認用（1行返れば OK）
SELECT u.email, s.plan, s.lifetime, s.expires_at, s.updated_at
FROM public.user_subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE lower(u.email) = lower('review@topikneo.app');
