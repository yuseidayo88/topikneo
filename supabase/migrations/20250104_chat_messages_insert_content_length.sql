-- 挿入時に本文長を RLS でもチェック（2000 文字以内）。DB 制約と二重で守る。
DROP POLICY IF EXISTS "Allow insert chat_messages" ON public.chat_messages;

CREATE POLICY "Allow insert chat_messages" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    trim(sender_id) <> '' AND
    trim(content) <> '' AND
    char_length(content) <= 2000
  );
