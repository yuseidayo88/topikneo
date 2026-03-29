-- チャットメッセージ挿入の最低限のチェック（空の sender_id / content を拒否）。
-- レート制限は Edge Function またはアプリ側で実装を検討してください。

DROP POLICY IF EXISTS "Allow insert chat_messages" ON public.chat_messages;

CREATE POLICY "Allow insert chat_messages" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    trim(sender_id) <> '' AND
    trim(content) <> ''
  );
