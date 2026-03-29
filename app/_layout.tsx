import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AppState, View, Text, ActivityIndicator, Image } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { AppLoadErrorBanner } from '@/src/components/AppLoadErrorBanner';
import { GlassHeaderBackground } from '@/src/components/GlassHeaderBackground';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { subscribeAuthStore } from '@/src/store/authStore';
import {
  runAppBootstrapOnce,
  removeAppBootstrapProgressListener,
  BOOTSTRAP_TIMEOUT_MS,
  type BootstrapProgressPayload,
} from '@/src/utils/appBootstrap';
import { setDatabaseSyncHandler, setLocalProgressBumpHandler } from '@/src/db/database';
import { logger } from '@/src/utils/logger';
import { useProfileStore } from '@/src/store/profileStore';
import { getNavigationTitles } from '@/src/i18n/appScreens';
import { isBootstrapStartingLabel } from '@/src/i18n/bootstrap';
import { getCommonStrings } from '@/src/i18n/common';
import { applyReminder } from '@/src/utils/reminder';
import { addBreadcrumb } from '@/src/utils/monitoring';
import { preloadGeneratedWordSpeechManifest } from '@/src/utils/generatedWordSpeech';

/** ネイティブスプラッシュの自動消去を止め、ブートストラップ完了まで表示を制御する */
void SplashScreen.preventAutoHideAsync().catch(() => {});

/** アイコンと同系色（深いネイビー #001f5c）。スクアイコン＋白の立体Nマークのブランドに合わせる */
const SPLASH_BG = '#001f5c';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  void import('@sentry/react-native')
    .then((Sentry) => {
      const appVersion = Constants.expoConfig?.version ?? 'unknown';
      const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? 'dev';
      Sentry.init({
        dsn: sentryDsn,
        debug: typeof __DEV__ !== 'undefined' && __DEV__,
        environment: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production',
        release: `kla@${appVersion}`,
        dist: `${buildNumber}`,
        tracesSampleRate: typeof __DEV__ !== 'undefined' && __DEV__ ? 1.0 : 0.2,
      });
    })
    .catch(() => {
      logger.warn('[Sentry] init skipped');
    });
}

function StatusBarStyle() {
  const { resolvedMode } = useTheme();
  return <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />;
}

