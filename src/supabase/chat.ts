import { supabase, isSupabaseConfigured } from './client';
import { logger } from '../utils/logger';

/** ルーム名のデフォルト表示（ヘッダーサブタイトル等で使用） */
export const DEFAULT_ROOM_NAME = '全体チャット';
/** 言語別チャットルームの標準順 */
export const LANGUAGE_CHAT_ROOM_NAMES = ['日本語', '英語', '中国語', '韓国語', 'ベトナム語'] as const;

export type ChatRoom = {
  id: string;
  name: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  reply_to_message_id?: string | null;
  created_at: string;
};

export type ChatReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'sexual'
  | 'violence'
  | 'self_harm'
  | 'other';

export type ChatModerationStatus = {
  agreedTerms: boolean;
  termsVersion: string | null;
  isBanned: boolean;
  banReason: string | null;
  blockedUserIds: string[];
};

export type BlockedChatUser = {
  userId: string;
  displayName: string | null;
};

export type SendMessageResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; reason: 'blocked' | 'auth' | 'network' | 'unknown' };

function roomPriority(name: string): number {
  const idx = LANGUAGE_CHAT_ROOM_NAMES.indexOf(name as (typeof LANGUAGE_CHAT_ROOM_NAMES)[number]);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export async function getCurrentSenderId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    logger.warn('[chat] getCurrentSenderId error', error);
    return null;
  }
  return data.user?.id ?? null;
}

/** ルーム一覧を取得（言語ルームは固定順で先頭に並べる） */
export async function fetchRooms(): Promise<ChatRoom[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[chat] fetchRooms error', error);
    return [];
  }
  const list = (data ?? []) as ChatRoom[];
  return list.sort((a, b) => {
    const pa = roomPriority(a.name);
    const pb = roomPriority(b.name);
    if (pa !== pb) return pa - pb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/** デフォルトルーム（先頭）を取得 */
export async function getDefaultRoom(): Promise<ChatRoom | null> {
  const rooms = await fetchRooms();
  return rooms[0] ?? null;
}

const DEFAULT_PAGE_SIZE = 30;

/** ルームのメッセージ一覧を全件取得（互換用・リフレッシュ時など） */
export async function fetchMessages(roomId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, sender_id, sender_name, content, reply_to_message_id, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[chat] fetchMessages error', error);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}

/** 最新メッセージを取得（新しい順に limit 件取得し、返却は古い→新しい順） */
export async function fetchMessagesLatest(roomId: string, limit = DEFAULT_PAGE_SIZE): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, sender_id, sender_name, content, reply_to_message_id, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.warn('[chat] fetchMessagesLatest error', error);
    return [];
  }
  const list = (data ?? []) as ChatMessage[];
  return list.reverse();
}

export function filterBlockedMessages(messages: ChatMessage[], blockedUserIds: string[]): ChatMessage[] {
  if (!blockedUserIds.length) return messages;
  const blocked = new Set(blockedUserIds);
  return messages.filter((m) => !blocked.has(m.sender_id));
}

/** 指定時刻より古いメッセージを取得（created_at < beforeCreatedAt、古い→新しい順で limit 件） */
export async function fetchMessagesOlderThan(
  roomId: string,
  beforeCreatedAt: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, sender_id, sender_name, content, reply_to_message_id, created_at')
    .eq('room_id', roomId)
    .lt('created_at', beforeCreatedAt)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.warn('[chat] fetchMessagesOlderThan error', error);
    return [];
  }
  const list = (data ?? []) as ChatMessage[];
  return list.reverse();
}

function isNetworkLikeError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  if (/network request failed/i.test(msg)) return true;
  if (/failed to fetch/i.test(msg)) return true;
  if (/network error/i.test(msg)) return true;
  return false;
}

function parseInvokeDetail(detail: unknown): { code?: number; message?: string } | null {
  if (!detail || typeof detail !== 'object') return null;
  const o = detail as { code?: number; message?: string };
  return { code: o.code, message: o.message };
}

/**
 * Edge Functions 呼び出し用のアクセストークンを取得する。
 *
 * supabase-js の fetchWithAuth は session に access_token が無いと anon キーを Bearer に使う。
 * ゲートウェイはユーザ JWT を期待するため Invalid JWT になる（実装上の落とし穴）。
 * getUser → getSession で必ずユーザ JWT を付与する。
 */
async function getValidatedAccessTokenForFunctions(): Promise<
  { ok: true; accessToken: string } | { ok: false; reason: 'auth' | 'network' }
