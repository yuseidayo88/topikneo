import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type MakePurchaseResult,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
} from 'react-native-purchases';
import type { SubscriptionPlan } from '../store/subscriptionStore';
import { logger } from '../utils/logger';

const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim();
const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim();

export const REVENUECAT_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || 'TOPIK NEO Pro';
export const REVENUECAT_OFFERING_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID?.trim() || 'default';

const PLAN_PRODUCT_IDS: Record<SubscriptionPlan, string> = {
  monthly: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_MONTHLY?.trim() || 'monthly',
  yearly: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_YEARLY?.trim() || 'yearly',
  lifetime: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_LIFETIME?.trim() || 'lifetime',
};

function getRevenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') return iosApiKey ?? null;
  if (Platform.OS === 'android') return androidApiKey ?? null;
  return null;
}

export function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

let configured = false;
let currentAppUserId: string | null = null;

export function isRevenueCatConfigured(): boolean {
  if (isRunningInExpoGo()) return false;
  return Boolean(getRevenueCatApiKey());
}

export function getRevenueCatEntitlementId(): string {
  return REVENUECAT_ENTITLEMENT_ID;
}

export async function configureRevenueCat(appUserId: string | null = null): Promise<boolean> {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return false;
  if (isRunningInExpoGo()) {
    if (__DEV__) {
      logger.warn('[RevenueCat] Expo Go では本番用 RevenueCat キーを利用できません。Development Build または TestFlight を使用してください。');
    }
    return false;
  }
  if (configured) return true;

  try {
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => {});
    }

    Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined,
    });

    configured = true;
    currentAppUserId = appUserId;
    return true;
  } catch (error) {
    logger.warn('[RevenueCat] configure failed', error);
    configured = false;
    currentAppUserId = null;
    return false;
  }
}

export async function syncRevenueCatIdentity(appUserId: string | null): Promise<CustomerInfo | null> {
  const ready = await configureRevenueCat(currentAppUserId);
  if (!ready) return null;

  try {
    if (appUserId) {
      if (currentAppUserId === appUserId) {
        return await Purchases.getCustomerInfo();
      }
      const result = await Purchases.logIn(appUserId);
      currentAppUserId = appUserId;
      return result.customerInfo;
    }

    if (currentAppUserId === null) {
      return await Purchases.getCustomerInfo();
    }

    const customerInfo = await Purchases.logOut();
    currentAppUserId = null;
    return customerInfo;
  } catch (error) {
    logger.warn('[RevenueCat] identity sync failed', error);
    return null;
  }
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo | null> {
  const ready = await configureRevenueCat(currentAppUserId);
  if (!ready) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    logger.warn('[RevenueCat] getCustomerInfo failed', error);
    return null;
  }
}

/** RevenueCat のパッケージ識別子（Offering の monthly / annual / lifetime に対応） */
const RC_PACKAGE_IDS: Record<SubscriptionPlan, string> = {
  monthly: '$rc_monthly',
  yearly: '$rc_annual',
  lifetime: '$rc_lifetime',
};

function pickOfferingFromResponse(offerings: { all?: Record<string, PurchasesOffering>; current?: PurchasesOffering | null }): PurchasesOffering | null {
  const all = offerings.all ?? {};
  const keys = Object.keys(all);
  const byId = all[REVENUECAT_OFFERING_ID] ?? null;
  const keyInsensitive = keys.find((k) => k.toLowerCase() === REVENUECAT_OFFERING_ID.toLowerCase());
  const byIdInsensitive = keyInsensitive ? all[keyInsensitive] : null;
  const current = offerings.current ?? null;
  const onlyOne = keys.length === 1 ? all[keys[0]!] : null;
  return byId ?? byIdInsensitive ?? current ?? onlyOne;
}

