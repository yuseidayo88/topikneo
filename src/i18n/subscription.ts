/**
 * サブスクリプション画面の文言。表示言語に応じて getSubscriptionStrings(locale) で取得。
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';
import {
  subscriptionZh,
  subscriptionVi,
  subscriptionEs,
  subscriptionId,
  subscriptionTh,
} from './subscriptionLocales';

export type SubscriptionLocale = AppLocale;

const subscriptionJa = {
  title: 'サブスクリプションを管理',
  close: '閉じる',
  proTitle: '全部使える。ずっと続く。',
  proSub: '無料はレッスン1・2のみ。PROで全レッスン・チャット送信・復習・保存が使い放題に。',
  planLabel: 'プラン選択',
  planMonthly: '月額',
  planYearly: '年額',
  planLifetime: '買い切り',
  badgeCasual: '気軽に',
  badgeRecommended: 'おすすめ',
  badgeDeal: 'お買い得',
  durationMonth: '1か月',
  durationYear: '12か月',
  durationLifetime: '永久',
  lumpLabel: '一括購入',
  pricePerMonth: '¥980/月',
  /** 年額を月あたりに割った金額（Store の文字列に /月 を付与。未取得時はフォールバック） */
  yearlyEquivalentPerMonthLine: (rawFromStore: string) => {
    const s = rawFromStore.trim();
    if (!s) return '¥650/月';
    if (/\/月\s*$/.test(s)) return s;
    return `${s}/月`;
  },
  yearlyEquivalentPerMonthFallback: '¥650/月',
  /** App Store の国/地域によるため UI 言語と通貨が一致しない場合がある */
  priceStorefrontCurrencyNote:
    '※表示の通貨は App Store / Google Play のアカウント地域に基づきます（アプリの表示言語とは異なることがあります）。',
  priceOff: '約33%オフ',
  detailYearly: '7日間無料。その後¥7,800/年で自動更新。いつでもキャンセル可能です。',
  detailYearlyNoTrial: '¥7,800/年で自動更新。いつでもキャンセル可能です。',
  detailMonthly: '¥980/月で自動更新されます。いつでもキャンセル可能です。',
  detailLifetime: '一度お支払いいただくと、PRO機能を永久にご利用いただけます。',
  ctaStartTrial: '7日間無料ではじめる',
  ctaPurchase: '今すぐ購入',
  ctaReassure: '無料期間中に解約すれば料金はかかりません',
  restore: '購入を復元',
  skip: '今はしない',
  purchaseSuccess: '購入完了',
  purchaseSuccessMessage: '単語・文法・パズル 全レッスン／チャット送信／復習・保存 無制限が使えるようになりました。',
  purchaseFailed: '購入に失敗しました',
  purchaseRetry: '再試行',
  restoreSuccess: '復元完了',
  restoreSuccessMessage: '購入が復元されました。',
  restoreFailed: '復元できませんでした',
  loading: '処理中…',
  alreadyActive: 'すでにご利用中です',
  back: '戻る',
  startLearning: '学習を始める',
  downgradeScheduledTitle: '切り替えを予約しました',
  downgradeScheduledMessage: '現在の年額期間が終了した時点で、月額プランに切り替わります。',
  pendingSwitchNotice: '現在の年額期間が終了した時点で月額に切り替わります。',
  offlinePurchase: 'オフラインのため購入できません。接続を確認してください。',
  offlineRestore: 'オフラインのため復元できません。接続を確認してください。',
  feature1Title: '単語・文法・パズル 全レッスン',
  feature1Sub: '全レベル・全コース利用可能',
  feature2Title: 'チャット送信',
  feature2Sub: 'メッセージを送って会話に参加',
  feature3Title: '学習曲線に基づいた復習機能 無制限',
  feature3Sub: '間隔反復で効率的に定着',
  feature4Title: '単語保存機能 無制限',
  feature4Sub: 'お気に入りを好きなだけ保存',
  currentPlanPrefix: '現在のプラン: ',
  privacyPolicy: 'プライバシーポリシー',
  termsOfUse: '利用規約',
  openPrivacyA11y: 'プライバシーポリシーを開く',
  openTermsA11y: 'サービス利用規約を開く',
  appleStandardEula: 'Apple 利用規約（EULA）',
  openAppleEulaA11y: 'Apple 標準の利用規約（EULA）を開く',
  errorBoundaryContext: 'サブスクリプション',
  yearlyDiscountApprox: (pct: number) => `約${pct}%オフ`,
  proBenefitsListA11y: 'PROの特典',
  planMonthlyA11y: (mainPrice: string) =>
    `月額プラン、気軽に、${mainPrice}、タップで選択`,
  planYearlyA11y: (mainPrice: string, perMonthLine: string) =>
    `年額プラン、7日間無料、${mainPrice}、おすすめ、${perMonthLine}、タップで選択`,
  planLifetimeA11y: (mainPrice: string) => `買い切り、${mainPrice}、永久、タップで選択`,
  legalUnavailableTitle: 'まだ公開されていません',
  legalPrivacyMissingBody: 'プライバシーポリシーのURLがまだ設定されていません。',
  legalTermsMissingBody: '利用規約のURLがまだ設定されていません。',
  legalAppleEulaMissingBody: 'Apple の利用規約ページを開けませんでした。',
  purchaseExpoGoUnavailableBody: 'Expo Go では購入できません。Development Build か TestFlight を使ってください。',
  purchaseRcNotConfiguredBody: 'このビルドでは RevenueCat の設定がまだ完了していません。',
  purchasePlanUnavailableBody: '選択したプランは現在利用できません。',
  purchaseErrorGenericFallback: 'しばらく経ってからお試しください。',
  offeringErrorHint:
    '\n\nTestFlight の場合: EAS の production 環境変数に EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY を入れたうえでビルドし直し、そのビルドを TestFlight に提出してください。RevenueCat の API keys（iOS 用 Public Key）と Apps & providers（Bundle ID が com.kla.app）も確認してください。',
  restoreExpoGoUnavailableBody: 'Expo Go では復元できません。Development Build か TestFlight を使ってください。',
  restoreRcNotConfiguredBody: 'このビルドでは復元設定がまだ完了していません。',
  restoreNoPurchaseBody: '有効な購入が見つかりません。',
  changePlanCta: 'プランを変更',
} as const;

