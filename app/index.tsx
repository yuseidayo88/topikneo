import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { getDb, setDatabaseTimezone } from '@/src/db/database';
import { getDeviceTimezone } from '@/src/utils/timezone';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getCommonStrings } from '@/src/i18n/common';
import { useProfileStore } from '@/src/store/profileStore';

export default function IndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const load = useOnboardingStore((s) => s.load);
  const isCompleted = useOnboardingStore((s) => s.isCompleted);
  const { headerPaddingTop } = useSafeArea();
  /** ブートストラップで先に `load()` 済みなら二重ローディングを出さない */
  const [ready, setReady] = useState(() => useOnboardingStore.getState().hydrated);
  const [loadError, setLoadError] = useState<string | null>(null);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const t = useMemo(() => getCommonStrings(displayLanguage), [displayLanguage]);

  const runLoad = useCallback(async () => {
    setLoadError(null);
    try {
      getDb();
      await load();
      const tz = useOnboardingStore.getState().userTimezone ?? getDeviceTimezone();
      setDatabaseTimezone(tz);
      setReady(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : t.onboardingLoadError;
      setLoadError(message);
    }
  }, [load, t.onboardingLoadError]);

  useEffect(() => {
    if (ready) {
      const tz = useOnboardingStore.getState().userTimezone ?? getDeviceTimezone();
      setDatabaseTimezone(tz);
      return;
    }
    void runLoad();
  }, [ready, runLoad]);

  useEffect(() => {
    if (!ready) return;
    if (isCompleted) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [ready, isCompleted, router]);

  const handleContinue = useCallback(() => {
    const tz = useOnboardingStore.getState().userTimezone ?? getDeviceTimezone();
    setDatabaseTimezone(tz);
    router.replace('/(tabs)');
  }, [router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        },
        loadingWrap: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        appTitle: {
          fontSize: 26,
          fontWeight: '700',
          letterSpacing: 1.2,
          color: colors.text,
        },
        spinner: { marginTop: 16 },
        errorText: { marginTop: 12, color: colors.danger ?? '#EF4444', textAlign: 'center' as const, maxWidth: 320 },
        retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.primary },
        retryBtnText: { color: '#FFF', fontWeight: '600' },
        continueBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
        continueBtnText: { color: colors.primary, fontSize: 14 },
      }),
    [colors]
  );

  if (loadError) {
    return (
      <View style={[styles.container, { paddingTop: headerPaddingTop, backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <Text style={styles.appTitle}>TOPIK NEO</Text>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.9 }]} onPress={runLoad} accessibilityLabel={t.retry} accessibilityRole="button">
            <Text style={styles.retryBtnText}>{t.retry}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.8 }]} onPress={handleContinue} accessibilityLabel={t.continueToApp} accessibilityRole="button">
            <Text style={styles.continueBtnText}>{t.continueToApp}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.container, { paddingTop: headerPaddingTop, backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <Text style={styles.appTitle}>TOPIK NEO</Text>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        </View>
      </View>
    );
  }

  /** ルーティング直前の空フレーム（ブートストラップ済みのときはスピナーを出さない） */
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
