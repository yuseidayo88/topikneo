// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALERT_TO_EMAIL = Deno.env.get('CHAT_MOD_ALERT_TO') ?? 'info@topikneo.com';

function jstNowString(): string {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });
}

function reasonJa(reason: string): string {
  switch (reason) {
    case 'spam':
      return 'スパム';
    case 'harassment':
      return '嫌がらせ';
    case 'hate':
      return 'ヘイト・差別';
    case 'sexual':
      return '性的な内容';
    case 'violence':
      return '暴力的な内容';
    case 'self_harm':
      return '自傷・自殺に関する内容';
    case 'other':
    default:
      return 'その他';
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendAlertEmail(subject: string, text: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('CHAT_MOD_ALERT_FROM') ?? 'TOPIK NEO <noreply@topikneo.com>';
  if (!resendApiKey) {
    console.warn('[chat-report-content] RESEND_API_KEY is missing');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [ALERT_TO_EMAIL],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[chat-report-content] resend failed', res.status, body);
    }
  } catch (e) {
    console.error('[chat-report-content] resend request error', e);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Supabase env missing' }, 500);
  if (!authorization) return json({ error: 'Missing authorization header' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!authRes.ok) return json({ error: 'Unauthorized' }, 401);
  const user = await authRes.json().catch(() => null);
  const reporterId = user?.id as string | undefined;
  if (!reporterId) return json({ error: 'Missing user id' }, 401);

  const body = await request.json().catch(() => null);
  const messageId = String(body?.message_id ?? '').trim();
  const reportedUserId = String(body?.reported_user_id ?? '').trim();
  const reason = String(body?.reason ?? '').trim() || 'other';
  const details = body?.details ? String(body.details).slice(0, 500) : null;
  if (!reportedUserId) return json({ error: 'reported_user_id is required.' }, 400);

  const { data, error } = await admin
    .from('chat_message_reports')
    .insert({
      message_id: messageId || null,
      reporter_user_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      details,
      status: 'open',
    })
    .select('id')
    .single();
  if (error) return json({ error: error.message }, 500);

  // レスポンスを最優先: 監査ログ/メール本文用の追加取得は非同期で実行
  void (async () => {
    try {
      await admin.from('chat_moderation_events').insert({
        user_id: reporterId,
        message_id: messageId || null,
        action: 'report_received',
        reason,
        payload: { reported_user_id: reportedUserId, details },
      });

      const [reporterNameRow, reportedNameRow, messageRow] = await Promise.all([
        admin.from('chat_messages').select('sender_name').eq('sender_id', reporterId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        admin.from('chat_messages').select('sender_name').eq('sender_id', reportedUserId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        messageId
          ? admin.from('chat_messages').select('content').eq('id', messageId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const reporterName = String(reporterNameRow.data?.sender_name ?? '').trim() || '(未設定)';
      const reportedName = String(reportedNameRow.data?.sender_name ?? '').trim() || '(未設定)';
      const messagePreview = String(messageRow.data?.content ?? '').trim();
      const messagePreviewShort = messagePreview.length > 200 ? `${messagePreview.slice(0, 200)}...` : messagePreview;

      await sendAlertEmail(
        `【要対応】チャット報告 ${reasonJa(reason)} / ${reportedName}`,
        [
          '[TOPIK NEO] チャット報告',
          '',
          `理由: ${reasonJa(reason)} (${reason})`,
          `発生時刻(JST): ${jstNowString()}`,
          '',
          '対象ユーザー',
          `- 名前: ${reportedName}`,
          `- ID: ${reportedUserId}`,
          '',
          '対象メッセージ',
          `- ID: ${messageId || '(なし)'}`,
          `- 本文: ${messagePreviewShort || '(取得不可)'}`,
          '',
          '報告者',
          `- 名前: ${reporterName}`,
          `- ID: ${reporterId}`,
          '',
          `details: ${details ?? ''}`,
          `report_id: ${data.id}`,
        ].join('\n')
      );
    } catch (e) {
      console.error('[chat-report-content] async post-processing failed', e);
    }
  })();

  return json({ success: true, report_id: data.id }, 200);
});
