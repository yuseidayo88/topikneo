import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { useSubscriptionStore, type SubscriptionPlan } from '@/src/store/subscriptionStore';
import { useAuthStore } from '@/src/store/authStore';
import { useProfileStore } from '@/src/store/profileStore';
import { getSubscriptionStrings } from '@/src/i18n/subscription';
import { getCommonStrings } from '@/src/i18n/common';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, RADIUS, PAD, GAP } from '@/src/theme/settingsFlowTokens';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';
import * as WebBrowser from 'expo-web-browser';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { APPLE_STANDARD_EULA_URL, PRIVACY_POLICY_URL, TERMS_URL } from '@/src/constants/legal';
import { isRevenueCatConfigured, isRunningInExpoGo } from '@/src/revenuecat/config';
import { triggerLightImpact } from '@/src/utils/haptics';
import { useNetInfo } from '@/src/hooks/useNetInfo';

const PAD_M = 16;
const GAP_M = 10;

import { logEvent } from '@/src/analytics';
import { logger } from '@/src/utils/logger';

function trackSubscriptionView() {
  logEvent('subscription_view');
}

function trackPlanSelect(plan: SubscriptionPlan) {
  logEvent('subscription_plan_select', { plan });
}

function trackPurchaseTap(plan: SubscriptionPlan) {
  logEvent('subscription_purchase_tap', { plan });
}

function trackRestoreTap() {
  logEvent('subscription_restore_tap');
}

type RevenueCatStoreProduct = {
  price?: number;
  priceString?: string;
  pricePerMonth?: number;
  pricePerMonthString?: string;
  introPrice?: {
    price?: number | string | null;
    priceAmountMicros?: number | string | null;
    paymentMode?: string | number | null;
    payment_mode?: string | number | null;
  } | null;
  introductoryPrice?: {
    price?: number | string | null;
    priceAmountMicros?: number | string | null;
    paymentMode?: string | number | null;
    payment_mode?: string | number | null;
  } | null;
};

function hasFreeTrial(product: RevenueCatStoreProduct | null | undefined): boolean {
  // react-native-purchases / RevenueCat の StoreProduct はプラットフォームによりフィールドが異なるため、
  // 「無料トライアル」と断定できる強いシグナルのみ拾う（表示の不整合＝審査指摘を避ける）
  const intro = product?.introPrice ?? product?.introductoryPrice ?? null;
  const price = intro?.price ?? intro?.priceAmountMicros ?? null;
  const paymentMode = intro?.paymentMode ?? intro?.payment_mode ?? null;
  const hasTrialFlag =
    paymentMode === 'FREE_TRIAL' ||
    paymentMode === 'free_trial' ||
    paymentMode === 2;
  const isZeroPrice = price === 0 || price === '0';
  return Boolean(hasTrialFlag || isZeroPrice);
}

