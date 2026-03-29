-- 同一 sender_id の送信回数を 1 分あたり 20 件までに制限（スパム対策）
-- 20250101〜20250104 の後に実行してください。

CREATE OR REPLACE FUNCTION public.chat_messages_rate_limit_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.chat_messages
  WHERE sender_id = NEW.sender_id
    AND created_at > now() - interval '1 minute';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'rate_limit_exceeded: 送信回数の上限に達しました。しばらく待ってからお試しください。'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_rate_limit ON public.chat_messages;

CREATE TRIGGER trg_chat_messages_rate_limit
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE PROCEDURE public.chat_messages_rate_limit_check();