const subscriptionEn = {
  title: 'Manage Subscription',
  close: 'Close',
  proTitle: 'Unlock everything. Keep going.',
  proSub: 'Free includes lessons 1–2 only. With PRO, all lessons, chat, review, and save are unlimited.',
  planLabel: 'Choose a plan',
  planMonthly: 'Monthly',
  planYearly: 'Yearly',
  planLifetime: 'Lifetime',
  badgeCasual: 'Casual',
  badgeRecommended: 'Recommended',
  badgeDeal: 'Best value',
  durationMonth: '1 month',
  durationYear: '12 months',
  durationLifetime: 'Lifetime',
  lumpLabel: 'One-time purchase',
  pricePerMonth: '¥980/mo',
  yearlyEquivalentPerMonthLine: (rawFromStore: string) => {
    const s = rawFromStore.trim();
    if (!s) return '$4.16/mo';
    if (/\/(mo|month)\b/i.test(s)) return s;
    return `${s}/mo`;
  },
  yearlyEquivalentPerMonthFallback: '$4.16/mo',
  priceStorefrontCurrencyNote:
    'Prices are in your App Store or Google Play account region’s currency and may not match the app language.',
  priceOff: '~33% off',
  detailYearly: '7-day free trial. Then ¥7,800/year, auto-renewal. Cancel anytime.',
  detailYearlyNoTrial: '¥7,800/year, auto-renewal. Cancel anytime.',
  detailMonthly: '¥980/month, auto-renewal. Cancel anytime.',
  detailLifetime: 'One-time payment for permanent PRO access.',
  ctaStartTrial: 'Start 7-day free trial',
  ctaPurchase: 'Subscribe now',
  ctaReassure: 'No charge if you cancel during the free trial.',
  restore: 'Restore purchases',
  skip: 'Not now',
  purchaseSuccess: 'Success',
  purchaseSuccessMessage: 'You now have unlimited access to all lessons, chat, review, and save.',
  purchaseFailed: 'Purchase failed',
  purchaseRetry: 'Retry',
  restoreSuccess: 'Restored',
  restoreSuccessMessage: 'Your purchase has been restored.',
  restoreFailed: 'Restore failed',
  loading: 'Processing…',
  alreadyActive: "You're already subscribed",
  back: 'Back',
  startLearning: 'Start learning',
  downgradeScheduledTitle: 'Switch scheduled',
  downgradeScheduledMessage: 'Your plan will switch to monthly when your current yearly period ends.',
  pendingSwitchNotice: 'Will switch to monthly when your current yearly period ends.',
  offlinePurchase: "You're offline. Check your connection to purchase.",
  offlineRestore: "You're offline. Check your connection to restore purchases.",
  feature1Title: 'All vocabulary, grammar & puzzle lessons',
  feature1Sub: 'Every level and course',
  feature2Title: 'Chat messages',
  feature2Sub: 'Send messages and join the conversation',
  feature3Title: 'Unlimited spaced-repetition review',
  feature3Sub: 'Efficient retention with spaced repetition',
  feature4Title: 'Unlimited saved words',
  feature4Sub: 'Save as many favorites as you like',
  currentPlanPrefix: 'Current plan: ',
  privacyPolicy: 'Privacy policy',
  termsOfUse: 'Terms of use',
  openPrivacyA11y: 'Open privacy policy',
  openTermsA11y: 'Open terms of use (service)',
  appleStandardEula: 'Apple Standard EULA',
  openAppleEulaA11y: 'Open Apple standard end user license agreement',
  errorBoundaryContext: 'Subscription',
  yearlyDiscountApprox: (pct: number) => `~${pct}% off`,
  proBenefitsListA11y: 'PRO benefits',
  planMonthlyA11y: (mainPrice: string) =>
    `Monthly plan, casual, ${mainPrice}, tap to select`,
  planYearlyA11y: (mainPrice: string, perMonthLine: string) =>
    `Yearly plan, 7-day free trial, ${mainPrice}, recommended, ${perMonthLine}, tap to select`,
  planLifetimeA11y: (mainPrice: string) => `Lifetime, ${mainPrice}, one-time purchase, tap to select`,
  legalUnavailableTitle: 'Unavailable',
  legalPrivacyMissingBody: 'The privacy policy URL is not configured yet.',
  legalTermsMissingBody: 'The terms of service URL is not configured yet.',
  legalAppleEulaMissingBody: 'Could not open the Apple license page.',
  purchaseExpoGoUnavailableBody:
    'Purchases are not available in Expo Go. Please use a development build or TestFlight.',
  purchaseRcNotConfiguredBody: 'RevenueCat is not configured for this build yet.',
  purchasePlanUnavailableBody: 'The selected plan is currently unavailable.',
  purchaseErrorGenericFallback: 'Please try again later.',
  offeringErrorHint:
    '\n\nTestFlight: Rebuild the app after setting EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY in EAS (production). Then submit the new build. Also check RevenueCat → API keys (iOS Public Key) and Apps & providers (Bundle ID com.kla.app).',
  restoreExpoGoUnavailableBody:
    'Restore is not available in Expo Go. Please use a development build or TestFlight.',
  restoreRcNotConfiguredBody: 'Restore is not configured for this build yet.',
  restoreNoPurchaseBody: 'No valid purchase found.',
  changePlanCta: 'Change Plan',
} as const;

export type SubscriptionStrings = typeof subscriptionEn;

const subscriptionMaps: Record<AppLocale, SubscriptionStrings> = {
  ja: subscriptionJa as unknown as SubscriptionStrings,
  en: subscriptionEn,
  zh: subscriptionZh as unknown as SubscriptionStrings,
  vi: subscriptionVi as unknown as SubscriptionStrings,
  es: subscriptionEs as unknown as SubscriptionStrings,
  id: subscriptionId as unknown as SubscriptionStrings,
  th: subscriptionTh as unknown as SubscriptionStrings,
};

export function getSubscriptionStrings(locale: SubscriptionLocale = 'ja') {
  return subscriptionMaps[locale] ?? subscriptionMaps[FALLBACK_APP_LOCALE];
}
