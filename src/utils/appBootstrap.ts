/**
 * 初回起動時に必須データを揃えてから UI を出す（Pro 表示のチラつき・未ロード状態を防ぐ）
 */
import { useAuthStore } from '@/src/store/authStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useFeedbackStore } from '@/src/store/feedbackStore';
import { useWordsStore } from '@/src/store/wordsStore';
import { useGrammarStore } from '@/src/store/grammarStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { setDatabaseSyncHandler, setLocalProgressBumpHandler, getDb, setDatabaseTimezone } from '@/src/db/database';
import { useProgressStore } from '@/src/store/progressStore';
import { requestSupabaseProgressSync } from '@/src/supabase/progressSync';
import { isSupabaseConfigured } from '@/src/supabase/client';
import { getDefaultRoom, fetchMessagesLatest } from '@/src/supabase/chat';
import { setCachedChatMessages } from '@/src/utils/chatMessagesCache';
import { getDeviceTimezone } from '@/src/utils/timezone';
import { logger } from '@/src/utils/logger';
import { getBootstrapStrings } from '@/src/i18n/bootstrap';
import { getContentLocaleFromDisplayLanguage } from '@/src/utils/contentLocale';

const CHAT_PREFETCH_LIMIT = 15;

export const BOOTSTRAP_TIMEOUT_MS = 18_000;

export type BootstrapProgressPayload = {
  /** 0〜1（完了時は 1） */
  ratio: number;
  /** 現在のステップ説明 */
  label: string;
};

export type BootstrapProgressCallback = (p: BootstrapProgressPayload) => void;

/** React Strict Mode（開発）で useEffect が二重実行されてもブートストラップは1回だけ走らせる */
let singletonBootstrapPromise: Promise<void> | null = null;
const bootstrapProgressListeners = new Set<BootstrapProgressCallback>();

function notifyBootstrapProgress(p: BootstrapProgressPayload) {
  bootstrapProgressListeners.forEach((fn) => {
    try {
      fn(p);
    } catch {
      /* noop */
    }
  });
}

/** 進捗コールバックを登録してブートストラップを開始（2回目以降は同じ Promise を共有） */
export function runAppBootstrapOnce(onProgress?: BootstrapProgressCallback): Promise<void> {
  if (onProgress) bootstrapProgressListeners.add(onProgress);
  if (!singletonBootstrapPromise) {
    singletonBootstrapPromise = runAppBootstrap(notifyBootstrapProgress);
  }
  return singletonBootstrapPromise;
}

export function removeAppBootstrapProgressListener(onProgress: BootstrapProgressCallback) {
  bootstrapProgressListeners.delete(onProgress);
}

async function runAppBootstrap(onProgress?: BootstrapProgressCallback): Promise<void> {
  const emit = (ratio: number, label: string) => {
    onProgress?.({ ratio: Math.min(1, Math.max(0, ratio)), label });
  };

  setDatabaseSyncHandler(() => {
    requestSupabaseProgressSync();
  });
  setLocalProgressBumpHandler(() => {
    useProgressStore.getState().bumpAfterLocalDbMutation();
  });

  /** 表示言語はプロフィール（AsyncStorage）確定後にだけ使う。デバイス言語と保存言語が違うと文言が混ざるのを防ぐ */
  await useAuthStore.getState().load();
  await useProfileStore.getState().load().catch(() => {});

  const uiLang = useProfileStore.getState().displayLanguage;
  const bs = getBootstrapStrings(uiLang);
  const contentLocale = getContentLocaleFromDisplayLanguage(useProfileStore.getState().displayLanguage);

  /** 起動中ラベルを保存済み表示言語で出し直す（初回フレームはデバイス言語のため） */
  emit(0.02, bs.starting);
  emit(0.08, bs.preparingDb);
  try {
    getDb();
  } catch (e) {
    logger.warn('[bootstrap] getDb', e);
  }

  emit(0.22, bs.loadingFeedback);
  await useFeedbackStore.getState().load().catch(() => {});

  const words = useWordsStore.getState();
  const grammar = useGrammarStore.getState();
  const contentLoads: Promise<void>[] = [];
  if (!words.wordsLoadedFromSupabase && !words.wordsLoading) {
    contentLoads.push(words.loadWordsFromSupabase(contentLocale));
  }
  if (!grammar.grammarLoaded && !grammar.grammarLoading) {
    contentLoads.push(grammar.loadGrammarFromSupabase(contentLocale));
  }
  if (contentLoads.length > 0) {
    emit(0.38, bs.loadingWordsGrammar);
    await Promise.all(contentLoads);
  }
  emit(0.62, bs.contentReady);

  try {
    emit(0.66, bs.checkingSubscription);
    const rc = await import('@/src/revenuecat/client');
    const session = useAuthStore.getState().session;
    /** 匿名 configure の直後に getCustomerInfo すると未ログイン扱いでキャッシュが壊れやすいので、可能なら最初からユーザー ID で初期化 */
    await rc.configureRevenueCat(session?.user?.id ?? null);
    if (session?.user?.id && rc.syncRevenueCatIdentity) {
      await rc.syncRevenueCatIdentity(session.user.id).catch(() => {});
    }
    const sub = useSubscriptionStore.getState();
    await sub.load().catch(() => {});
    if (session?.user?.id) {
      await sub.syncWithServer(session.user.id).catch(() => {});
    }
  } catch (e) {
    logger.warn('[bootstrap] RevenueCat / subscription', e);
  }

  emit(0.82, bs.preparingChat);
  if (isSupabaseConfigured()) {
    try {
      const room = await getDefaultRoom();
      if (room) {
        const list = await fetchMessagesLatest(room.id, CHAT_PREFETCH_LIMIT);
        await setCachedChatMessages(room.id, list);
      }
    } catch (e) {
      logger.warn('[bootstrap] chat prefetch', e);
    }
  }

  emit(0.9, bs.loadingOnboarding);
  await useOnboardingStore.getState().load().catch(() => {});

  try {
    const tz = useOnboardingStore.getState().userTimezone ?? getDeviceTimezone();
    setDatabaseTimezone(tz);
  } catch (e) {
    logger.warn('[bootstrap] timezone', e);
  }

  emit(1, bs.done);
}
