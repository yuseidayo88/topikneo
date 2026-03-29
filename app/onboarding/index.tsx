import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useOnboardingStore,
  type StudyPurpose,
  type HowFound,
  type KoreanLevel,
} from '@/src/store/onboardingStore';
import { logEvent } from '@/src/analytics';
import { setReminderEnabled, setReminderTime, applyReminder, requestReminderPermission } from '@/src/utils/reminder';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact } from '@/src/utils/haptics';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, PAD, GAP, CONTENT_W, RADIUS } from '@/src/theme/settingsFlowTokens';
import { getOnboardingStrings } from '@/src/i18n/onboarding';
import { getCommonStrings } from '@/src/i18n/common';
import { useProfileStore } from '@/src/store/profileStore';

const PAD_M = 16;

/** ステップ順: welcome → theme → level → purpose → found → goal → reminder → done。A/B検証時は並び替え可。 */
const STEP_KEYS = ['welcome', 'theme', 'level', 'purpose', 'found', 'goal', 'reminder', 'done'] as const;
const GOAL_OPTIONS = [1, 2, 3] as const;

function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /network|fetch|ECONNREFUSED|ETIMEDOUT|タイムアウト|接続/i.test(msg);
}

/**
 * ステップ表示時のトラッキング。analytics SDK 連携時はここで logEvent を呼ぶ。
 * 例: analytics().logEvent('onboarding_step_view', { step: stepKey });
 */
function trackOnboardingStep(stepKey: string) {
  logEvent('onboarding_step_view', { step: stepKey });
}

/**
 * オンボーディング完了時のトラッキング。分析用に選択内容を送る。
 */
function trackOnboardingComplete(payload: {
  theme: string;
  level: string;
  purpose: string;
  howFound: string;
  dailyGoalWord: number;
  dailyGoalGrammar: number;
  hasReminder: boolean;
}) {
  logEvent('onboarding_complete', {
    theme: payload.theme,
    level: payload.level,
    purpose: payload.purpose,
    howFound: payload.howFound,
    dailyGoalWord: payload.dailyGoalWord,
    dailyGoalGrammar: payload.dailyGoalGrammar,
    hasReminder: payload.hasReminder,
  });
}

