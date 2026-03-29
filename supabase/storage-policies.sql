-- Storage バケット "content" 用のポリシー（Supabase Dashboard → SQL Editor で実行）
-- 事前に Dashboard → Storage → New bucket で名前 "content"、Public オン で作成すること。

-- 誰でも（anon）content バケットのファイルを読み取り可能
DROP POLICY IF EXISTS "content public read" ON storage.objects;
DROP POLICY IF EXISTS "content anon upload" ON storage.objects;
DROP POLICY IF EXISTS "content anon update" ON storage.objects;

CREATE POLICY "content public read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'content');

-- 書き込みは service role / ダッシュボード運用で行う。
