// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TERMS_VERSION = Deno.env.get('CHAT_TERMS_VERSION') ?? '2026-03-26';
const ALERT_TO_EMAIL = Deno.env.get('CHAT_MOD_ALERT_TO') ?? 'info@topikneo.com';

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getVerifiedUserId(
  supabaseUrl: string,
  authorization: string | null
): Promise<string | null> {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_KEY');
  if (!authorization || !anonKey) return null;
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user?.id) return null;
  return user.id;
}

function heuristicModeration(text: string): { flagged: boolean; score: number; reason: string | null } {
  const t = text.toLowerCase();
  const severe = [
    'kill yourself',
    'go die',
    'suicide',
    'rape',
    'nazi',
    'faggot',
    'nigger',
    'terrorist',
    'child porn',
  ];
  const hit = severe.find((k) => t.includes(k));
  if (hit) return { flagged: true, score: 0.98, reason: `keyword:${hit}` };
  return { flagged: false, score: 0.05, reason: null };
}

async function aiModeration(text: string): Promise<{ flagged: boolean; score: number; reason: string | null }> {
  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiApiKey) return heuristicModeration(text);

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: text,
      }),
    });
    if (!res.ok) return heuristicModeration(text);
    const data = await res.json().catch(() => null);
    const result = data?.results?.[0];
    const flagged = Boolean(result?.flagged);
    const categories = result?.categories ?? {};
    const scores = result?.category_scores ?? {};
    const topCategory = Object.keys(scores).sort(
      (a, b) => Number(scores[b] ?? 0) - Number(scores[a] ?? 0)
    )[0];
    const reason = flagged ? `ai:${topCategory ?? 'flagged'}` : null;
    const score = Number(scores[topCategory] ?? 0);
    return { flagged, score, reason };
  } catch {
    return heuristicModeration(text);
  }
}

async function sendAlertEmail(subject: string, text: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('CHAT_MOD_ALERT_FROM') ?? 'TOPIK NEO <noreply@topikneo.com>';
  if (!resendApiKey) {
    console.warn('[chat-send-message] RESEND_API_KEY is missing');
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
      console.error('[chat-send-message] resend failed', res.status, body);
    }
  } catch (e) {
    console.error('[chat-send-message] resend request error', e);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase environment is not configured.' }, 500);
  }
  const userId = await getVerifiedUserId(supabaseUrl, authorization);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await request.json().catch(() => null);
  const roomId = String(body?.room_id ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const senderName = String(body?.sender_name ?? '').trim().slice(0, 60);
  let replyToMessageId = body?.reply_to_message_id ? String(body.reply_to_message_id).trim() : null;
  if (!roomId || !content) return json({ error: 'room_id and content are required.' }, 400);

  if (replyToMessageId) {
    const { data: replyTarget, error: replyTargetError } = await admin
      .from('chat_messages')
      .select('id, room_id')
      .eq('id', replyToMessageId)
      .maybeSingle();
    // Reply target can be stale on client (e.g. optimistic temp id replaced later).
    // In that case, gracefully downgrade to a normal message instead of rejecting.
    if (replyTargetError || !replyTarget || replyTarget.room_id !== roomId) {
      replyToMessageId = null;
    }
  }

  // 1) 規約同意チェック
  const { data: agreed } = await admin
    .from('chat_terms_agreements')
    .select('terms_version')
    .eq('user_id', userId)
    .maybeSingle();
  // Require terms consent, but don't hard-fail on version mismatch.
  // Mismatch can happen when environment and app versions drift temporarily.
  if (!agreed) {
    return json({ error: 'Chat terms agreement is required before posting.' }, 403);
  }

  // 2) BAN チェック
  const { data: ban } = await admin
    .from('chat_user_bans')
    .select('is_active, expires_at, reason')
    .eq('user_id', userId)
    .maybeSingle();
  const isBanActive =
    Boolean(ban?.is_active) && (!ban?.expires_at || new Date(ban.expires_at).getTime() > Date.now());
  if (isBanActive) {
    return json({ blocked: true, error: 'This account is restricted from chat.' }, 403);
  }

  // 3) AI 判定
  const mod = await aiModeration(content);
  if (mod.flagged) {
    await admin.from('chat_user_bans').upsert(
      {
        user_id: userId,
        reason: mod.reason ?? 'auto_ai',
        source: 'auto_ai',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    await admin.from('chat_moderation_events').insert({
      user_id: userId,
      action: 'blocked_and_banned',
      reason: mod.reason ?? 'auto_ai',
      score: mod.score,
      payload: { content_sample: content.slice(0, 200) },
    });
    await admin.from('chat_message_reports').insert({
      reporter_user_id: userId,
      reported_user_id: userId,
      reason: mod.reason ?? 'auto_ai',
      details: 'Auto-detected and blocked by AI moderation.',
      status: 'open',
    });
    await sendAlertEmail(
      '[TOPIK NEO] Auto-ban by AI moderation',
      `user_id=${userId}\nreason=${mod.reason}\nscore=${mod.score}\ncontent=${content.slice(0, 500)}`
    );
    return json({ blocked: true, reason: mod.reason ?? 'auto_ai' }, 200);
  }

  // 4) 通常送信
  const { data: message, error: insertError } = await admin
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: userId,
      sender_name: senderName || null,
      content,
      reply_to_message_id: replyToMessageId,
    })
    .select('id, room_id, sender_id, sender_name, content, reply_to_message_id, created_at')
    .single();

  if (insertError) return json({ error: insertError.message }, 500);

  await admin.from('chat_moderation_events').insert({
    user_id: userId,
    message_id: message.id,
    action: 'allow',
    score: mod.score,
    payload: { length: content.length },
  });

  return json({ success: true, message }, 200);
});
