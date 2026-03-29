-- チャット本文の長さ制限（スパム・肥大化防止）。既存 DB にも適用可能。
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_content_length;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_content_length CHECK (char_length(content) <= 2000);
