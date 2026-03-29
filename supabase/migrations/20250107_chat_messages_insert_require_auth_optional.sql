-- オプション: チャットの送信を「PRO かつログイン済みユーザーのみ」に制限する場合に実行してください。
-- 実行後は未ログイン・非PROでは送信できず、クライアントで適切な案内を出してください。
-- 匿名チャットのままにする場合はこのマイグレーションは実行しないでください。
-- 20250101〜20250106 の後に実行。

DROP POLICY IF EXISTS "Allow insert chat_messages" ON public.chat_messages;

CREATE POLICY "Allow insert chat_messages" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()::text
    AND trim(sender_id) <> ''
    AND trim(content) <> ''
    AND char_length(content) <= 2000
    AND EXISTS (
      SELECT 1
      FROM public.user_subscriptions us
      WHERE us.user_id = auth.uid()
        AND (
          us.lifetime = true
          OR (us.expires_at IS NOT NULL AND us.expires_at > now())
        )
    )
  );
