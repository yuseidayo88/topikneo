-- 言語別チャットルームを作成（既存は維持）
-- 既に存在する名前は重複作成しない。
INSERT INTO public.chat_rooms (name)
SELECT v.name
FROM (
  VALUES
    ('日本語'),
    ('英語'),
    ('中国語'),
    ('韓国語'),
    ('ベトナム語')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.chat_rooms r
  WHERE r.name = v.name
);
