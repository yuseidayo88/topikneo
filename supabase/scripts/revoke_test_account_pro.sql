-- テスト用アカウントの PRO 権限を剥奪する（user_subscriptions から削除）。
-- 手順: Supabase Dashboard → SQL Editor → New query → 本ファイルを貼り付け → Run

DELETE FROM public.user_subscriptions
WHERE user_id IN (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('test@test.com')
);

-- 確認用（0行なら剥奪完了）
SELECT u.email, s.plan, s.lifetime, s.expires_at, s.updated_at
FROM public.user_subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE lower(u.email) = lower('test@test.com');
