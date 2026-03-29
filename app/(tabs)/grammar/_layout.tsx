import { useEffect, useMemo, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { HeaderBackButton } from '@/src/components/CircularHeaderButton';
import { GlassHeaderBackground } from '@/src/components/GlassHeaderBackground';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useProfileStore } from '@/src/store/profileStore';
import { getTabBarStrings } from '@/src/i18n/appScreens';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';

export default function GrammarLayout() {
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
    const grammarIndex = hasTabsGroup ? 1 : 0;
    const inGrammar = seg[grammarIndex] === 'grammar';
    const isGrammarRoot = inGrammar && seg.length === grammarIndex + 1;
    if (inGrammar && !isGrammarRoot) {
      router.replace('/(tabs)/grammar');
    }
  }, [isFocused, router]);

  return (
    <ErrorBoundary contextLabel={tb.grammar}>
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
        name="quiz/[lessonId]"
        options={{
          headerShown: false,
          title: '',
          header: () => null,
          headerBackground: () => null,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </Stack>
    </ErrorBoundary>
  );
}
