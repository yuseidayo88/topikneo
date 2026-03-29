import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useProfileStore } from '@/src/store/profileStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { useProgressStore } from '@/src/store/progressStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { useFeedbackStore, type FeedbackVolumeKey, type TtsVoicePreset } from '@/src/store/feedbackStore';
import {
  getReminderEnabled,
  getReminderTime,
  setReminderEnabled,
  setReminderTime,
  applyReminder,
} from '@/src/utils/reminder';
import * as db from '@/src/db/database';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, RADIUS, PAD, GAP, MIN_TOUCH } from '@/src/theme/settingsFlowTokens';
import { getAppVersion } from '@/src/utils/appVersion';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { getHomeTabStrings, getSettingsScreenStrings } from '@/src/i18n/appScreens';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';
import { addBreadcrumb, captureException, captureMessage } from '@/src/utils/monitoring';
import * as WebBrowser from 'expo-web-browser';
import { APPLE_STANDARD_EULA_URL, PRIVACY_POLICY_URL, TERMS_URL, SUPPORT_URL } from '@/src/constants/legal';


export default function SettingsScreen() {
  const contentW = useContentColumnWidth(PAD);
  const showSentryTestButton = process.env.EXPO_PUBLIC_ENABLE_SENTRY_TEST_BUTTON === 'true';
  /** Sentry 手動テスト（環境変数で有効化時のみ） */
  const showDebugSection = showSentryTestButton;
  const router = useRouter();
  const navigation = useNavigation();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const { mode, setMode, resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const upgradeGradient = useMemo<[string, string]>(
    () =>
      resolvedMode === 'dark'
        ? ['#1a2744', '#2d1f4e']
        : ['#DBEAFE', '#C7D2FE'],
    [resolvedMode]
  );
  const upgradeCardBorderColor = useMemo(
    () => 'rgba(30,64,175,0.4)',
    []
  );
  const refresh = useProgressStore((s) => s.refresh);
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const restore = useSubscriptionStore((s) => s.restore);
  const soundEnabled = useFeedbackStore((s) => s.soundEnabled);
  const hapticsEnabled = useFeedbackStore((s) => s.hapticsEnabled);
  const soundVolume = useFeedbackStore((s) => s.soundVolume);
  const ttsVoicePreset = useFeedbackStore((s) => s.ttsVoicePreset);
  const saveFeedback = useFeedbackStore((s) => s.save);
  const name = useProfileStore((s) => s.name);
  const displayName = useProfileStore((s) => s.displayName);
  const loadProfile = useProfileStore((s) => s.load);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const ts = useMemo(
    () => getSettingsScreenStrings(displayLanguage),
    [displayLanguage]
  );
  const ht = useMemo(
    () => getHomeTabStrings(displayLanguage),
    [displayLanguage]
  );

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTimeStr, setReminderTimeStr] = useState<string>('20:00');
  const [showPicker, setShowPicker] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  useEffect(() => {
    (async () => {
      const on = await getReminderEnabled();
      const t = await getReminderTime();
      setReminderOn(on);
      setReminderTimeStr(t || '20:00');
    })();
  }, []);

  const reminderLocale = displayLanguage;

  const handleToggleReminder = async (value: boolean) => {
    setReminderOn(value);
    await setReminderEnabled(value);
    if (value) {
      await setReminderTime(reminderTimeStr, reminderLocale);
      await applyReminder(reminderLocale);
    }
  };

  const handleTimeChange = async (_: unknown, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) {
      const str = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      setReminderTimeStr(str);
      await setReminderTime(str, reminderLocale);
      if (reminderOn) await applyReminder(reminderLocale);
    }
  };

  const reminderDate = (() => {
    const [h, m] = reminderTimeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const handleReset = () => {
    Alert.alert(ts.resetConfirmTitle, ts.resetConfirmMessage, [
      { text: ts.cancel, style: 'cancel' },
      {
        text: ts.resetConfirmAction,
        style: 'destructive',
        onPress: async () => {
          db.resetAllData();
          refresh();
          router.back();
        },
      },
    ]);
  };

  const safeBack = () => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const handleSetFeedback = async (partial: {
    soundEnabled?: boolean;
    hapticsEnabled?: boolean;
    soundVolume?: FeedbackVolumeKey;
    ttsVoicePreset?: TtsVoicePreset;
  }) => {
    void triggerSelectionHaptic();
    await saveFeedback(partial);
  };

  const ttsVoiceTitle = displayLanguage === 'ja' ? '読み上げ音声' : 'Speech voice';
  const ttsVoiceSub = displayLanguage === 'ja' ? '単語・例文の音声を選択' : 'Choose word/example voice';
  const ttsVoiceFemale = displayLanguage === 'ja' ? '女性' : 'Female';
  const ttsVoiceMale = displayLanguage === 'ja' ? '男性' : 'Male';

  const handleOpenLegal = async (url: string | null, kind: 'privacy' | 'terms' | 'support' | 'appleEula') => {
    if (!url) {
      const message =
        kind === 'privacy'
          ? ts.legalPrivacyMissing
          : kind === 'terms'
            ? ts.legalTermsMissing
            : kind === 'appleEula'
              ? ts.legalAppleEulaMissing
              : ts.legalSupportMissing;
      Alert.alert(ts.legalNotPublished, message);
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restore();
      if (result.success) {
        Alert.alert(ts.restoreSuccessTitle, ts.restoreSuccessMessage);
      } else {
        Alert.alert(ts.restoreFailTitle, result.error ?? ts.restoreFailFallback);
      }
    } finally {
      setRestoring(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        headerFixed: { paddingHorizontal: PAD, alignItems: 'center', backgroundColor: 'transparent' },
        headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
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
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: PAD, alignItems: 'center' },
        wrap: { gap: GAP },
        profileCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          padding: PAD,
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        profileAvatar: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: TOKEN.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        },
        profileText: { flex: 1, minWidth: 0 },
        profileTitle: { ...typographyScale.bodyLarge, fontWeight: '700', color: TOKEN.ink, marginBottom: 4 },
        profileSub: { ...typographyScale.bodySmall, color: TOKEN.inkMuted },
        profileEditBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
        upgradeCard: {
          borderRadius: RADIUS.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: upgradeCardBorderColor,
          ...SHADOW,
        },
        upgradeContent: { padding: PAD },
        upgradeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
        upgradeLabel: { ...typographyScale.body, color: TOKEN.ink, marginRight: 8 },
        proBadge: { backgroundColor: TOKEN.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
        proBadgeText: { ...typographyScale.badge, color: '#FFF', fontWeight: '700', letterSpacing: 0.5 },
        upgradeRecommendBadge: {
          backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: RADIUS.pill,
        },
        upgradeRecommendText: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.inkMuted },
        upgradeTitle: { ...typographyScale.bodyLarge, fontWeight: '700', color: TOKEN.ink, marginBottom: 6 },
        upgradeDesc: { ...typographyScale.caption, color: TOKEN.inkMuted, lineHeight: 22, marginBottom: 12 },
        upgradeBenefits: { gap: 8, marginBottom: 16 },
        upgradeBenefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        upgradeBenefitText: { ...typographyScale.bodySmall, fontWeight: '500', color: TOKEN.ink },
        upgradeButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TOKEN.accent,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: RADIUS.button,
          gap: 8,
          shadowColor: TOKEN.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        },
        upgradeButtonText: { ...typographyScale.button, color: '#FFF', fontWeight: '700' },
        sectionBlock: { marginBottom: 2 },
        sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
        sectionAccent: { width: 3, height: 20, borderRadius: 4, backgroundColor: TOKEN.accent, marginRight: 10 },
        sectionTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
        themeCard: {
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          padding: PAD,
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        themeRow: { flexDirection: 'row', gap: 12 },
        themeOption: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: RADIUS.option,
          alignItems: 'center',
          backgroundColor: TOKEN.accentSoft,
        },
        themeOptionActive: { backgroundColor: TOKEN.accent },
        themeOptionText: { ...typographyScale.bodyMedium, color: TOKEN.inkMuted },
        themeOptionTextActive: { color: '#FFF', fontWeight: '600' },
        segmentedRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
        segmentedOption: {
          flex: 1,
          minHeight: MIN_TOUCH,
          borderRadius: RADIUS.option,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          backgroundColor: TOKEN.accentSoft,
        },
        segmentedOptionActive: { backgroundColor: TOKEN.accent },
        segmentedOptionText: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, fontWeight: '600' },
        segmentedOptionTextActive: { color: '#FFFFFF' },
        settingLabelWrap: { flex: 1, minWidth: 0 },
        settingSubLabel: { ...typographyScale.caption, color: TOKEN.inkMuted, marginTop: 2, lineHeight: 18 },
        listCard: {
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        listCardInner: { borderRadius: RADIUS.card, overflow: 'hidden' },
        listRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 18,
          paddingHorizontal: PAD,
        },
        listRowPressed: { backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
        listRowDisabled: { opacity: 0.6 },
        divider: { height: 1, backgroundColor: TOKEN.divider, marginLeft: PAD },
        listIconWrap: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TOKEN.accentSoft,
          marginRight: 12,
        },
        listIconDanger: { backgroundColor: TOKEN.dangerSoft },
        listLabel: { ...typographyScale.bodyMedium, color: TOKEN.ink, flex: 1 },
        listLabelWrap: { flex: 1, minWidth: 0 },
        listLabelText: { ...typographyScale.bodyMedium, color: TOKEN.ink, marginBottom: 2 },
        caption: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, lineHeight: 18 },
        textMuted: { color: TOKEN.inkMuted },
        textDanger: { color: TOKEN.danger },
        toggle: {
          width: 50,
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
          backgroundColor: TOKEN.surface,
          borderWidth: 1,
          borderColor: TOKEN.border,
        },
        toggleThumbOn: { alignSelf: 'flex-end' },
        pickerWrap: { marginBottom: GAP },
        pickerDone: { marginTop: 8, alignItems: 'flex-end' },
        pickerDoneText: { ...typographyScale.button, color: TOKEN.accent },
      }),
    [TOKEN, SHADOW, resolvedMode, upgradeCardBorderColor]
  );

  return (
    <ErrorBoundary contextLabel={ts.title}>
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* ヘッダー: 戻る | 設定 | 空白（右上ボタンなし） */}
      <View style={[styles.headerFixed, { paddingTop: headerPaddingTop }]}>
        <View style={[styles.headerRow, { width: contentW }]}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              void triggerLightImpact();
              safeBack();
            }}
            accessibilityLabel={ts.back}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{ts.title}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPaddingBottom + PAD }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.wrap, { width: contentW }]}>
          {/* アカウント（案A: 1画面でプロフィール・ログイン・進捗同期） */}
          <Pressable
            style={({ pressed }) => [styles.listCard, pressed && styles.listRowPressed]}
            onPress={() => {
              void triggerSelectionHaptic();
              router.push('/login');
            }}
            accessibilityLabel={ts.accountSectionA11y}
            accessibilityRole="button"
          >
            <View style={styles.listCardInner}>
              <View style={styles.listRow}>
                <View style={styles.listIconWrap}>
                  <Ionicons name="person-circle-outline" size={22} color={TOKEN.accent} />
                </View>
                <View style={styles.listLabelWrap}>
                  <Text style={styles.listLabelText}>{ts.accountSection}</Text>
                  <Text style={styles.caption}>{ts.accountSectionSub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
              </View>
            </View>
          </Pressable>

          {/* アップグレード PRO（未購入時のみ表示） */}
          {!isSubscribed && (
            <Pressable
              style={({ pressed }) => [styles.upgradeCard, pressed && { opacity: 0.95 }]}
              onPress={() => {
                void triggerLightImpact();
                router.push('/subscription');
              }}
              accessibilityLabel={ht.upgradeCardA11y}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={upgradeGradient}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.upgradeContent}>
                <View style={styles.upgradeHead}>
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                  <View style={styles.upgradeRecommendBadge}>
                    <Text style={styles.upgradeRecommendText}>{ht.upgradeRecommend}</Text>
                  </View>
                </View>
                <Text style={styles.upgradeTitle}>
                  {ht.upgradeTitle}
                </Text>
                <Text style={styles.upgradeDesc}>
                  {ht.upgradeDesc}
                </Text>
                <View style={styles.upgradeBenefits}>
                  <View style={styles.upgradeBenefitRow}>
                    <Ionicons name="school" size={16} color={TOKEN.accent} />
                    <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit1}</Text>
                  </View>
                  <View style={styles.upgradeBenefitRow}>
                    <Ionicons name="chatbubble-ellipses" size={16} color={TOKEN.accent} />
                    <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit2}</Text>
                  </View>
                  <View style={styles.upgradeBenefitRow}>
                    <Ionicons name="refresh" size={16} color={TOKEN.accent} />
                    <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit3}</Text>
                  </View>
                  <View style={styles.upgradeBenefitRow}>
                    <Ionicons name="bookmark" size={16} color={TOKEN.accent} />
                    <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit4}</Text>
                  </View>
                </View>
                <View style={styles.upgradeButton}>
                  <Ionicons name="diamond" size={18} color="#FFF" />
                  <Text style={styles.upgradeButtonText}>{ht.upgradeCta}</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* 外観 */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{ts.appearance}</Text>
            </View>
            <View style={styles.themeCard}>
            <View style={styles.themeRow}>
              {(['light', 'dark', 'system'] as const).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.themeOption, mode === m && styles.themeOptionActive]}
                    onPress={() => {
                      void triggerSelectionHaptic();
                      setMode(m);
                    }}
                  accessibilityLabel={m === 'light' ? ts.themeLight : m === 'dark' ? ts.themeDark : ts.themeSystem}
                  accessibilityRole="button"
                >
                  <Text style={[styles.themeOptionText, mode === m && styles.themeOptionTextActive]}>
                    {m === 'light' ? ts.themeLight : m === 'dark' ? ts.themeDark : ts.themeSystem}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          </View>

          {/* フィードバック */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{ts.feedback}</Text>
            </View>
            <View style={styles.listCard}>
              <View style={styles.listCardInner}>
                <View style={styles.listRow}>
                  <View style={styles.settingLabelWrap}>
                    <Text style={styles.listLabel}>{ts.sound}</Text>
                    <Text style={styles.settingSubLabel}>{ts.soundSub}</Text>
                  </View>
                  <Pressable
                    style={[styles.toggle, soundEnabled && styles.toggleOn]}
                    onPress={() => handleSetFeedback({ soundEnabled: !soundEnabled })}
                    accessibilityLabel={soundEnabled ? ts.soundOnA11y : ts.soundOffA11y}
                    accessibilityRole="switch"
                  >
                    <View style={[styles.toggleThumb, soundEnabled && styles.toggleThumbOn]} />
                  </Pressable>
                </View>
                <View style={styles.divider} />
                <View style={styles.listRow}>
                  <View style={styles.settingLabelWrap}>
                    <Text style={styles.listLabel}>{ts.haptics}</Text>
                    <Text style={styles.settingSubLabel}>{ts.hapticsSub}</Text>
                  </View>
                  <Pressable
                    style={[styles.toggle, hapticsEnabled && styles.toggleOn]}
                    onPress={() => handleSetFeedback({ hapticsEnabled: !hapticsEnabled })}
                    accessibilityLabel={hapticsEnabled ? ts.hapticsOnA11y : ts.hapticsOffA11y}
                    accessibilityRole="switch"
                  >
                    <View style={[styles.toggleThumb, hapticsEnabled && styles.toggleThumbOn]} />
                  </Pressable>
                </View>
                <View style={styles.divider} />
                <View style={styles.listRow}>
                  <View style={styles.settingLabelWrap}>
                    <Text style={[styles.listLabel, !soundEnabled && styles.textMuted]}>{ts.soundVolume}</Text>
                    <Text style={[styles.settingSubLabel, !soundEnabled && styles.textMuted]}>{ts.soundVolumeSub}</Text>
                    <View style={styles.segmentedRow}>
                      {(
                        [
                          ['low', ts.volLow],
                          ['standard', ts.volStandard],
                          ['high', ts.volHigh],
                        ] as const
                      ).map(([key, label]) => (
                        <Pressable
                          key={key}
                          style={[
                            styles.segmentedOption,
                            soundVolume === key && styles.segmentedOptionActive,
                            !soundEnabled && styles.listRowDisabled,
                          ]}
                          onPress={() => soundEnabled && handleSetFeedback({ soundVolume: key })}
                          disabled={!soundEnabled}
                          accessibilityLabel={ts.pickVol(label)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: soundVolume === key, disabled: !soundEnabled }}
                        >
                          <Text
                            style={[
                              styles.segmentedOptionText,
                              soundVolume === key && styles.segmentedOptionTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.listRow}>
                  <View style={styles.settingLabelWrap}>
                    <Text style={styles.listLabel}>{ttsVoiceTitle}</Text>
                    <Text style={styles.settingSubLabel}>{ttsVoiceSub}</Text>
                    <View style={styles.segmentedRow}>
                      {(
                        [
                          ['female', ttsVoiceFemale],
                          ['male', ttsVoiceMale],
                        ] as const
                      ).map(([key, label]) => (
                        <Pressable
                          key={key}
                          style={[
                            styles.segmentedOption,
                            ttsVoicePreset === key && styles.segmentedOptionActive,
                          ]}
                          onPress={() => handleSetFeedback({ ttsVoicePreset: key })}
                          accessibilityLabel={`${ttsVoiceTitle}: ${label}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: ttsVoicePreset === key }}
                        >
                          <Text
                            style={[
                              styles.segmentedOptionText,
                              ttsVoicePreset === key && styles.segmentedOptionTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* リマインダー通知 */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{ts.reminderSection}</Text>
            </View>
            <View style={styles.listCard}>
              <View style={styles.listCardInner}>
                <View style={styles.listRow}>
                  <Text style={styles.listLabel}>{ts.notification}</Text>
                  <Pressable
                    style={[styles.toggle, reminderOn && styles.toggleOn]}
                    onPress={() => handleToggleReminder(!reminderOn)}
                    accessibilityLabel={reminderOn ? ts.reminderOnA11y : ts.reminderOffA11y}
                    accessibilityRole="switch"
                  >
                    <View style={[styles.toggleThumb, reminderOn && styles.toggleThumbOn]} />
                  </Pressable>
                </View>
                <View style={styles.divider} />
                <Pressable
                  style={[styles.listRow, !reminderOn && styles.listRowDisabled]}
                  onPress={() => reminderOn && setShowPicker(true)}
                  disabled={!reminderOn}
                  accessibilityLabel={ts.reminderTimeA11y(reminderTimeStr, reminderOn)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.listLabel, !reminderOn && styles.textMuted]}>{ts.notificationTime}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.caption, !reminderOn && styles.textMuted]}>{reminderTimeStr}</Text>
                    <Ionicons name="chevron-forward" size={20} color={!reminderOn ? TOKEN.inkFaint : TOKEN.inkMuted} />
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
          {showPicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={reminderDate}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                themeVariant={resolvedMode === 'dark' ? 'dark' : 'light'}
              />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.pickerDone} onPress={() => setShowPicker(false)} accessibilityLabel={ts.done} accessibilityRole="button">
                  <Text style={styles.pickerDoneText}>{ts.done}</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* 学習 */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{ts.studySection}</Text>
            </View>
            <View style={styles.listCard}>
              <View style={styles.listCardInner}>
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void triggerSelectionHaptic();
                    router.push({ pathname: '/onboarding', params: { from: 'settings' } });
                  }}
                  accessibilityLabel={ts.studyPurposeA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="school-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.studyPurpose}</Text>
                  <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void triggerSelectionHaptic();
                    router.push('/daily-goal');
                  }}
                  accessibilityLabel={ts.todayGoalA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="flag-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.todayGoalRow}</Text>
                  <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void triggerSelectionHaptic();
                    router.push('/timezone');
                  }}
                  accessibilityLabel={ts.timezoneA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="globe-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.timezone}</Text>
                  <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void triggerSelectionHaptic();
                    router.push('/display-language');
                  }}
                  accessibilityLabel={ts.displayLanguageA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="language-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.displayLanguageRow}</Text>
                  <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* サブスクリプション */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{ts.subSection}</Text>
            </View>
            <View style={styles.listCard}>
              <View style={styles.listCardInner}>
                {!isSubscribed && (
                  <>
                    <Pressable
                      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                      onPress={handleRestore}
                      disabled={restoring}
                      accessibilityLabel={ts.restorePurchaseA11y(restoring)}
                      accessibilityRole="button"
                      accessibilityState={{ busy: restoring }}
                    >
                      <View style={styles.listIconWrap}>
                        <Ionicons name="refresh-outline" size={22} color={TOKEN.accent} />
                      </View>
                      <Text style={styles.listLabel}>{ts.restorePurchase}</Text>
                      {restoring ? (
                        <ActivityIndicator size="small" color={TOKEN.accent} />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                      )}
                    </Pressable>
                    <View style={styles.divider} />
                  </>
                )}
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => router.push('/subscription')}
                  accessibilityLabel={ts.manageSubscriptionA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="card-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.manageSubscription}</Text>
                  <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* アプリ情報 */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{ts.appInfo}</Text>
            </View>
            <View style={styles.listCard}>
              <View style={styles.listCardInner}>
                <View style={styles.listRow}>
                  <View style={styles.listIconWrap}>
                    <Ionicons name="information-circle-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.version}</Text>
                  <Text style={styles.caption}>{getAppVersion()}</Text>
                </View>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void handleOpenLegal(PRIVACY_POLICY_URL, 'privacy');
                  }}
                  accessibilityLabel={ts.privacyA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.privacy}</Text>
                  <Ionicons name="open-outline" size={18} color={TOKEN.inkFaint} />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void handleOpenLegal(TERMS_URL, 'terms');
                  }}
                  accessibilityLabel={ts.termsA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="document-text-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.terms}</Text>
                  <Ionicons name="open-outline" size={18} color={TOKEN.inkFaint} />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void handleOpenLegal(APPLE_STANDARD_EULA_URL, 'appleEula');
                  }}
                  accessibilityLabel={ts.appleStandardEulaA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="logo-apple" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.appleStandardEula}</Text>
                  <Ionicons name="open-outline" size={18} color={TOKEN.inkFaint} />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                  onPress={() => {
                    void handleOpenLegal(SUPPORT_URL, 'support');
                  }}
                  accessibilityLabel={ts.supportA11y}
                  accessibilityRole="button"
                >
                  <View style={styles.listIconWrap}>
                    <Ionicons name="help-circle-outline" size={22} color={TOKEN.accent} />
                  </View>
                  <Text style={styles.listLabel}>{ts.support}</Text>
                  <Ionicons name="open-outline" size={18} color={TOKEN.inkFaint} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* 学習データ（一番下に配置・誤タップ防止） */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{ts.dataSection}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.listCard, pressed && styles.listRowPressed]}
              onPress={handleReset}
              accessibilityLabel={ts.resetDataA11y}
              accessibilityRole="button"
            >
              <View style={styles.listCardInner}>
                <View style={styles.listRow}>
                  <View style={[styles.listIconWrap, styles.listIconDanger]}>
                    <Ionicons name="trash-outline" size={22} color={TOKEN.danger} />
                  </View>
                  <Text style={[styles.listLabel, styles.textDanger]}>{ts.resetData}</Text>
                  <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                </View>
              </View>
            </Pressable>
          </View>

          {showDebugSection && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHead}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>{ts.devSection}</Text>
              </View>
              <View style={styles.listCard}>
                <View style={styles.listCardInner}>
                  <Pressable
                    style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
                    onPress={() => {
                      const tsMs = Date.now();
                      addBreadcrumb('manual_sentry_test_tap', { ts: tsMs });
                      captureMessage('manual_sentry_test_message', { source: 'settings_screen', ts: tsMs });
                      captureException(new Error('manual_sentry_test_exception'), { source: 'settings_screen', ts: tsMs });
                      Alert.alert(ts.sentryTestSentTitle, ts.sentryTestSentBody);
                    }}
                    accessibilityLabel={ts.sentryTestA11y}
                    accessibilityRole="button"
                  >
                    <View style={styles.listIconWrap}>
                      <Ionicons name="bug-outline" size={22} color={TOKEN.accent} />
                    </View>
                    <Text style={styles.listLabel}>{ts.sentryTest}</Text>
                    <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}
