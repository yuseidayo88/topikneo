import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerInfo } from 'react-native-purchases';
import { isRevenueCatConfigured } from '../revenuecat/config';
import {
  getServerSubscription,
  syncRevenueCatSubscriptionToSupabase,
} from '../supabase/subscription';

const KEY = 'kla_subscription';

/** 無料会員が各TOPIKレベルでプレイできるレッスン数（1・2のみ）。3以上はPRO */
export const FREE_LESSONS_PER_LEVEL = 2;

export type SubscriptionPlan = 'monthly' | 'yearly' | 'lifetime';
export type SubscriptionSource = 'debug' | 'app_store' | 'server' | 'revenuecat';

export type PurchaseResult = { success: boolean; error?: string; /** 年額→月額など、期間終了後に切り替えが予約された場合 true */
  downgradeScheduled?: boolean;
  source?: SubscriptionSource };

type SubscriptionState = {
  isSubscribed: boolean;
  expiresAt: string | null; // ISO date string（lifetime のときは null）
  /** 買い切り購入済みか */
  isLifetime: boolean;
  /** 現在のプラン（プラン切り替え表示・アップグレード用） */
  currentPlan: SubscriptionPlan | null;
  /** 現在の期間終了後に切り替えるプラン（ダウングレード予約）。表示用 */
  pendingPlan: SubscriptionPlan | null;
  /** サブスク状態の由来。debug は開発用シミュレーション。 */
  source: SubscriptionSource | null;
  load: () => Promise<void>;
  /**
   * 購入。本番では App Store / Google Play IAP（StoreKit2 / Google Play Billing）または
   * RevenueCat 等に差し替える。現在は AsyncStorage でシミュレート。
   * 年額→月額のダウングレードは「現在期間終了後」に適用する。
   */
  purchase: (plan: SubscriptionPlan) => Promise<PurchaseResult>;
  /**
   * 購入を復元。本番ではストアの restorePurchases に差し替える。
   */
  restore: () => Promise<{ success: boolean; error?: string }>;
  /** 有効なサブスク中か（年額・月額の有効期限内、または lifetime） */
  isSubscriptionActive: () => boolean;
  /** 開発用: サブスク状態を解除（AsyncStorage を削除） */
  clearForDevelopment: () => Promise<void>;
  /** ローカルに保持している購読状態を削除する。 */
  clearLocalState: () => Promise<void>;
  /**
   * ログイン中にサーバーの検証済みサブスク状態を取得する。
   * クライアントからサーバーの権限状態は更新しない。
   */
  syncWithServer: (userId: string) => Promise<void>;
};

function canUseDevelopmentSubscriptionFallback(): boolean {
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  return process.env.NODE_ENV === 'test';
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) <= new Date();
}

function parseCurrentPlan(data: { lifetime?: boolean; plan?: string; expires_at?: string | null }): SubscriptionPlan | null {
  if (data.lifetime === true) return 'lifetime';
  const plan = data.plan;
  if (plan === 'monthly' || plan === 'yearly' || plan === 'lifetime') return plan;
  if (data.expires_at) return 'yearly';
  return null;
}

function parsePendingPlan(data: { pending_plan?: string }): SubscriptionPlan | null {
  const p = data.pending_plan;
  if (p === 'monthly' || p === 'yearly' || p === 'lifetime') return p;
  return null;
}

function parseSource(data: { source?: string }): SubscriptionSource | null {
  if (
    data.source === 'debug' ||
    data.source === 'app_store' ||
    data.source === 'server' ||
    data.source === 'revenuecat'
  ) {
    return data.source;
  }
  return null;
}

function emptySubscriptionState() {
  return {
    isSubscribed: false,
    expiresAt: null,
    isLifetime: false,
    currentPlan: null,
    pendingPlan: null,
    source: null,
  } as const;
}

