import { useEffect, useMemo, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { useProfileStore } from '@/src/store/profileStore';
import { getTabBarStrings } from '@/src/i18n/appScreens';
import { HeaderBackButton } from '@/src/components/CircularHeaderButton';
import { GlassHeaderBackground } from '@/src/components/GlassHeaderBackground';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';

export default function VocabularyLayout() {
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const tb = useMemo(() => getTabBarStrings(displayLanguage), [displayLanguage]);
  const router = useRouter();
  const segments = useSegments();
  const isFocused = useIsFocused();
  const wasUnfocusedRef = useRef(false);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const { colors } = useTheme();
  const { cardBorder } = useThemeStyles();
  const headerStyle = {
    ...cardBorder,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'transparent',
  };

  useEffect(() => {
    if (!isFocused) {
      wasUnfocusedRef.current = true;
      return;
    }
    if (!wasUnfocusedRef.current) return;
    wasUnfocusedRef.current = false;
    const seg = segmentsRef.current as string[];
    const hasTabsGroup = seg[0] === '(tabs)';
    const vocabIndex = hasTabsGroup ? 1 : 0;
    const inVocabulary = seg[vocabIndex] === 'vocabulary';
    const isVocabularyRoot = inVocabulary && seg.length === vocabIndex + 1;
    if (inVocabulary && !isVocabularyRoot) {
      router.replace('/(tabs)/vocabulary');
    }
  }, [isFocused, router]);

  return (
    <ErrorBoundary contextLabel={tb.vocabulary}>
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBackground: () => <GlassHeaderBackground />,
        headerStyle,
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: colors.text },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: () => <HeaderBackButton />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[level]"
        options={{
          headerShown: false,
          title: '',
          header: () => null,
          headerBackground: () => null,
        }}
      />
      <Stack.Screen
        name="[level]/[lessonId]/index"
        options={{ headerShown: false, title: '', header: () => null, headerBackground: () => null }}
      />
      <Stack.Screen
        name="puzzle"
        options={{ headerShown: false, title: '', header: () => null, headerBackground: () => null }}
      />
      <Stack.Screen
        name="puzzle/play"
        options={{
          headerShown: false,
          title: '',
          headerBackVisible: false,
          headerLeft: () => null,
          headerTitle: () => null,
          headerRight: () => null,
          header: () => null,
          headerBackground: () => null,
          gestureEnabled: false,
        }}
      />
    </Stack>
    </ErrorBoundary>
  );
}