export async function getRevenueCatOffering(): Promise<PurchasesOffering | null> {
  const ready = await configureRevenueCat(currentAppUserId);
  if (!ready) {
    if (__DEV__) {
      logger.warn(
        '[RevenueCat] getOfferings skipped: SDK not ready. Use a Development Build (not Expo Go) and set EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY.'
      );
    }
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const chosen = pickOfferingFromResponse(offerings);
    if (__DEV__ && !chosen) {
      const keys = Object.keys(offerings.all ?? {});
      logger.warn(
        `[RevenueCat] No offering found. Requested id="${REVENUECAT_OFFERING_ID}", current=${Boolean(offerings.current)}, available=[${keys.join(', ')}]. Set "default" as current in RevenueCat Dashboard.`
      );
    }
    return chosen;
  } catch (error) {
    logger.warn('[RevenueCat] getOfferings failed', error);
    return null;
  }
}

export function getRevenueCatPackageForPlan(
  offering: PurchasesOffering | null,
  plan: SubscriptionPlan
): PurchasesPackage | null {
  if (!offering) return null;

  const wantProductId = PLAN_PRODUCT_IDS[plan];
  const byProductId =
    offering.availablePackages.find((pkg) => pkg.product.identifier === wantProductId) ?? null;
  if (byProductId) return byProductId;

  const rcPackageId = RC_PACKAGE_IDS[plan];
  const byRcId =
    offering.availablePackages.find((pkg) => pkg.identifier === rcPackageId) ?? null;
  if (byRcId) return byRcId;

  if (plan === 'monthly') return offering.monthly ?? null;
  if (plan === 'yearly') return offering.annual ?? null;
  return offering.lifetime ?? null;
}

export async function purchaseRevenueCatPlan(plan: SubscriptionPlan): Promise<MakePurchaseResult> {
  const ready = await configureRevenueCat(currentAppUserId);
  if (!ready) {
    throw new Error(
      'RevenueCat が初期化できませんでした。Expo Go では使えません。TestFlight の場合は EAS の production に EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY（appl_ で始まる Public Key）を設定し、その後にビルドし直して提出してください。'
    );
  }

  let offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>;
  try {
    offerings = await Purchases.getOfferings();
  } catch (error) {
    throw new Error(
      `RevenueCat との通信に失敗しました: ${getRevenueCatErrorMessage(error)}。通信環境を確認してください。`
    );
  }

  const offering = pickOfferingFromResponse(offerings);
  if (!offering) {
    const keys = Object.keys(offerings.all ?? {});
    throw new Error(
      `Offering が取得できませんでした（RevenueCat が返した Offering ID: [${keys.length ? keys.join(', ') : 'なし'}]）。RevenueCat の Apps & providers で Bundle ID が com.kla.app と一致しているか、API Key がこのプロジェクトの iOS 用 Public Key か確認してください。`
    );
  }

  const pkg = getRevenueCatPackageForPlan(offering, plan);
  if (!pkg) {
    if (__DEV__) {
      const productIds = offering.availablePackages.map(
        (p) => `${p.identifier}:${p.product.identifier}`
      );
      logger.warn(
        `[RevenueCat] No package for plan "${plan}". Expected product id="${PLAN_PRODUCT_IDS[plan]}". Available: [${productIds.join(', ')}]`
      );
    }
    throw new Error(
      `選択したプランが RevenueCat に設定されていません。Dashboard の Offering「default」で monthly / yearly / lifetime が紐付いているか確認してください。`
    );
  }

  return Purchases.purchasePackage(pkg);
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  const ready = await configureRevenueCat(currentAppUserId);
  if (!ready) {
    throw new Error('RevenueCat が未設定です。');
  }
  return Purchases.restorePurchases();
}

export function addRevenueCatCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): void {
  if (!isRevenueCatConfigured()) return;
  Purchases.addCustomerInfoUpdateListener(listener);
}

export function removeRevenueCatCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): boolean {
  if (!isRevenueCatConfigured()) return false;
  return Purchases.removeCustomerInfoUpdateListener(listener);
}

export function isRevenueCatPurchaseCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PurchasesError).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export function getRevenueCatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '購入に失敗しました。');
  }
  return '購入に失敗しました。';
}