> {
  const nowSec = Math.floor(Date.now() / 1000);
  const minTtlSec = 30;

  let { data: sessionData } = await supabase.auth.getSession();
  let accessToken = sessionData.session?.access_token;
  const expiresAt = sessionData.session?.expires_at ?? 0;
  const hasFreshSessionToken = !!accessToken && expiresAt > nowSec + minTtlSec;
  if (hasFreshSessionToken) {
    return { ok: true, accessToken };
  }

  const { error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    logger.warn('[chat] getUser before functions invoke', userErr);
    if (isNetworkLikeError(userErr)) return { ok: false, reason: 'network' };
    return { ok: false, reason: 'auth' };
  }

  ({ data: sessionData } = await supabase.auth.getSession());
  accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    const { error: refErr } = await supabase.auth.refreshSession();
    if (refErr) {
      logger.warn('[chat] no access_token after getUser, refreshSession failed', refErr);
      return { ok: false, reason: 'auth' };
    }
    ({ data: sessionData } = await supabase.auth.getSession());
    accessToken = sessionData.session?.access_token;
  }
  if (!accessToken) {
    logger.warn('[chat] no access_token for functions invoke (SDK would use anon key as Bearer)');
    return { ok: false, reason: 'auth' };
  }
  return { ok: true, accessToken };
}

/** メッセージ送信 */
export async function sendMessage(
  roomId: string,
  content: string,
  senderName: string,
  replyToMessageId?: string | null
): Promise<SendMessageResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'unknown' };

  const body = {
    room_id: roomId,
    content: content.trim(),
    sender_name: senderName,
    reply_to_message_id: replyToMessageId ?? null,
  };

  const tryInvoke = async (accessToken: string) => {
    const res = await supabase.functions.invoke('chat-send-message', {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    let detail: unknown = null;
    if (res.error && typeof (res.error as { context?: { json?: () => Promise<unknown> } }).context?.json === 'function') {
      try {
        detail = await (res.error as { context: { json: () => Promise<unknown> } }).context.json();
      } catch {
        detail = null;
      }
    }
    return { ...res, detail };
  };

  try {
    let auth = await getValidatedAccessTokenForFunctions();
    if (!auth.ok) return { ok: false, reason: auth.reason };

    let { data, error, detail } = await tryInvoke(auth.accessToken);
    const parsed = parseInvokeDetail(detail);
    const invalidJwt =
      !!error &&
      parsed?.code === 401 &&
      String(parsed.message ?? '').toLowerCase().includes('invalid jwt');

    if (invalidJwt) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) {
        logger.warn('[chat] sendMessage refreshSession failed', refreshErr);
        return { ok: false, reason: 'auth' };
      }
      auth = await getValidatedAccessTokenForFunctions();
      if (!auth.ok) return { ok: false, reason: auth.reason };
      ({ data, error, detail } = await tryInvoke(auth.accessToken));
    }

    if (error || data?.error) {
      if (detail) logger.warn('[chat] sendMessage invoke error detail', detail);
      logger.warn('[chat] sendMessage invoke error', error ?? data?.error);

      const p2 = parseInvokeDetail(detail);
      if (p2?.code === 401) return { ok: false, reason: 'auth' };

      if (data?.blocked) return { ok: false, reason: 'blocked' };
      return { ok: false, reason: 'unknown' };
    }
    if (data?.blocked) return { ok: false, reason: 'blocked' };
    const msg = data?.message as ChatMessage | undefined;
    if (!msg) return { ok: false, reason: 'unknown' };
    return { ok: true, message: msg };
  } catch (e) {
    if (isNetworkLikeError(e)) {
      logger.warn('[chat] sendMessage network error', e);
      return { ok: false, reason: 'network' };
    }
    logger.warn('[chat] sendMessage unexpected error', e);
    return { ok: false, reason: 'unknown' };
  }
}

