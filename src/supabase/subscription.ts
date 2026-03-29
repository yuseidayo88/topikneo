/**
 * ユーザーごとのサブスクリプション状態を Supabase から取得する。
 * 本番ではサーバー検証済みの情報のみを読み取り、クライアントからは権限を書き換えない。
 */

import { supabase } from './client';
import { isSupabaseConfigured } from './client';

export type ServerSubscriptionRow = {
  user_id: string;
  plan: 'monthly' | 'yearly' | 'lifetime';
  expires_at: string | null;
  lifetime: boolean;
  updated_at: string;
};

/** サーバーから現在ユーザーのサブスク状態を取得。無い場合は null */
export async function getServerSubscription(userId: string): Promise<ServerSubscriptionRow | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan, expires_at, lifetime, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data as ServerSubscriptionRow | null;
}

const SYNC_SUBSCRIPTION_FUNCTION_NAME = 'sync-subscription';

export async function syncRevenueCatSubscriptionToSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error, data } = await supabase.functions.invoke(SYNC_SUBSCRIPTION_FUNCTION_NAME, {
    body: {},
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
}

