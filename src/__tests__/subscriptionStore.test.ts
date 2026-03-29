/**
 * subscriptionStore の単体テスト。AsyncStorage と Supabase サブスク API をモックする。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionStore, type PurchaseResult } from '../store/subscriptionStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../supabase/subscription', () => ({
  getServerSubscription: jest.fn().mockResolvedValue(null),
  syncRevenueCatSubscriptionToSupabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../revenuecat/config', () => ({
  isRevenueCatConfigured: jest.fn(() => false),
}));

jest.mock('../revenuecat/client', () => ({
  getRevenueCatCustomerInfo: jest.fn().mockResolvedValue(null),
  getRevenueCatEntitlementId: jest.fn(() => 'TOPIK NEO Pro'),
  getRevenueCatErrorMessage: jest.fn(() => '購入に失敗しました。'),
  isRevenueCatPurchaseCancelled: jest.fn(() => false),
  purchaseRevenueCatPlan: jest.fn(),
  restoreRevenueCatPurchases: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useSubscriptionStore.setState({ isSubscribed: false, expiresAt: null, isLifetime: false, currentPlan: null, pendingPlan: null, source: null });
});

describe('subscriptionStore', () => {
  it('初期状態が期待どおり', () => {
    const state = useSubscriptionStore.getState();
    expect(state.isSubscribed).toBe(false);
    expect(state.expiresAt).toBeNull();
    expect(state.isLifetime).toBe(false);
  });

  it('load でストレージが空なら isSubscribed false / expiresAt null', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await useSubscriptionStore.getState().load();
    const state = useSubscriptionStore.getState();
    expect(state.isSubscribed).toBe(false);
    expect(state.expiresAt).toBeNull();
  });

  it('load で有効な expires_at があれば isSubscribed true', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ expires_at: future.toISOString() })
    );
    await useSubscriptionStore.getState().load();
    const state = useSubscriptionStore.getState();
    expect(state.isSubscribed).toBe(true);
    expect(state.expiresAt).toBe(future.toISOString());
  });

  it('purchase monthly で isSubscribed true になり expiresAt が未来', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    const res = await useSubscriptionStore.getState().purchase('monthly');
    expect(res.success).toBe(true);
    expect(res.source).toBe('debug');
    const state = useSubscriptionStore.getState();
    expect(state.isSubscribed).toBe(true);
    expect(state.expiresAt).toBeDefined();
    expect(state.source).toBe('debug');
    expect(new Date(state.expiresAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it('purchase yearly で expiresAt が約1年後', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await useSubscriptionStore.getState().purchase('yearly');
    const state = useSubscriptionStore.getState();
    const exp = new Date(state.expiresAt!);
    const now = new Date();
    expect(exp.getFullYear()).toBe(now.getFullYear() + 1);
  });

  it('restore でストレージに有効なデータがあれば success true', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ expires_at: future.toISOString(), source: 'debug' })
    );
    const res = await useSubscriptionStore.getState().restore();
    expect(res.success).toBe(true);
    expect(useSubscriptionStore.getState().isSubscribed).toBe(true);
    expect(useSubscriptionStore.getState().source).toBe('debug');
  });

  it('restore でストレージが空なら success false と error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const res = await useSubscriptionStore.getState().restore();
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('purchase lifetime で isSubscribed true / expiresAt null / isLifetime true', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    const res = await useSubscriptionStore.getState().purchase('lifetime');
    expect(res.success).toBe(true);
    expect(res.source).toBe('debug');
    const state = useSubscriptionStore.getState();
    expect(state.isSubscribed).toBe(true);
    expect(state.expiresAt).toBeNull();
    expect(state.isLifetime).toBe(true);
    expect(state.source).toBe('debug');
  });

  it('restore で lifetime データがあれば success true', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ lifetime: true, source: 'debug' }));
    const res = await useSubscriptionStore.getState().restore();
    expect(res.success).toBe(true);
    expect(useSubscriptionStore.getState().isSubscribed).toBe(true);
    expect(useSubscriptionStore.getState().isLifetime).toBe(true);
    expect(useSubscriptionStore.getState().source).toBe('debug');
  });

  it('isSubscriptionActive は expiresAt が未来なら true', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    useSubscriptionStore.setState({ expiresAt: future.toISOString(), isLifetime: false });
    expect(useSubscriptionStore.getState().isSubscriptionActive()).toBe(true);
  });

  it('isSubscriptionActive は isLifetime なら true', () => {
    useSubscriptionStore.setState({ expiresAt: null, isLifetime: true });
    expect(useSubscriptionStore.getState().isSubscriptionActive()).toBe(true);
  });

  it('isSubscriptionActive は expiresAt が過去なら false', () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    useSubscriptionStore.setState({ isSubscribed: true, expiresAt: past.toISOString(), isLifetime: false });
    expect(useSubscriptionStore.getState().isSubscriptionActive()).toBe(false);
  });

  it('clearForDevelopment で isSubscribed false / expiresAt null / pendingPlan null', async () => {
    useSubscriptionStore.setState({ isSubscribed: true, expiresAt: new Date().toISOString(), isLifetime: false, currentPlan: 'yearly', pendingPlan: 'monthly', source: 'debug' });
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    await useSubscriptionStore.getState().clearForDevelopment();
    const state = useSubscriptionStore.getState();
    expect(state.isSubscribed).toBe(false);
    expect(state.expiresAt).toBeNull();
    expect(state.isLifetime).toBe(false);
    expect(state.pendingPlan).toBeNull();
    expect(state.source).toBeNull();
  });

  it('年額契約中に purchase(monthly) すると downgradeScheduled で期間はそのまま', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const expiresAt = future.toISOString();
    useSubscriptionStore.setState({
      isSubscribed: true,
      expiresAt,
      isLifetime: false,
      currentPlan: 'yearly',
    });
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    const res = await useSubscriptionStore.getState().purchase('monthly');
    expect(res.success).toBe(true);
    expect((res as PurchaseResult).downgradeScheduled).toBe(true);
    const state = useSubscriptionStore.getState();
    expect(state.currentPlan).toBe('yearly');
    expect(state.expiresAt).toBe(expiresAt);
    expect(state.pendingPlan).toBe('monthly');
  });
});