function SubscriptionContent() {
  const router = useRouter();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const { resolvedMode } = useTheme();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const contentW = useContentColumnWidth(PAD);
  const [loading, setLoading] = useState(false);
  const [livePrices, setLivePrices] = useState<Partial<Record<SubscriptionPlan, string>>>({});
  const [liveMonthlyEquivalents, setLiveMonthlyEquivalents] = useState<Partial<Record<SubscriptionPlan, string>>>({});
  /** 年額に「無料トライアル」が実際に設定されている場合のみ true（表示の不整合を避ける） */
  const [yearlyHasFreeTrial, setYearlyHasFreeTrial] = useState(false);
  const [yearlyBadge, setYearlyBadge] = useState<string | null>(null);

  /** モーダル: タイトル・閉じる周辺の窮屈さを避けるため余白を少し戻す */
  const headerTop = Math.max(10, headerPaddingTop - 48);
  const { flowShadow: SHADOW } = useThemeStyles();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const heroGradient = useMemo<[string, string]>(
    () =>
      resolvedMode === 'dark'
        ? ['#1a2744', '#2d1f4e']
        : ['#DBEAFE', '#C7D2FE'],
    [resolvedMode]
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        headerFixed: { paddingHorizontal: PAD, alignItems: 'center', backgroundColor: 'transparent' },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 10,
        },
        headerCircleBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: TOKEN.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        headerTitle: { ...typographyScale.header, color: TOKEN.ink, letterSpacing: -0.3 },
        headerRight: { width: 40 },
        scrollArea: { flex: 1 },
        scrollContent: { paddingHorizontal: PAD_M, paddingTop: 0, paddingBottom: 40 },
        wrap: { width: '100%', maxWidth: contentW, alignSelf: 'center', gap: GAP_M },
        /* PRO 価値訴求カード（ヒーロー＋特典を1枚に統合） */
        proValueCard: {
          borderRadius: RADIUS.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(30,64,175,0.35)',
          ...SHADOW,
        },
        proValueHeader: { paddingHorizontal: PAD_M, paddingTop: PAD_M, paddingBottom: 4 },
        proValueBadge: {
          alignSelf: 'flex-start',
          backgroundColor: TOKEN.accent,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: RADIUS.pill,
          marginBottom: 10,
        },
        proValueBadgeText: { ...typographyScale.caption, fontWeight: '700', color: '#FFF', letterSpacing: 0.8 },
        proValueTitle: { ...typographyScale.bodyMedium, fontWeight: '700', color: TOKEN.ink, marginBottom: 4, lineHeight: 22 },
        proValueSub: { ...typographyScale.caption, color: TOKEN.inkMuted, lineHeight: 16, marginBottom: 12 },
        proValueList: { paddingHorizontal: PAD_M - 4, paddingBottom: PAD_M },
        proValueListItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 4,
          gap: 12,
          borderTopWidth: 1,
          borderTopColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        proValueListItemFirst: { borderTopWidth: 0 },
        proValueIconWrap: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(30,64,175,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        proValueTextWrap: { flex: 1, minWidth: 0 },
        proValueItemTitle: { ...typographyScale.bodyMedium, fontWeight: '600', color: TOKEN.ink, marginBottom: 2 },
        proValueItemSub: { ...typographyScale.caption, fontSize: 12, color: TOKEN.inkMuted, lineHeight: 16 },
        planLabel: {
          ...typographyScale.section,
          color: TOKEN.ink,
          marginBottom: 6,
        },
        planStorefrontNote: {
          ...typographyScale.caption,
          fontSize: 10,
          lineHeight: 15,
          color: TOKEN.inkMuted,
          marginBottom: 10,
          paddingHorizontal: 2,
        },
        planRow: { flexDirection: 'row', gap: 6 },
        planCardSelected: { borderWidth: 2, borderColor: TOKEN.accent },
        /* 3プラン共通カード（横並び） */
        planCard: {
          flex: 1,
          minWidth: 0,
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          padding: 10,
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        planCardPressed: { opacity: 0.96 },
        planBadge: {
          alignSelf: 'flex-start',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: RADIUS.pill,
          marginBottom: 6,
        },
        planBadgePopular: { backgroundColor: TOKEN.accent },
        planBadgeBargain: { backgroundColor: TOKEN.grammar },
        planBadgeMonthly: { backgroundColor: TOKEN.inkMuted },
        planBadgeText: { ...typographyScale.caption, fontWeight: '700', color: '#FFF', fontSize: 10 },
        planDuration: { ...typographyScale.bodySmall, fontWeight: '700', color: TOKEN.ink, marginBottom: 4 },
        planPrice: { ...typographyScale.score, color: TOKEN.ink, letterSpacing: -0.5, marginBottom: 2 },
        planPriceSub: { ...typographyScale.caption, color: TOKEN.inkMuted, fontSize: 11 },
        planPriceOff: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.accent, fontSize: 11, marginBottom: 2 },
        planLumpLabel: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.accent, fontSize: 10, marginBottom: 2 },
        planDetailText: {
          ...typographyScale.bodySmall,
          color: TOKEN.inkMuted,
          lineHeight: 18,
          marginTop: 10,
          paddingHorizontal: 4,
        },
        purchaseButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: TOKEN.accent,
          paddingVertical: 14,
          borderRadius: RADIUS.button,
          marginTop: 16,
          shadowColor: TOKEN.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        },
        purchaseButtonText: { ...typographyScale.button, color: '#FFF', fontWeight: '700' },
        trialCard: {
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          padding: PAD_M,
          borderWidth: 2,
          borderColor: TOKEN.accent,
          ...SHADOW,
        },
        trialBadge: {
          alignSelf: 'flex-start',
          backgroundColor: TOKEN.grammar ?? TOKEN.accent,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: RADIUS.pill,
          marginBottom: 10,
        },
        trialBadgeText: { ...typographyScale.caption, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
        trialTitle: { ...typographyScale.section, color: TOKEN.ink, marginBottom: 6, lineHeight: 22 },
        trialBody: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, lineHeight: 20, marginBottom: 14 },
        trialButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: TOKEN.accent,
          paddingVertical: 14,
          borderRadius: RADIUS.button,
          shadowColor: TOKEN.accent,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 4,
        },
        trialButtonText: { ...typographyScale.button, color: '#FFF', fontWeight: '700' },
        footerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginTop: 8,
        },
        loader: { marginVertical: 8 },
        loadingOverlay: {
          marginTop: 16,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 20,
          gap: 12,
        },
        loadingOverlayText: { ...typographyScale.button, color: TOKEN.inkMuted },
        linkBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
        },
        linkBtnText: { ...typographyScale.button, color: TOKEN.accent },
        skipBtn: { alignItems: 'center', paddingVertical: 10 },
        skipBtnText: { ...typographyScale.body, color: TOKEN.inkMuted },
        legalRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 4,
          marginTop: 12,
          paddingHorizontal: 4,
        },
        legalLink: { paddingVertical: 4, paddingHorizontal: 4 },
        legalLinkText: { ...typographyScale.caption, color: TOKEN.accent },
        legalSeparator: { ...typographyScale.caption, color: TOKEN.inkFaint },
        activeScrollContent: {
          paddingHorizontal: PAD,
          flexGrow: 1,
          alignItems: 'center',
        },
        activeContentWrap: {
          flex: 1,
          width: '100%',
          alignItems: 'center',
          paddingHorizontal: PAD,
        },
        activeCardOuter: {
          width: '100%',
          maxWidth: contentW,
        },
        activeCard: {
          width: '100%',
          maxWidth: contentW,
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          padding: PAD * 1.5,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(30,64,175,0.35)',
          ...SHADOW,
        },
        activeIconWrap: { marginBottom: 20 },
        activeIconCircle: {
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TOKEN.grammarSoft,
        },
        activeTitle: { ...typographyScale.section, fontSize: 22, color: TOKEN.ink, marginBottom: 8, textAlign: 'center' },
        activeSub: { ...typographyScale.body, color: TOKEN.ink, opacity: 0.85, marginBottom: 20, textAlign: 'center', lineHeight: 22 },
        activeBenefits: { width: '100%', marginBottom: 24, paddingHorizontal: 8 },
        activeBenefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
        activeBenefitText: { ...typographyScale.bodyMedium, color: TOKEN.ink },
        backBtn: {
          backgroundColor: TOKEN.accent,
          paddingVertical: 14,
          paddingHorizontal: 32,
          borderRadius: RADIUS.button,
          alignSelf: 'stretch',
          alignItems: 'center',
          shadowColor: TOKEN.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        },
        backBtnText: { ...typographyScale.button, color: '#FFF', fontWeight: '700' },
        startLearningBtn: {
          marginTop: 12,
          paddingVertical: 12,
          paddingHorizontal: 24,
          alignSelf: 'stretch',
          alignItems: 'center',
          borderRadius: RADIUS.button,
          borderWidth: 1,
          borderColor: TOKEN.border,
        },
        startLearningBtnText: { ...typographyScale.button, color: TOKEN.accent },
        activeCurrentPlan: { ...typographyScale.bodyMedium, color: TOKEN.inkMuted, marginBottom: 16 },
        activeCurrentPlanBold: { fontWeight: '700', color: TOKEN.ink },
        pendingSwitchNotice: { ...typographyScale.caption, color: TOKEN.accent, marginBottom: 8 },
        activeSwitchSection: { width: '100%', marginBottom: 24 },
        activeSwitchTitle: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.inkMuted, marginBottom: 10 },
        activeSwitchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
        activeSwitchBtn: {
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: RADIUS.button,
          borderWidth: 1.5,
          borderColor: TOKEN.accent,
          backgroundColor: resolvedMode === 'dark' ? 'rgba(30,64,175,0.12)' : 'rgba(30,64,175,0.08)',
        },
        activeSwitchBtnText: { ...typographyScale.button, color: TOKEN.accent, fontSize: 14 },
      }),
    [TOKEN, SHADOW, resolvedMode, contentW]
  );
  const load = useSubscriptionStore((s) => s.load);
  const syncWithServer = useSubscriptionStore((s) => s.syncWithServer);
  const purchase = useSubscriptionStore((s) => s.purchase);
  const restore = useSubscriptionStore((s) => s.restore);
  const isActive = useSubscriptionStore((s) => s.isSubscriptionActive);
  const currentPlan = useSubscriptionStore((s) => s.currentPlan);
  const pendingPlan = useSubscriptionStore((s) => s.pendingPlan);
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const t = useMemo(
    () => getSubscriptionStrings(displayLanguage),
    [displayLanguage]
  );
  const commonStr = useMemo(() => getCommonStrings(displayLanguage), [displayLanguage]);
  const features = useMemo(
    () =>
      [
        { icon: 'school-outline' as const, title: t.feature1Title, sub: t.feature1Sub },
        { icon: 'chatbubble-ellipses-outline' as const, title: t.feature2Title, sub: t.feature2Sub },
        { icon: 'refresh-outline' as const, title: t.feature3Title, sub: t.feature3Sub },
        { icon: 'bookmark-outline' as const, title: t.feature4Title, sub: t.feature4Sub },
      ] as const,
    [t]
  );
  const planDisplayName = useMemo(
    () => ({
      monthly: t.durationMonth,
      yearly: t.durationYear,
      lifetime: t.durationLifetime,
    }),
    [t]
  );

  /** 年額の「月あたり」行。Store の pricePerMonthString にロケール別の /月・/mo 等を付与 */
  const yearlyPerMonthDisplay = useMemo(() => {
    const raw = liveMonthlyEquivalents.yearly;
    if (raw == null || String(raw).trim() === '') return t.yearlyEquivalentPerMonthFallback;
    return t.yearlyEquivalentPerMonthLine(String(raw));
  }, [liveMonthlyEquivalents.yearly, t]);
  const isConnected = useNetInfo();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const ctaOpacity = useRef(new Animated.Value(0.96)).current;
  useEffect(() => {
    Animated.timing(ctaOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [ctaOpacity]);

  useEffect(() => {
    load();
    trackSubscriptionView();
  }, [load]);

  useEffect(() => {
    let active = true;
    if (!isRevenueCatConfigured()) {
      return () => {
        active = false;
      };
    }

    void import('@/src/revenuecat/client')
      .then(async (client) => {
        const offering = await client.getRevenueCatOffering();
        if (!active || !offering) return;

        const monthly = (client.getRevenueCatPackageForPlan(
          offering,
          'monthly'
        )?.product ?? null) as RevenueCatStoreProduct | null;
        const yearly = (client.getRevenueCatPackageForPlan(
          offering,
          'yearly'
        )?.product ?? null) as RevenueCatStoreProduct | null;
        const lifetime = (client.getRevenueCatPackageForPlan(
          offering,
          'lifetime'
        )?.product ?? null) as RevenueCatStoreProduct | null;

        setLivePrices({
          monthly: monthly?.priceString,
          yearly: yearly?.priceString,
          lifetime: lifetime?.priceString,
        });

        setLiveMonthlyEquivalents({
          monthly: monthly?.pricePerMonthString ?? monthly?.priceString,
          yearly: yearly?.pricePerMonthString ?? undefined,
        });

        setYearlyHasFreeTrial(hasFreeTrial(yearly));

        if (monthly?.price && yearly?.pricePerMonth) {
          const discountRatio = 1 - yearly.pricePerMonth / monthly.price;
          if (discountRatio > 0) {
            setYearlyBadge(t.yearlyDiscountApprox(Math.round(discountRatio * 100)));
          }
        }
      })
      .catch((error) => {
        if (__DEV__) logger.warn('[RevenueCat] offering preload failed', error);
      });

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    trackPlanSelect(selectedPlan);
  }, [selectedPlan]);

  /** 既に購入済みのときは現在のプランを初期選択に */
  useEffect(() => {
    const plan = currentPlan ?? null;
    if (plan != null && isActive()) setSelectedPlan(plan);
  }, [currentPlan, isActive]);

  const openLegalLink = async (url: string | null, kind: 'privacy' | 'terms' | 'appleEula') => {
    if (!url) {
      const body =
        kind === 'privacy'
          ? t.legalPrivacyMissingBody
          : kind === 'terms'
            ? t.legalTermsMissingBody
            : t.legalAppleEulaMissingBody;
      Alert.alert(t.legalUnavailableTitle, body);
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  };

  const showPurchaseUnavailableAlert = () => {
    if (isRunningInExpoGo()) {
      Alert.alert(t.purchaseFailed, t.purchaseExpoGoUnavailableBody);
      return;
    }
    if (!isRevenueCatConfigured()) {
      Alert.alert(t.purchaseFailed, t.purchaseRcNotConfiguredBody);
      return;
    }
    Alert.alert(t.purchaseFailed, t.purchasePlanUnavailableBody);
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    void triggerLightImpact();
    if (isConnected === false) {
      Alert.alert(t.purchaseFailed, t.offlinePurchase);
      return;
    }
    trackPurchaseTap(plan);
    setLoading(true);
    try {
      if (!isRevenueCatConfigured()) {
        showPurchaseUnavailableAlert();
        return;
      }
      const result = await purchase(plan);
      if (result.success) {
        if (userId) void syncWithServer(userId).catch(() => {});
        if (result.downgradeScheduled) {
          Alert.alert(t.downgradeScheduledTitle, t.downgradeScheduledMessage, [{ text: commonStr.alertOk }]);
        } else {
          Alert.alert(t.purchaseSuccess, t.purchaseSuccessMessage, [
            { text: commonStr.alertOk, onPress: () => router.back() },
          ]);
        }
      } else {
        const errMsg = result.error ?? t.purchaseErrorGenericFallback;
        const isOfferingError =
          errMsg.includes('Offering を取得できませんでした') || errMsg.includes('Offering');
        const hint = isOfferingError ? t.offeringErrorHint : '';
        Alert.alert(
          t.purchaseFailed,
          errMsg + hint,
          [
            { text: t.close },
            { text: t.purchaseRetry, onPress: () => handlePurchase(plan) },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    void triggerLightImpact();
    if (isConnected === false) {
      Alert.alert(t.restoreFailed, t.offlineRestore);
      return;
    }
    trackRestoreTap();
    setLoading(true);
    try {
      if (isRunningInExpoGo()) {
        Alert.alert(t.restoreFailed, t.restoreExpoGoUnavailableBody);
        return;
      }
      if (!isRevenueCatConfigured()) {
        Alert.alert(t.restoreFailed, t.restoreRcNotConfiguredBody);
        return;
      }
      const result = await restore();
      if (result.success) {
        if (userId) void syncWithServer(userId).catch(() => {});
        Alert.alert(t.restoreSuccess, t.restoreSuccessMessage);
      } else {
        Alert.alert(t.restoreFailed, result.error ?? t.restoreNoPurchaseBody);
      }
    } finally {
      setLoading(false);
    }
  };

  const subscribed = isActive();
  const showChangePlan = subscribed && currentPlan != null && selectedPlan !== currentPlan && selectedPlan !== pendingPlan;

  return (
    <ErrorBoundary contextLabel={t.errorBoundaryContext}>
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

          <View style={[styles.headerFixed, { paddingTop: headerTop }]}>
        <View style={[styles.headerRow, { width: contentW }]}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => { void triggerLightImpact(); router.back(); }}
            accessibilityLabel={t.close}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPaddingBottom + PAD_M + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          {/* 1. PROの価値（まず見せる・隠れない） */}
          <View style={styles.proValueCard}>
            <LinearGradient
              colors={heroGradient}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.proValueHeader}>
              <View style={styles.proValueBadge}>
                <Text style={styles.proValueBadgeText}>PRO</Text>
              </View>
              <Text style={styles.proValueTitle}>{t.proTitle}</Text>
              <Text style={styles.proValueSub}>{t.proSub}</Text>
            </View>
            <View style={styles.proValueList} accessibilityRole="list" accessibilityLabel={t.proBenefitsListA11y}>
              {features.map((f, index) => (
                <View
                  key={f.title}
                  style={[
                    styles.proValueListItem,
                    index === 0 && styles.proValueListItemFirst,
                  ]}
                  accessibilityLabel={`${f.title}。${f.sub}`}
                >
                  <View style={styles.proValueIconWrap}>
                    <Ionicons name={f.icon} size={20} color={TOKEN.accent} />
                  </View>
                  <View style={styles.proValueTextWrap}>
                    <Text style={styles.proValueItemTitle}>{f.title}</Text>
                    <Text style={styles.proValueItemSub}>{f.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 2. プラン選択（スクロール内・固定で隠さない） */}
          <Text style={styles.planLabel}>{t.planLabel}</Text>
          <Text style={styles.planStorefrontNote}>{t.priceStorefrontCurrencyNote}</Text>
          {subscribed && currentPlan != null && (
            <>
              <Text
                style={styles.activeCurrentPlan}
                accessibilityLabel={`${t.currentPlanPrefix}${planDisplayName[currentPlan]}`}
              >
                {t.currentPlanPrefix}
                <Text style={styles.activeCurrentPlanBold}>{planDisplayName[currentPlan]}</Text>
              </Text>
              {pendingPlan === 'monthly' && (
                <Text style={styles.pendingSwitchNotice}>{t.pendingSwitchNotice}</Text>
              )}
            </>
          )}
          <View style={styles.planRow}>
            <Pressable
              style={({ pressed }) => [
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
                pressed && !loading && styles.planCardPressed,
              ]}
              onPress={() => !loading && setSelectedPlan('monthly')}
              disabled={loading}
              accessibilityLabel={t.planMonthlyA11y(livePrices.monthly ?? '¥980')}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedPlan === 'monthly' }}
            >
              <View style={[styles.planBadge, styles.planBadgeMonthly]}>
                <Text style={styles.planBadgeText}>{t.badgeCasual}</Text>
              </View>
              <Text style={styles.planDuration}>{t.durationMonth}</Text>
              <Text style={styles.planPrice}>{livePrices.monthly ?? '¥980'}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.planCard,
                selectedPlan === 'yearly' && styles.planCardSelected,
                pressed && !loading && styles.planCardPressed,
              ]}
              onPress={() => !loading && setSelectedPlan('yearly')}
              disabled={loading}
              accessibilityLabel={t.planYearlyA11y(
                livePrices.yearly ?? '¥7,800',
                yearlyPerMonthDisplay
              )}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedPlan === 'yearly' }}
            >
              <View style={[styles.planBadge, styles.planBadgePopular]}>
                <Text style={styles.planBadgeText}>{t.badgeRecommended}</Text>
              </View>
              <Text style={styles.planDuration}>{t.durationYear}</Text>
              <Text style={styles.planPrice}>{livePrices.yearly ?? '¥7,800'}</Text>
              <Text style={styles.planPriceOff}>{yearlyBadge ?? t.priceOff}</Text>
              <Text style={styles.planPriceSub}>{yearlyPerMonthDisplay}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.planCard,
                selectedPlan === 'lifetime' && styles.planCardSelected,
                pressed && !loading && styles.planCardPressed,
              ]}
              onPress={() => !loading && setSelectedPlan('lifetime')}
              disabled={loading}
              accessibilityLabel={t.planLifetimeA11y(livePrices.lifetime ?? '¥14,800')}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedPlan === 'lifetime' }}
            >
              <View style={[styles.planBadge, styles.planBadgeBargain]}>
                <Text style={styles.planBadgeText}>{t.badgeDeal}</Text>
              </View>
              <Text style={styles.planDuration}>{t.durationLifetime}</Text>
              <Text style={styles.planPrice}>{livePrices.lifetime ?? '¥14,800'}</Text>
              <Text style={styles.planLumpLabel}>{t.lumpLabel}</Text>
            </Pressable>
          </View>

          <Text style={styles.planDetailText}>
            {selectedPlan === 'yearly'
              ? (yearlyHasFreeTrial ? t.detailYearly : t.detailYearlyNoTrial)
              : selectedPlan === 'monthly'
                ? t.detailMonthly
                : t.detailLifetime}
          </Text>

          {/* 3. CTA（購入済みなら戻る/学習を始める、未購入 or プラン変更時は購入ボタン） */}
          <Animated.View style={{ opacity: ctaOpacity }}>
            {subscribed && !showChangePlan ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.9 }]}
                  onPress={() => { void triggerLightImpact(); router.back(); }}
                  accessibilityLabel={t.back}
                  accessibilityRole="button"
                >
                  <Text style={styles.backBtnText}>{t.back}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.startLearningBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    void triggerLightImpact();
                    router.back();
                  }}
                  accessibilityLabel={t.startLearning}
                  accessibilityRole="button"
                >
                  <Text style={styles.startLearningBtnText}>{t.startLearning}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [styles.purchaseButton, pressed && !loading && { opacity: 0.9 }]}
                  onPress={() => !loading && handlePurchase(selectedPlan)}
                  disabled={loading}
                  accessibilityLabel={
                    showChangePlan
                      ? t.changePlanCta
                      : selectedPlan === 'yearly' && yearlyHasFreeTrial
                        ? t.ctaStartTrial
                        : t.ctaPurchase
                  }
                  accessibilityRole="button"
                  accessibilityState={{ busy: loading }}
                >
                  <Ionicons name={showChangePlan ? 'swap-horizontal' : selectedPlan === 'yearly' ? 'gift-outline' : 'cart'} size={20} color="#FFF" />
                  <Text style={styles.purchaseButtonText}>
                    {showChangePlan ? t.changePlanCta : selectedPlan === 'yearly' && yearlyHasFreeTrial ? t.ctaStartTrial : t.ctaPurchase}
                  </Text>
                </Pressable>
              </>
            )}
          </Animated.View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={TOKEN.accent} size="small" />
              <Text style={styles.loadingOverlayText}>{t.loading}</Text>
            </View>
          )}

          <View style={styles.footerRow}>
            <Pressable
              style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.8 }]}
              onPress={handleRestore}
              disabled={loading}
              accessibilityLabel={t.restore}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={18} color={TOKEN.accent} />
              <Text style={styles.linkBtnText}>{t.restore}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.back()}
              disabled={loading}
              accessibilityLabel={t.skip}
              accessibilityRole="button"
            >
              <Text style={styles.skipBtnText}>{t.skip}</Text>
            </Pressable>
          </View>

          <View style={styles.legalRow}>
            <Pressable style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.8 }]} onPress={() => { void openLegalLink(PRIVACY_POLICY_URL, 'privacy'); }} accessibilityLabel={t.openPrivacyA11y} accessibilityRole="link">
              <Text style={styles.legalLinkText}>{t.privacyPolicy}</Text>
            </Pressable>
            <Text style={styles.legalSeparator}>・</Text>
            <Pressable style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.8 }]} onPress={() => { void openLegalLink(TERMS_URL, 'terms'); }} accessibilityLabel={t.openTermsA11y} accessibilityRole="link">
              <Text style={styles.legalLinkText}>{t.termsOfUse}</Text>
            </Pressable>
            <Text style={styles.legalSeparator}>・</Text>
            <Pressable
              style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.8 }]}
              onPress={() => {
                void openLegalLink(APPLE_STANDARD_EULA_URL, 'appleEula');
              }}
              accessibilityLabel={t.openAppleEulaA11y}
              accessibilityRole="link"
            >
              <Text style={styles.legalLinkText}>{t.appleStandardEula}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}

export default function SubscriptionScreen() {
  return <SubscriptionContent />;
}
