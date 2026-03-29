-- チャット用テーブル（1ルームから開始、将来複数ルーム対応）
-- Supabase Dashboard の SQL Editor で実行してください。

-- ルーム
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '全体チャット',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- メッセージ
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON public.chat_messages (room_id, created_at);

-- Realtime を有効化（失敗する場合は Dashboard > Database > Replication で chat_messages を有効にしてください）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END
$$;

-- RLS: 誰でも読み取り・挿入可（匿名チャット）
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read chat_rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Allow read chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow insert chat_messages" ON public.chat_messages;

CREATE POLICY "Allow read chat_rooms" ON public.chat_rooms FOR SELECT USING (true);
CREATE POLICY "Allow read chat_messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow insert chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- テストルームを1件挿入（既にルームがある場合はスキップ）
INSERT INTO public.chat_rooms (name)
SELECT 'テストルーム' WHERE NOT EXISTS (SELECT 1 FROM public.chat_rooms LIMIT 1);
