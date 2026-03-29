import Constants from 'expo-constants';
import type { SubscriptionPlan } from '../store/subscriptionStore';

type PublicIapEnv = {
  EXPO_PUBLIC_IAP_PRODUCT_ID_MONTHLY?: string;
  EXPO_PUBLIC_IAP_PRODUCT_ID_YEARLY?: string;
  EXPO_PUBLIC_IAP_PRODUCT_ID_LIFETIME?: string;
};

const env: PublicIapEnv = typeof process !== 'undefined' ? (process.env as PublicIapEnv) : {};

/** Expo Go で動作している場合 true。Expo Go では expo-iap のネイティブモジュールが存在しないため useIAP を呼ばないこと。 */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function canUseSimulatedIAPFallback(): boolean {
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  return process.env.NODE_ENV === 'test';
}

export const IAP_PRODUCT_IDS: Record<SubscriptionPlan, string | undefined> = {
  monthly: env.EXPO_PUBLIC_IAP_PRODUCT_ID_MONTHLY,
  yearly: env.EXPO_PUBLIC_IAP_PRODUCT_ID_YEARLY,
  lifetime: env.EXPO_PUBLIC_IAP_PRODUCT_ID_LIFETIME,
};

/** 本番で IAP を使うか（product ID が1つ以上設定され、__DEV__ でない場合） */
export function isIAPEnabled(): boolean {
  if (canUseSimulatedIAPFallback()) return false;
  const hasAny = Object.values(IAP_PRODUCT_IDS).some(Boolean);
  return hasAny;
}

/** プランに対応する product ID。未設定の場合は undefined */
export function getProductIdForPlan(plan: SubscriptionPlan): string | undefined {
  return IAP_PRODUCT_IDS[plan];
}

/** product ID からプランに逆引き（設定と一致するもの） */
export function getPlanFromProductId(productId: string): SubscriptionPlan | null {
  if (IAP_PRODUCT_IDS.monthly === productId) return 'monthly';
  if (IAP_PRODUCT_IDS.yearly === productId) return 'yearly';
  if (IAP_PRODUCT_IDS.lifetime === productId) return 'lifetime';
  return null;
}

/** useIAP に渡す SKU 一覧（設定されているもののみ） */
export function getIAPSkus(): string[] {
  return Object.values(IAP_PRODUCT_IDS).filter((id): id is string => !!id);
}

export function isIAPPlanConfigured(plan: SubscriptionPlan): boolean {
  return !!getProductIdForPlan(plan);
}