export async function getChatModerationStatus(termsVersion: string): Promise<ChatModerationStatus> {
  if (!isSupabaseConfigured()) {
    return {
      agreedTerms: false,
      termsVersion: null,
      isBanned: false,
      banReason: null,
      blockedUserIds: [],
    };
  }
  const userId = await getCurrentSenderId();
  if (!userId) {
    return {
      agreedTerms: false,
      termsVersion: null,
      isBanned: false,
      banReason: null,
      blockedUserIds: [],
    };
  }

  const [{ data: terms }, { data: ban }, { data: blocks }] = await Promise.all([
    supabase
      .from('chat_terms_agreements')
      .select('terms_version')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('chat_user_bans')
      .select('reason, is_active, expires_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('chat_user_blocks')
      .select('blocked_user_id')
      .eq('blocker_user_id', userId),
  ]);

  const now = Date.now();
  const banActive =
    !!ban?.is_active &&
    (!ban.expires_at || new Date(ban.expires_at).getTime() > now);
  const blockedUserIds = (blocks ?? [])
    .map((row) => row.blocked_user_id as string)
    .filter(Boolean);

  return {
    agreedTerms: terms?.terms_version === termsVersion,
    termsVersion: terms?.terms_version ?? null,
    isBanned: banActive,
    banReason: banActive ? String(ban?.reason ?? '') : null,
    blockedUserIds,
  };
}

export async function agreeChatTerms(termsVersion: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const userId = await getCurrentSenderId();
  if (!userId) return false;
  const { error } = await supabase
    .from('chat_terms_agreements')
    .upsert(
      { user_id: userId, terms_version: termsVersion, agreed_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) {
    logger.warn('[chat] agreeChatTerms error', error);
    return false;
  }
  return true;
}

export async function reportMessage(
  messageId: string,
  reportedUserId: string,
  reason: ChatReportReason,
  details?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const auth = await getValidatedAccessTokenForFunctions();
  if (!auth.ok) return false;
  const { error, data } = await supabase.functions.invoke('chat-report-content', {
    body: {
      message_id: messageId,
      reported_user_id: reportedUserId,
      reason,
      details: details?.trim() ? details.trim() : null,
    },
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  if (error || data?.error) {
    logger.warn('[chat] reportMessage error', error ?? data?.error);
    return false;
  }
  return true;
}

export async function blockUser(
  blockedUserId: string,
  reason: ChatReportReason,
  sampleMessageId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const auth = await getValidatedAccessTokenForFunctions();
  if (!auth.ok) return false;
  const { error, data } = await supabase.functions.invoke('chat-block-user', {
    body: {
      blocked_user_id: blockedUserId,
      reason,
      sample_message_id: sampleMessageId ?? null,
    },
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  if (error || data?.error) {
    logger.warn('[chat] blockUser error', error ?? data?.error);
    return false;
  }
  return true;
}

export async function unblockUser(blockedUserId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('chat_user_blocks')
    .delete()
    .eq('blocked_user_id', blockedUserId);
  if (error) {
    logger.warn('[chat] unblockUser error', error);
    return false;
  }
  return true;
}

export async function getBlockedChatUsers(): Promise<BlockedChatUser[]> {
  if (!isSupabaseConfigured()) return [];
  const userId = await getCurrentSenderId();
  if (!userId) return [];

  const { data: blocks, error: blockErr } = await supabase
    .from('chat_user_blocks')
    .select('blocked_user_id, created_at')
    .eq('blocker_user_id', userId)
    .order('created_at', { ascending: false });
  if (blockErr) {
    logger.warn('[chat] getBlockedChatUsers blocks error', blockErr);
    return [];
  }

  const ids = (blocks ?? []).map((row) => String(row.blocked_user_id ?? '')).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: msgs, error: msgErr } = await supabase
    .from('chat_messages')
    .select('sender_id, sender_name, created_at')
    .in('sender_id', ids)
    .order('created_at', { ascending: false });
  if (msgErr) {
    logger.warn('[chat] getBlockedChatUsers messages error', msgErr);
  }

  const nameById = new Map<string, string>();
  for (const row of msgs ?? []) {
    const sid = String((row as { sender_id?: string }).sender_id ?? '');
    const sname = String((row as { sender_name?: string | null }).sender_name ?? '').trim();
    if (!sid || !sname || nameById.has(sid)) continue;
    nameById.set(sid, sname);
  }

  return ids.map((id) => ({ userId: id, displayName: nameById.get(id) ?? null }));
}

export type RealtimeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

/** メッセージの Realtime 購読。onStatusChange で接続エラー時に再購読等が可能。 */
export function subscribeMessages(
  roomId: string,
  onMessage: (payload: { new?: ChatMessage; old?: ChatMessage }) => void,
  onStatusChange?: (status: RealtimeStatus, err?: Error) => void
): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel(`chat:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) onMessage({ new: payload.new as ChatMessage });
        if (payload.old) onMessage({ old: payload.old as ChatMessage });
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('SUBSCRIBED');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        logger.warn('[chat] Realtime status', status, err?.message);
        onStatusChange?.(status as RealtimeStatus, err ?? undefined);
      }
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
