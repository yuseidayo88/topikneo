import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '../supabase/auth';
import { isSupabaseConfigured } from '../supabase/client';
import { useSubscriptionStore } from './subscriptionStore';
import { resetToLocalProgressMode, initializeSupabaseProgressSync } from '../supabase/progressSync';
import { useProgressStore } from './progressStore';

type AuthStore = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  /** 認証取得失敗時のメッセージ（未設定時は null） */
  loadError: string | null;
  load: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  loadError: null,

  load: async () => {
    if (!isSupabaseConfigured()) {
      resetToLocalProgressMode();
      useProgressStore.getState().refresh();
      set({ user: null, session: null, isLoading: false, loadError: null });
      return;
    }
    set({ isLoading: true, loadError: null });
    try {
      const session = await getSession();
      // RevenueCat は起動時にここでは触らない（_layout の遅延処理で同期。ログイン時は onAuthStateChange で同期）
      if (session?.user?.id) {
        await initializeSupabaseProgressSync(session.user.id);
      } else {
        resetToLocalProgressMode();
      }
      useProgressStore.getState().refresh();
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        loadError: null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : '認証の読み込みに失敗しました';
      set({ user: null, session: null, isLoading: false, loadError: message });
    }
  },
}));

export function subscribeAuthStore() {
  if (!isSupabaseConfigured()) return () => {};
  return onAuthStateChange((_, session) => {
    void import('../revenuecat/client').then((m) => m.syncRevenueCatIdentity(session?.user?.id ?? null)).catch(() => {});
    useAuthStore.setState({
      session,
      user: session?.user ?? null,
    });
    if (session?.user?.id) {
      void initializeSupabaseProgressSync(session.user.id)
        .then(() => {
          useProgressStore.getState().refresh();
          return useSubscriptionStore.getState().syncWithServer(session.user.id);
        })
        .catch(() => {});
      return;
    }
    resetToLocalProgressMode();
    useProgressStore.getState().refresh();
  });
}
