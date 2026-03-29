-- チャット履歴を全削除し、プレビュー用メッセージを7件投入する。
-- App Store のスクリーンショット用（端末・文字量で1画面に収まらない場合はスクロールが必要になることがあります）。
-- 内容: 単語の今日の進捗報告風（アプリではレッスン＝クイズの同一フロー。1レッスン＝10語のため、語数は10刻み）/ TOPIK / 仲間。
-- Supabase Dashboard → SQL Editor で postgres 権限で実行してください（RLS をバイパス）。
-- 前提: public.chat_rooms に少なくとも1件のルームがあること（なければ migrations/20250101 を先に実行）。

BEGIN;

DELETE FROM public.chat_messages;

WITH r AS (
  SELECT id AS room_id
  FROM public.chat_rooms
  ORDER BY created_at ASC
  LIMIT 1
),
preview_lines AS (
  SELECT * FROM (VALUES
    -- sender_id はプレビュー用の架空UUID（レート制限を分散）。本文・表示名はすべて日本語。
    ('a1111111-1111-4111-8111-111111111101'::text, 'ゆい', '今日は50語やりました！調子よかったです'),
    ('a1111111-1111-4111-8111-111111111102'::text, 'けん', '今日は20語まで。今年TOPIK受けたいんですけど、語彙まだまだだなあと実感します。間違えたところは明日にもう一度やります'),
    ('a1111111-1111-4111-8111-111111111103'::text, 'ハナ', '今日は10語だけ。明日はもっと進めます'),
    ('a1111111-1111-4111-8111-111111111104'::text, 'あや', '今日は何語やりました？私は30語までやりました！'),
    ('a1111111-1111-4111-8111-111111111105'::text, 'みお', '今日は忙しくて10語だけ…。今年TOPIK受けたいんですけど、このペースで間に合うか不安です。みんなの報告見てモチベ上げてます'),
    ('a1111111-1111-4111-8111-111111111106'::text, 'りょう', '40語やった！久しぶりに充実した一日でした'),
    ('a1111111-1111-4111-8111-111111111107'::text, 'さくら', '一人だとサボりがちだったけど、ここで報告すると続けられます。仲間がいるのありがたいです')
  ) AS t(sender_id, sender_name, content)
)
INSERT INTO public.chat_messages (room_id, sender_id, sender_name, content, created_at)
SELECT
  r.room_id,
  preview_lines.sender_id,
  preview_lines.sender_name,
  preview_lines.content,
  now() - (7 - row_number() OVER (ORDER BY preview_lines.sender_id)) * interval '45 seconds'
FROM r
CROSS JOIN preview_lines;

COMMIT;