function ThemedStack() {
  const { colors, resolvedMode } = useTheme();
  const { cardBorder } = useThemeStyles();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const reminderLocale = displayLanguage;
  const navTitles = useMemo(
    () => getNavigationTitles(displayLanguage),
    [displayLanguage]
  );

  /** 通知文言をストリーク等に合わせて再スケジュール（Duolingo 風の鮮度維持） */
  useEffect(() => {
    void applyReminder(reminderLocale);
  }, [reminderLocale]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      addBreadcrumb('app_state_change', { state });
      if (state !== 'active') return;
      const lang = useProfileStore.getState().displayLanguage;
      void applyReminder(lang);
      void preloadGeneratedWordSpeechManifest();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void preloadGeneratedWordSpeechManifest();
  }, []);
  const headerStyle = {
    ...cardBorder,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'transparent',
  };
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTransparent: true,
        headerBackground: () => <GlassHeaderBackground />,
        headerStyle,
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: colors.text },
        headerTitleAlign: 'left',
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding/index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="quiz/word/[lessonId]"
        options={{
          headerShown: false,
          title: navTitles.quizWord,
          headerBackVisible: false,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="quiz/review"
        options={{
          headerShown: false,
          title: navTitles.quizReview,
          headerBackVisible: false,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="quiz/saved"
        options={{
          headerShown: false,
          title: navTitles.quizSaved,
          headerBackVisible: false,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="quiz/result/[lessonId]"
        options={{
          headerShown: false,
          title: '',
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen name="settings" />
      <Stack.Screen name="login" options={{ title: navTitles.login, headerShown: false }} />
      <Stack.Screen name="profile-card" options={{ presentation: 'modal' }} />
      <Stack.Screen name="display-language" />
      <Stack.Screen name="daily-goal" />
      <Stack.Screen name="timezone" />
      <Stack.Screen
        name="subscription"
        options={{ presentation: 'modal', title: navTitles.subscription }}
      />
    </Stack>
  );
}

/** プロフィール未確定時は空。起動直後ラベルでは 0% 固定に見えてしまうのでバーと％は出さない */
function shouldShowBootstrapProgress(label: string): boolean {
  if (!label.trim()) return false;
  return !isBootstrapStartingLabel(label);
}

/** ブートストラップ中のローディング（ネイティブはマウント直後にスプラッシュを消してこちらを表示） */
function BootstrapLoadingScreen({ progress }: { progress: BootstrapProgressPayload }) {
  const pct = Math.round(progress.ratio * 100);
  const showProgress = shouldShowBootstrapProgress(progress.label);
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: SPLASH_BG,
        paddingHorizontal: 32,
      }}
    >
      <StatusBar style="light" />
      <Image
        source={require('../assets/splash-icon.png')}
        style={{ width: 120, height: 120, resizeMode: 'contain' }}
        accessibilityIgnoresInvertColors
      />
      <Text
        style={{
          color: '#f8fafc',
          fontSize: 22,
          fontWeight: '700',
          letterSpacing: 1,
          marginTop: 20,
        }}
      >
        TOPIK NEO
      </Text>
      <ActivityIndicator style={{ marginTop: 20 }} color="#93c5fd" size="large" />
      <View style={{ minHeight: 40, marginTop: 14, justifyContent: 'center', width: '100%' }}>
        {progress.label.trim() ? (
          <Text
            style={{ color: '#cbd5e1', fontSize: 13, textAlign: 'center' }}
            numberOfLines={2}
            accessibilityLiveRegion="polite"
          >
            {progress.label}
          </Text>
        ) : null}
      </View>
      {showProgress ? (
        <>
          <View
            style={{
              marginTop: 18,
              width: '100%',
              maxWidth: 260,
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.18)',
              overflow: 'hidden',
            }}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: pct }}
          >
            <View
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 3,
                backgroundColor: '#e0e7ff',
              }}
            />
          </View>
          <Text style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>{pct}%</Text>
        </>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const appRootErrorContext = useMemo(
    () => getCommonStrings(displayLanguage).appRootErrorContext,
    [displayLanguage]
  );
  const [bootstrapReady, setBootstrapReady] = useState(false);
  /** 文言はプロフィール読込後のブートストラップからのみ出す（読込前はデバイス言語になり英語設定でも日本語が出るのを防ぐ） */
  const [progress, setProgress] = useState<BootstrapProgressPayload>({ ratio: 0, label: '' });

  /**
   * OS スプラッシュの下にローディング UI を用意した直後にスプラッシュだけ消す。
   * ブート完了までここでぐるぐる＋進捗バーを表示する（ブート完了後はメインへ切り替え）。
   */
  useLayoutEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  /** 認証・プロフィール・単語・文法・課金・チャットキャッシュを揃えてからメイン UI を表示 */
  useEffect(() => {
    if (__DEV__ && !process.env.EXPO_PUBLIC_SUPABASE_URL) {
      logger.warn('[KLA] EXPO_PUBLIC_SUPABASE_URL が未設定です。単語・文法は取得できません。.env.example を .env にコピーして設定してください。');
    }
    const unsubAuth = subscribeAuthStore();
    const onProgress = (p: BootstrapProgressPayload) => {
      setProgress(p);
    };

    void (async () => {
      try {
        await Promise.race([
          runAppBootstrapOnce(onProgress),
          new Promise<void>((resolve) => setTimeout(resolve, BOOTSTRAP_TIMEOUT_MS)),
        ]);
      } catch (e) {
        logger.warn('[bootstrap] failed', e);
      } finally {
        setBootstrapReady(true);
      }
    })();

    return () => {
      removeAppBootstrapProgressListener(onProgress);
      setDatabaseSyncHandler(null);
      setLocalProgressBumpHandler(null);
      unsubAuth();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {!bootstrapReady ? (
          <BootstrapLoadingScreen progress={progress} />
        ) : (
          <>
            <StatusBarStyle />
            <ErrorBoundary contextLabel={appRootErrorContext}>
              <View style={{ flex: 1 }}>
                <OfflineBanner />
                <AppLoadErrorBanner />
                <ThemedStack />
              </View>
            </ErrorBoundary>
          </>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