export default function OnboardingScreen() {
  const { resolvedMode, setMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromSettings = params.from === 'settings';
  const complete = useOnboardingStore((s) => s.complete);
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const t = useMemo(
    () => getOnboardingStrings(displayLanguage),
    [displayLanguage]
  );
  const commonStr = useMemo(() => getCommonStrings(displayLanguage), [displayLanguage]);

  const [step, setStep] = useState(0);
  const [studyPurpose, setStudyPurpose] = useState<StudyPurpose>(null);
  const [koreanLevel, setKoreanLevel] = useState<KoreanLevel>(null);
  const [howFound, setHowFound] = useState<HowFound>(null);
  const [reminderTimeStr, setReminderTimeStr] = useState<string>('20:00');
  const [reminderOn, setReminderOn] = useState(true);
  const [dailyGoalWord, setDailyGoalWord] = useState<1 | 2 | 3>(1);
  const [dailyGoalGrammar, setDailyGoalGrammar] = useState<1 | 2 | 3>(1);
  /** テーマステップで一度でも選んだら次へ可。タップで即 setMode して実体験させる */
  const [themeChoice, setThemeChoice] = useState<'light' | 'dark' | 'system' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const doneScale = useRef(new Animated.Value(0.3)).current;
  const doneOpacity = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled).catch(() => {});
  }, []);

  const reminderDate = useMemo(() => {
    const [h, m] = reminderTimeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(isNaN(h) ? 20 : h, isNaN(m) ? 0 : m, 0, 0);
    return d;
  }, [reminderTimeStr]);

  const handleReminderTimeChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const h = date.getHours();
    const m = date.getMinutes();
    setReminderTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const currentKey = STEP_KEYS[step];
  const isLast = step === STEP_KEYS.length - 1;
  const currentQuestion = t.stepQuestion[currentKey] ?? currentKey;

  const isNextDisabled =
    (currentKey === 'theme' && themeChoice === null) ||
    (currentKey === 'level' && koreanLevel === null) ||
    (currentKey === 'purpose' && studyPurpose === null) ||
    (currentKey === 'found' && howFound === null);

  useEffect(() => {
    if (currentKey === 'done') {
      if (reduceMotionEnabled) {
        doneScale.setValue(1);
        doneOpacity.setValue(1);
      } else {
        doneScale.setValue(0.3);
        doneOpacity.setValue(0);
        Animated.parallel([
          Animated.timing(doneScale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(doneOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [currentKey, doneScale, doneOpacity, reduceMotionEnabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  useEffect(() => {
    trackOnboardingStep(currentKey);
  }, [currentKey]);

  const handleNext = async () => {
    if (isLast) {
      setIsSubmitting(true);
      try {
        if (reminderOn) {
          const granted = await requestReminderPermission();
          if (!granted) {
            Alert.alert(t.reminderPermissionDeniedTitle, t.reminderPermissionDeniedMessage, [{ text: commonStr.alertOk }]);
          }
          await setReminderEnabled(true);
          await setReminderTime(reminderTimeStr);
          await applyReminder();
        }
        complete({
          studyPurpose: studyPurpose ?? 'other',
          howFound: howFound ?? 'other',
          koreanLevel: koreanLevel ?? null,
          reminderTime: reminderOn ? reminderTimeStr : null,
          dailyGoalWordLessons: dailyGoalWord,
          dailyGoalGrammarLessons: dailyGoalGrammar,
        });
        await AsyncStorage.setItem('kla_onboarding_just_completed', '1');
        await AsyncStorage.setItem('kla_show_account_prompt', '1');
        trackOnboardingComplete({
          theme: themeChoice ?? 'system',
          level: koreanLevel ?? 'none',
          purpose: studyPurpose ?? 'other',
          howFound: howFound ?? 'other',
          dailyGoalWord,
          dailyGoalGrammar,
          hasReminder: reminderOn,
        });
        await new Promise((r) => setTimeout(r, 200));
        router.replace('/(tabs)');
      } catch (e) {
        const message = isNetworkError(e) ? t.errorNetwork : t.errorGeneric;
        Alert.alert(t.errorTitle, message, [
          { text: commonStr.alertOk },
          { text: t.errorRetry, onPress: () => handleNext() },
        ]);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  };

  const triggerHaptic = () => {
    void triggerLightImpact();
  };

  const handleBack = () => {
    triggerHaptic();
    if (fromSettings && step > 0) {
      Alert.alert(t.backToSettingsTitle, t.backToSettingsMessage, [
        { text: t.cancel },
        { text: t.backLabel, onPress: () => router.back() },
      ]);
      return;
    }
    if (fromSettings && step === 0) {
      router.back();
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        topBar: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: PAD_M,
          paddingBottom: 12,
          gap: 14,
        },
        progressWrap: { flex: 1, gap: 6 },
        progressLabel: { ...typographyScale.caption, color: TOKEN.inkMuted, textAlign: 'right' },
        progressDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
        progressDot: { width: 6, height: 6, borderRadius: 3 },
        progressDotActive: { opacity: 1 },
        progressDotInactive: { opacity: 0.25 },
        progressContext: { ...typographyScale.caption, marginTop: 4 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: PAD_M, paddingTop: 16, paddingBottom: 180 },
        wrap: { width: '100%', maxWidth: CONTENT_W, alignSelf: 'center', gap: 20 },
        wrapReminder: { gap: 10 },
        questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24 },
        questionRowReminder: { marginBottom: 12 },
        questionIconWrap: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: TOKEN.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        },
        questionIconWrapDone: { backgroundColor: TOKEN.grammarSoft ?? TOKEN.accentSoft },
        bubble: {
          flex: 1,
          backgroundColor: TOKEN.surface,
          borderRadius: 20,
          borderTopLeftRadius: 6,
          padding: 18,
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        bubbleTitle: { ...typographyScale.bodyLarge, fontWeight: '700', color: TOKEN.ink, marginBottom: 6, lineHeight: 24 },
        bubbleText: { ...typographyScale.bodyMedium, color: TOKEN.inkMuted, lineHeight: 24 },
        bubbleTextHighlight: { color: TOKEN.ink },
        welcomeSubtitle: { ...typographyScale.caption, color: TOKEN.inkMuted, marginTop: 10, lineHeight: 18 },
        options: { gap: 12 },
        option: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: 16,
          backgroundColor: TOKEN.surface,
          borderWidth: 2,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        optionActive: {
          borderColor: TOKEN.accent,
          backgroundColor: TOKEN.accentSoft,
          shadowColor: TOKEN.accent,
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 3,
        },
        optionText: { ...typographyScale.bodyMedium, color: TOKEN.ink, flex: 1, lineHeight: 22 },
        optionTextActive: { fontWeight: '600', color: TOKEN.accent },
        optionSubtitle: { ...typographyScale.caption, color: TOKEN.inkMuted, marginTop: 2, lineHeight: 16 },
        optionRow: { flexDirection: 'row', gap: 12 },
        optionFlex: { flex: 1 },
        themeHint: { ...typographyScale.caption, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 20 },
        themeCard: {
          flex: 1,
          minHeight: 140,
          paddingVertical: 20,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: TOKEN.surface,
          borderWidth: 2,
          borderColor: TOKEN.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          ...SHADOW,
        },
        themeCardActive: {
          borderColor: TOKEN.accent,
          backgroundColor: TOKEN.accentSoft,
          shadowColor: TOKEN.accent,
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 3,
        },
        themeCardLabel: { ...typographyScale.bodyMedium, fontWeight: '600', color: TOKEN.ink, textAlign: 'center' },
        themeCardLabelActive: { color: TOKEN.accent },
        themeCardSub: { ...typographyScale.caption, color: TOKEN.inkMuted, textAlign: 'center', lineHeight: 16 },
        themeCardWide: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 72,
          paddingVertical: 16,
          paddingHorizontal: 18,
          borderRadius: 16,
          backgroundColor: TOKEN.surface,
          borderWidth: 2,
          borderColor: TOKEN.border,
          gap: 12,
          marginTop: 8,
          ...SHADOW,
        },
        themeCardWideActive: {
          borderColor: TOKEN.accent,
          backgroundColor: TOKEN.accentSoft,
          shadowColor: TOKEN.accent,
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 3,
        },
        themeCardWideText: { flex: 1 },
        labelSmall: { ...typographyScale.bodySmall, fontWeight: '600', color: TOKEN.ink, marginBottom: 10 },
        goalHint: { ...typographyScale.caption, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 20 },
        goalSectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
        goalSectionAccent: { width: 3, height: 16, borderRadius: 4, backgroundColor: TOKEN.accent, marginRight: 8 },
        goalSectionTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
        goalDescription: { ...typographyScale.caption, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 18 },
        goalCard: {
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        goalRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: PAD_M,
          minHeight: 56,
        },
        goalRowLabelOnly: { paddingBottom: 8 },
        goalCardIconWrap: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TOKEN.accentSoft,
          marginRight: 12,
        },
        goalLabel: { ...typographyScale.bodyMedium, color: TOKEN.ink, flex: 1, fontWeight: '600' },
        goalValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        goalValue: { ...typographyScale.bodyLarge, fontWeight: '700', color: TOKEN.accent },
        goalCardDivider: { height: 1, backgroundColor: TOKEN.border, marginHorizontal: PAD_M },
        goalOptionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: PAD_M, paddingTop: 6, paddingBottom: 14 },
        goalOptionBox: {
          flex: 1,
          minHeight: 44,
          borderRadius: 12,
          backgroundColor: TOKEN.border,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        goalOptionBoxActive: {
          borderColor: TOKEN.accent,
          backgroundColor: TOKEN.accentSoft,
        },
        goalOptionBoxText: { ...typographyScale.title, fontSize: 20, fontWeight: '700', color: TOKEN.inkMuted },
        goalOptionBoxTextActive: { color: TOKEN.accent },
        toggleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
          paddingVertical: 10,
          paddingHorizontal: 18,
          backgroundColor: TOKEN.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: TOKEN.border,
          marginBottom: 14,
          ...SHADOW,
        },
        toggleLabel: { ...typographyScale.bodyMedium, color: TOKEN.ink },
        toggle: {
          width: 52,
          height: 28,
          borderRadius: 14,
          backgroundColor: TOKEN.border,
          justifyContent: 'center',
          paddingHorizontal: 2,
        },
        toggleOn: { backgroundColor: TOKEN.accent },
        toggleThumb: {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#FFF',
          borderWidth: 1,
          borderColor: TOKEN.border,
        },
        toggleThumbOn: { alignSelf: 'flex-end' },
        reminderPickerWrap: { marginTop: 6, alignItems: 'center' },
        reminderPickerLabel: { ...typographyScale.bodySmall, fontWeight: '600', color: TOKEN.ink, marginBottom: 4 },
        reminderTimeCard: {
          marginTop: 6,
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: TOKEN.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: TOKEN.border,
          paddingVertical: 10,
          paddingHorizontal: 16,
          ...SHADOW,
        },
        reminderTimeCardLabel: { ...typographyScale.caption, color: TOKEN.inkMuted },
        reminderTimeCardValue: { ...typographyScale.title, fontSize: 22, fontWeight: '700', color: TOKEN.accent, letterSpacing: 1 },
        reminderOffHint: { ...typographyScale.caption, color: TOKEN.inkMuted, marginTop: 8, lineHeight: 18 },
        reminderChangeHint: { ...typographyScale.caption, color: TOKEN.inkMuted, marginTop: 8, lineHeight: 18 },
        footer: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: PAD_M,
          paddingTop: 20,
          backgroundColor: TOKEN.bgEnd,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: TOKEN.border,
        },
        primaryButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 54,
          borderRadius: RADIUS.button,
          backgroundColor: TOKEN.accent,
          shadowColor: TOKEN.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 6,
          gap: 8,
        },
        primaryButtonPressed: { opacity: 0.92 },
        primaryButtonDisabled: { opacity: 0.5 },
        primaryButtonText: { ...typographyScale.button, color: '#FFF', fontWeight: '700', fontSize: 17 },
        backLink: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
        backLinkText: { ...typographyScale.bodySmall, color: TOKEN.inkMuted },
      }),
    [TOKEN, SHADOW, resolvedMode]
  );

  const questionIcon =
    currentKey === 'welcome'
      ? 'school-outline'
      : currentKey === 'done'
        ? 'checkmark-circle-outline'
        : currentKey === 'theme'
          ? 'contrast-outline'
          : 'chatbubble-ellipses-outline';

  return (
    <View style={[styles.container, { paddingTop: headerPaddingTop }]}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View
        style={styles.topBar}
        accessibilityLabel={t.progressLabel(step + 1, STEP_KEYS.length)}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: STEP_KEYS.length, now: step + 1 }}
      >
        <View style={styles.progressWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={styles.progressDots}>
              {STEP_KEYS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    { backgroundColor: TOKEN.accent },
                    i <= step ? styles.progressDotActive : styles.progressDotInactive,
                  ]}
                  accessibilityLabel={t.progressLabel(i + 1, STEP_KEYS.length) + (i <= step ? t.progressStepDone : t.progressStepPending)}
                  accessibilityState={{ selected: i <= step }}
                />
              ))}
            </View>
            <Text style={styles.progressLabel}>{step + 1} / {STEP_KEYS.length}</Text>
          </View>
          {fromSettings && (
            <Text style={[styles.progressContext, { color: TOKEN.inkMuted }]}>{t.welcomeContextSetting}</Text>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.wrap, currentKey === 'reminder' && styles.wrapReminder]}>
          {currentKey === 'done' ? (
            <Animated.View style={[{ transform: [{ scale: doneScale }], opacity: doneOpacity }]}>
              <View style={styles.questionRow}>
                <View style={[styles.questionIconWrap, styles.questionIconWrapDone]}>
                  <Ionicons name={questionIcon} size={28} color={TOKEN.grammar ?? TOKEN.accent} />
                </View>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleTitle}>{t.doneTitle}</Text>
                  <Text style={styles.bubbleText}>{t.doneBody}</Text>
                </View>
              </View>
            </Animated.View>
          ) : (
            <View style={[styles.questionRow, currentKey === 'reminder' && styles.questionRowReminder]}>
              <View style={styles.questionIconWrap}>
                <Ionicons name={questionIcon} size={28} color={TOKEN.accent} />
              </View>
              <View style={styles.bubble}>
                {currentKey === 'welcome' && (
                  <>
                    <Text style={styles.bubbleTitle}>
                      {fromSettings ? t.welcomeContextSetting : t.welcomeTitle}
                    </Text>
                    <Text style={styles.bubbleText}>{t.welcomeBody}</Text>
                    {!fromSettings && <Text style={styles.welcomeSubtitle}>{t.welcomeSubtitle}</Text>}
                  </>
                )}
                {currentKey !== 'welcome' && (
                  <Text style={[styles.bubbleText, styles.bubbleTextHighlight]}>{currentQuestion}</Text>
                )}
              </View>
            </View>
          )}

          {currentKey === 'theme' && (
            <View style={styles.options}>
              <Text style={styles.themeHint}>{t.themeHint}</Text>
              <View style={styles.optionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.themeCard,
                    themeChoice === 'light' && styles.themeCardActive,
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    void setMode('light');
                    setThemeChoice('light');
                  }}
                  accessibilityLabel={t.themeLightLabel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: themeChoice === 'light' }}
                >
                  <Ionicons name="sunny-outline" size={36} color={themeChoice === 'light' ? TOKEN.accent : TOKEN.inkMuted} />
                  <Text style={[styles.themeCardLabel, themeChoice === 'light' && styles.themeCardLabelActive]}>
                    {t.themeLightLabel}
                  </Text>
                  <Text style={styles.themeCardSub}>{t.themeLightSub}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.themeCard,
                    themeChoice === 'dark' && styles.themeCardActive,
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    void setMode('dark');
                    setThemeChoice('dark');
                  }}
                  accessibilityLabel={t.themeDarkLabel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: themeChoice === 'dark' }}
                >
                  <Ionicons name="moon-outline" size={36} color={themeChoice === 'dark' ? TOKEN.accent : TOKEN.inkMuted} />
                  <Text style={[styles.themeCardLabel, themeChoice === 'dark' && styles.themeCardLabelActive]}>
                    {t.themeDarkLabel}
                  </Text>
                  <Text style={styles.themeCardSub}>{t.themeDarkSub}</Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.themeCardWide,
                  themeChoice === 'system' && styles.themeCardWideActive,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => {
                  triggerHaptic();
                  void setMode('system');
                  setThemeChoice('system');
                }}
                accessibilityLabel={t.themeSystemLabel}
                accessibilityRole="button"
                accessibilityState={{ selected: themeChoice === 'system' }}
              >
                <Ionicons name="phone-portrait-outline" size={28} color={themeChoice === 'system' ? TOKEN.accent : TOKEN.inkMuted} />
                <View style={styles.themeCardWideText}>
                  <Text style={[styles.themeCardLabel, themeChoice === 'system' && styles.themeCardLabelActive]}>
                    {t.themeSystemLabel}
                  </Text>
                  <Text style={styles.themeCardSub}>{t.themeSystemSub}</Text>
                </View>
              </Pressable>
            </View>
          )}

          {currentKey === 'level' && (
            <View style={styles.options}>
              {t.levelOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [styles.option, koreanLevel === opt.value && styles.optionActive, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    triggerHaptic();
                    setKoreanLevel(opt.value);
                  }}
                  accessibilityLabel={opt.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: koreanLevel === opt.value }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, koreanLevel === opt.value && styles.optionTextActive]}>{opt.label}</Text>
                    {opt.subtitle && <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {currentKey === 'purpose' && (
            <View style={styles.options}>
              {t.purposeOptions.map((p) => (
                <Pressable
                  key={p.value}
                  style={({ pressed }) => [styles.option, studyPurpose === p.value && styles.optionActive, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    triggerHaptic();
                    setStudyPurpose(p.value);
                  }}
                  accessibilityLabel={p.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: studyPurpose === p.value }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, studyPurpose === p.value && styles.optionTextActive]}>{p.label}</Text>
                    {p.subtitle && <Text style={styles.optionSubtitle}>{p.subtitle}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {currentKey === 'found' && (
            <View style={styles.options}>
              {t.howFoundOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [styles.option, howFound === opt.value && styles.optionActive, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    triggerHaptic();
                    setHowFound(opt.value);
                  }}
                  accessibilityLabel={opt.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: howFound === opt.value }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, howFound === opt.value && styles.optionTextActive]}>{opt.label}</Text>
                    {opt.subtitle && <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {currentKey === 'goal' && (
            <View style={styles.options}>
              <View style={styles.goalSectionHead}>
                <View style={styles.goalSectionAccent} />
                <Text style={styles.goalSectionTitle}>{t.goalSectionTitle}</Text>
              </View>
              <Text style={styles.goalDescription}>{t.goalDescription}</Text>
              <View style={styles.goalCard}>
                <View style={[styles.goalRow, styles.goalRowLabelOnly]}>
                  <View style={styles.goalCardIconWrap}>
                    <Ionicons name="book-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.goalLabel}>{t.goalWordLabel}</Text>
                </View>
                <View style={styles.goalOptionRow}>
                  {GOAL_OPTIONS.map((n) => (
                    <Pressable
                      key={`word-${n}`}
                      style={({ pressed }) => [styles.goalOptionBox, dailyGoalWord === n && styles.goalOptionBoxActive, pressed && { opacity: 0.85 }]}
                      onPress={() => {
                        triggerHaptic();
                        setDailyGoalWord(n);
                      }}
                      accessibilityLabel={t.goalOptionLabel(n)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.goalOptionBoxText, dailyGoalWord === n && styles.goalOptionBoxTextActive]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.goalCardDivider} />
                <View style={[styles.goalRow, styles.goalRowLabelOnly]}>
                  <View style={[styles.goalCardIconWrap, { backgroundColor: TOKEN.grammarSoft }]}>
                    <Ionicons name="reader-outline" size={22} color={TOKEN.grammar} />
                  </View>
                  <Text style={styles.goalLabel}>{t.goalGrammarLabel}</Text>
                </View>
                <View style={styles.goalOptionRow}>
                  {GOAL_OPTIONS.map((n) => (
                    <Pressable
                      key={`grammar-${n}`}
                      style={({ pressed }) => [styles.goalOptionBox, dailyGoalGrammar === n && styles.goalOptionBoxActive, pressed && { opacity: 0.85 }]}
                      onPress={() => {
                        triggerHaptic();
                        setDailyGoalGrammar(n);
                      }}
                      accessibilityLabel={t.goalOptionLabel(n)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.goalOptionBoxText, dailyGoalGrammar === n && styles.goalOptionBoxTextActive]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {currentKey === 'reminder' && (
            <>
              <Pressable
                style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.9 }]}
                onPress={() => setReminderOn(!reminderOn)}
                accessibilityLabel={reminderOn ? t.reminderOffA11y : t.reminderOnA11y}
                accessibilityRole="switch"
                accessibilityState={{ checked: reminderOn }}
              >
                <Text style={styles.toggleLabel}>{t.reminderToggleLabel}</Text>
                <View style={[styles.toggle, reminderOn && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, reminderOn && styles.toggleThumbOn]} />
                </View>
              </Pressable>
              {!reminderOn && (
                <Text style={styles.reminderOffHint}>{t.reminderOffHint}</Text>
              )}
              {reminderOn && (
                <View style={styles.reminderPickerWrap}>
                  <Text style={styles.reminderPickerLabel}>{t.reminderTimeLabel}</Text>
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleReminderTimeChange}
                    themeVariant={resolvedMode === 'dark' ? 'dark' : 'light'}
                  />
                  <View style={styles.reminderTimeCard}>
                    <Text style={styles.reminderTimeCardLabel}>{t.reminderTimeCardLabel}</Text>
                    <Text style={styles.reminderTimeCardValue}>{reminderTimeStr}</Text>
                  </View>
                  <Text style={styles.reminderChangeHint}>{t.reminderChangeHint}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom + PAD_M }]}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isNextDisabled && !isSubmitting && styles.primaryButtonPressed,
            (isNextDisabled || isSubmitting) && styles.primaryButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={isNextDisabled || isSubmitting}
          accessibilityLabel={isLast ? (fromSettings ? t.buttonSave : t.buttonStart) : t.buttonNext}
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {isLast ? (fromSettings ? t.buttonSave : t.buttonStart) : t.buttonNext}
              </Text>
              {!isLast && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
            </>
          )}
        </Pressable>
        {(step > 0 || fromSettings) && (
          <Pressable onPress={handleBack} style={styles.backLink} accessibilityLabel={t.backLabel} accessibilityRole="button">
            <Text style={styles.backLinkText}>{t.backLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