function productIdToPlan(productIdentifier: string | null | undefined): SubscriptionPlan | null {
  if (!productIdentifier) return null;
  if (productIdentifier === process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_MONTHLY || productIdentifier === 'monthly') return 'monthly';
  if (productIdentifier === process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_YEARLY || productIdentifier === 'yearly') return 'yearly';
  if (productIdentifier === process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_LIFETIME || productIdentifier === 'lifetime') return 'lifetime';
  return null;
}

function customerInfoToSubscriptionState(
  customerInfo: CustomerInfo | null,
  entitlementId: string
) {
  if (!customerInfo) return emptySubscriptionState();

  const entitlement = customerInfo.entitlements.active[entitlementId];
  if (!entitlement?.isActive) return emptySubscriptionState();

  const currentPlan = productIdToPlan(entitlement.productIdentifier);
  const isLifetime = currentPlan === 'lifetime' || entitlement.expirationDate === null;

  return {
    isSubscribed: true,
    expiresAt: isLifetime ? null : entitlement.expirationDate ?? customerInfo.latestExpirationDate,
    isLifetime,
    currentPlan,
    pendingPlan: null,
    source: 'revenuecat' as const,
  };
}

async function applyRevenueCatCustomerInfo(
  customerInfo: CustomerInfo | null,
  entitlementId: string,
  set: (partial: Partial<SubscriptionState>) => void
): Promise<boolean> {
  if (!customerInfo) return false;
  const next = customerInfoToSubscriptionState(customerInfo, entitlementId);
  if (!next.isSubscribed) {
    /**
     * RC は configure / logIn の直後やネットワークで一時的に「未購入」になり得る。
     * ここで AsyncStorage を消すと再起動のたびに Pro が消えるので、
     * 未購入のときは状態を確定せず false を返し load() の後段で AsyncStorage を読む。
     * （キャンセル済みは syncWithServer や次回の RC 取得で整合させる）
     */
    return false;
  }
  set(next);
  await persistSubscriptionToStorage(next);
  return true;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isSubscribed: false,
  expiresAt: null,
  isLifetime: false,
  currentPlan: null,
  pendingPlan: null,
  source: null,

  load: async () => {
    if (isRevenueCatConfigured()) {
      try {
        const client = await import('../revenuecat/client');
        const customerInfo = await client.getRevenueCatCustomerInfo();
        const entitlementId = client.getRevenueCatEntitlementId();
        if (await applyRevenueCatCustomerInfo(customerInfo, entitlementId, set)) return;
      } catch {
        // RevenueCat 未ロード時やエラー時は AsyncStorage へフォールバック
      }
    }
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        set(emptySubscriptionState());
        return;
      }
      const data = JSON.parse(raw);
      const lifetime = data.lifetime === true;
      let expiresAt = data.expires_at ?? null;
      let currentPlan = parseCurrentPlan(data);
      let pendingPlan = parsePendingPlan(data);
      const source = parseSource(data);

      if (!canUseDevelopmentSubscriptionFallback() && source === 'debug') {
        await AsyncStorage.removeItem(KEY);
        set(emptySubscriptionState());
        return;
      }

      if (!lifetime && expiresAt && isExpired(expiresAt) && pendingPlan === 'monthly') {
        const now = new Date();
        const next = new Date(now);
        next.setMonth(next.getMonth() + 1);
        expiresAt = next.toISOString();
        currentPlan = 'monthly';
        pendingPlan = null;
        await AsyncStorage.setItem(KEY, JSON.stringify({ expires_at: expiresAt, lifetime: false, plan: 'monthly', source }));
      } else if (!lifetime && expiresAt && isExpired(expiresAt)) {
        set(emptySubscriptionState());
        return;
      }

      const active = lifetime || (!!expiresAt && !isExpired(expiresAt));
      set({ isSubscribed: active, expiresAt, isLifetime: lifetime, currentPlan, pendingPlan, source });
    } catch {
      set(emptySubscriptionState());
    }
  },

  purchase: async (plan: SubscriptionPlan) => {
    if (isRevenueCatConfigured()) {
      try {
        const client = await import('../revenuecat/client');
        const result = await client.purchaseRevenueCatPlan(plan);
        const entitlementId = client.getRevenueCatEntitlementId();
        const next = customerInfoToSubscriptionState(result.customerInfo, entitlementId);
        set(next);
        if (next.isSubscribed) {
          await persistSubscriptionToStorage(next);
        }
        return { success: true, source: 'revenuecat' };
      } catch (e) {
        const rc = await import('../revenuecat/client').catch(() => null);
        if (rc?.isRevenueCatPurchaseCancelled(e)) {
          return { success: false, error: '購入をキャンセルしました。' };
        }
        return { success: false, error: rc?.getRevenueCatErrorMessage(e) ?? '購入に失敗しました。' };
      }
    }

    if (!canUseDevelopmentSubscriptionFallback()) {
      return { success: false, error: 'このビルドではローカル課金シミュレーションを利用できません。' };
    }
    try {
      const { currentPlan, expiresAt, isLifetime } = get();
      const active = isLifetime || (!!expiresAt && !isExpired(expiresAt));

      if (plan === 'lifetime') {
        await AsyncStorage.setItem(KEY, JSON.stringify({ lifetime: true, plan: 'lifetime', source: 'debug' }));
        set({ isSubscribed: true, expiresAt: null, isLifetime: true, currentPlan: 'lifetime', pendingPlan: null, source: 'debug' });
        return { success: true, source: 'debug' };
      }

      const now = new Date();
      const expires = new Date(now);
      if (plan === 'yearly') {
        expires.setFullYear(expires.getFullYear() + 1);
      } else {
        expires.setMonth(expires.getMonth() + 1);
      }
      const newExpiresAt = expires.toISOString();

      if (active && currentPlan === 'yearly' && plan === 'monthly') {
        await AsyncStorage.setItem(KEY, JSON.stringify({
          expires_at: expiresAt!,
          lifetime: false,
          plan: 'yearly',
          pending_plan: 'monthly',
          source: 'debug',
        }));
        set({ pendingPlan: 'monthly', source: 'debug' });
        return { success: true, downgradeScheduled: true, source: 'debug' };
      }

      await AsyncStorage.setItem(KEY, JSON.stringify({ expires_at: newExpiresAt, lifetime: false, plan, source: 'debug' }));
      set({ isSubscribed: true, expiresAt: newExpiresAt, isLifetime: false, currentPlan: plan, pendingPlan: null, source: 'debug' });
      return { success: true, source: 'debug' };
    } catch (e) {
      const message = e instanceof Error ? e.message : '購入に失敗しました';
      return { success: false, error: message };
    }
  },

  restore: async () => {
    if (isRevenueCatConfigured()) {
      try {
        const client = await import('../revenuecat/client');
        const customerInfo = await client.restoreRevenueCatPurchases();
        const entitlementId = client.getRevenueCatEntitlementId();
        const next = customerInfoToSubscriptionState(customerInfo, entitlementId);
        set(next);
        if (next.isSubscribed) {
          await persistSubscriptionToStorage(next);
          return { success: true };
        }
        await AsyncStorage.removeItem(KEY);
        return { success: false, error: '有効な購入が見つかりませんでした。' };
      } catch (e) {
        const rc = await import('../revenuecat/client').catch(() => null);
        return { success: false, error: rc?.getRevenueCatErrorMessage(e) ?? '復元に失敗しました。' };
      }
    }

    if (!canUseDevelopmentSubscriptionFallback()) {
      return { success: false, error: 'このビルドではローカル課金シミュレーションを復元できません。' };
    }
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        return { success: false, error: '復元する購入が見つかりませんでした。' };
      }
      const data = JSON.parse(raw);
      const currentPlan = parseCurrentPlan(data);
      const pendingPlan = parsePendingPlan(data);
      const source = parseSource(data) ?? 'debug';
      if (data.lifetime === true) {
        set({ isSubscribed: true, expiresAt: null, isLifetime: true, currentPlan: currentPlan ?? 'lifetime', pendingPlan: null, source });
        return { success: true };
      }
      const expiresAt = data.expires_at ?? null;
      if (!expiresAt || isExpired(expiresAt)) {
        return { success: false, error: '有効な購入が見つかりませんでした。' };
      }
      set({ isSubscribed: true, expiresAt, isLifetime: false, currentPlan: currentPlan ?? 'yearly', pendingPlan, source });
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : '復元に失敗しました';
      return { success: false, error: message };
    }
  },

  isSubscriptionActive: () => {
    const { expiresAt, isLifetime } = get();
    if (isLifetime) return true;
    return !!expiresAt && !isExpired(expiresAt);
  },

  clearForDevelopment: async () => {
    await AsyncStorage.removeItem(KEY);
    set(emptySubscriptionState());
  },

  clearLocalState: async () => {
    await AsyncStorage.removeItem(KEY);
    set(emptySubscriptionState());
  },

  syncWithServer: async (userId: string) => {
    try {
      // onAuthStateChange が bootstrap の subscription.load より先に完了すると、
      // メモリが初期状態のままサーバー結果で AsyncStorage を消す競合が起きるため、同期前に必ずローカルを読み込む。
      await get().load();
      if (isRevenueCatConfigured()) {
        try {
          const client = await import('../revenuecat/client');
          const customerInfo = await client.getRevenueCatCustomerInfo();
          const entitlementId = client.getRevenueCatEntitlementId();
          await applyRevenueCatCustomerInfo(customerInfo, entitlementId, set);
          await syncRevenueCatSubscriptionToSupabase().catch(() => {});
        } catch {
          // RevenueCat 未ロード時はスキップ
        }
      }

      const server = await getServerSubscription(userId);
      const state = get();
      const localActive = state.isLifetime || (!!state.expiresAt && !isExpired(state.expiresAt));

      const serverActive =
        server &&
        (server.lifetime || (!!server.expires_at && !isExpired(server.expires_at)));

      let effective: {
        isSubscribed: boolean;
        expiresAt: string | null;
        isLifetime: boolean;
        currentPlan: SubscriptionPlan | null;
        pendingPlan: SubscriptionPlan | null;
        source: SubscriptionSource | null;
      };

      if (serverActive && state.isLifetime) {
        effective = { ...state };
      } else if (serverActive && !state.isLifetime) {
        const serverBetter =
          server.lifetime ||
          (!!server.expires_at &&
            !!state.expiresAt &&
            new Date(server.expires_at) > new Date(state.expiresAt)) ||
          (!!server.expires_at && !state.expiresAt);
        if (server.lifetime || (serverBetter && server.expires_at)) {
          effective = {
            isSubscribed: true,
            expiresAt: server.expires_at,
            isLifetime: !!server.lifetime,
            currentPlan: server.plan as SubscriptionPlan,
            pendingPlan: null,
            source: 'server',
          };
        } else {
          effective = { ...state };
        }
      } else {
        effective = { ...state };
      }

      if (!serverActive && server) {
        const serverExpired = !server.lifetime && (!server.expires_at || isExpired(server.expires_at));
        if (serverExpired && localActive) effective = { ...state };
      }

      if (serverActive && !localActive) {
        effective = {
          isSubscribed: true,
          expiresAt: server!.expires_at,
          isLifetime: !!server!.lifetime,
          currentPlan: server!.plan as SubscriptionPlan,
          pendingPlan: null,
          source: 'server',
        };
      }

      set(effective);
      if (effective.isSubscribed) {
        await persistSubscriptionToStorage(effective);
      } else {
        await AsyncStorage.removeItem(KEY);
      }
    } catch {
      // ネットワークエラー等は無視（ローカル状態のまま）
    }
  },
}));

async function persistSubscriptionToStorage(state: {
  isSubscribed: boolean;
  expiresAt: string | null;
  isLifetime: boolean;
  currentPlan: SubscriptionPlan | null;
  source: SubscriptionSource | null;
}): Promise<void> {
  if (!state.isSubscribed) return;
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      lifetime: state.isLifetime,
      expires_at: state.expiresAt,
      plan: state.currentPlan ?? (state.isLifetime ? 'lifetime' : 'yearly'),
      source: state.source,
    })
  );
}
