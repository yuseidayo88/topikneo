// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALERT_TO_EMAIL = Deno.env.get('CHAT_MOD_ALERT_TO') ?? 'info@topikneo.com';

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
    console.warn('[chat-block-user] RESEND_API_KEY is missing');
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
      console.error('[chat-block-user] resend failed', res.status, body);
    }
  } catch (e) {
    console.error('[chat-block-user] resend request error', e);
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
  const blockerId = user?.id as string | undefined;
  if (!blockerId) return json({ error: 'Missing user id' }, 401);

  const body = await request.json().catch(() => null);
  const blockedUserId = String(body?.blocked_user_id ?? '').trim();
  const reason = String(body?.reason ?? '').trim() || 'other';
  const sampleMessageId = String(body?.sample_message_id ?? '').trim() || null;
  if (!blockedUserId) return json({ error: 'blocked_user_id is required.' }, 400);
  if (blockedUserId === blockerId) return json({ error: 'Cannot block yourself.' }, 400);

  const { error: blockError } = await admin.from('chat_user_blocks').upsert(
    {
      blocker_user_id: blockerId,
      blocked_user_id: blockedUserId,
      reason,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'blocker_user_id,blocked_user_id' }
  );
  if (blockError) return json({ error: blockError.message }, 500);

  // ブロック直後の待ち時間を減らすため、付随する記録は並列で実行
  await Promise.all([
    admin.from('chat_message_reports').insert({
      message_id: sampleMessageId,
      reporter_user_id: blockerId,
      reported_user_id: blockedUserId,
      reason: `block:${reason}`,
      details: 'Reported via block action.',
      status: 'open',
    }),
    admin.from('chat_moderation_events').insert({
      user_id: blockerId,
      message_id: sampleMessageId,
      action: 'user_blocked',
      reason,
      payload: { blocked_user_id: blockedUserId },
    }),
  ]);

  // メール送信は非同期化して API 応答を速くする
  void sendAlertEmail(
    '[TOPIK NEO] User blocked + report created',
    `blocker=${blockerId}\nblocked_user=${blockedUserId}\nreason=${reason}\nsample_message_id=${sampleMessageId ?? ''}`
  );

  return json({ success: true }, 200);
});
