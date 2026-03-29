import { useMemo } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';
import { triggerSelectionHaptic } from '@/src/utils/haptics';
import { typographyScale } from '@/src/theme';
import { useProfileStore } from '@/src/store/profileStore';
import { getTabBarStrings } from '@/src/i18n/appScreens';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { colors } = useTheme();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const tb = useMemo(
    () => getTabBarStrings(displayLanguage),
    [displayLanguage]
  );

  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const isPuzzlePlay = path.includes('vocabulary/puzzle/play');
  const isGrammarQuiz = path.includes('grammar/quiz');

  const TAB_BAR_HEIGHT = 56 + insets.bottom;

  const tabBarBgStyle = useMemo(
    () => [StyleSheet.absoluteFill, { backgroundColor: colors.surface }],
    [colors.surface]
  );

  // タブ遷移は標準挙動を維持し、触覚フィードバックのみ付与する
  const onTabPress = () => () => {
    void triggerSelectionHaptic();
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBackground: () => <View style={tabBarBgStyle} />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: TAB_BAR_HEIGHT,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          paddingHorizontal: 4,
          display: isPuzzlePlay || isGrammarQuiz ? 'none' : 'flex',
        },
        tabBarLabelStyle: { fontSize: typographyScale.badge.fontSize, fontWeight: typographyScale.badge.fontWeight },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: onTabPress() }}
        options={{
          title: tb.home,
          tabBarAccessibilityLabel: tb.home,
          // 別タブへ移動したらルートへ戻し、復帰時は初期状態にする
          popToTopOnBlur: true,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        listeners={{ tabPress: onTabPress() }}
        options={{
          title: tb.vocabulary,
          tabBarAccessibilityLabel: tb.vocabulary,
          popToTopOnBlur: true,
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grammar"
        listeners={{ tabPress: onTabPress() }}
        options={{
          title: tb.grammar,
          tabBarAccessibilityLabel: tb.grammar,
          popToTopOnBlur: true,
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        listeners={{ tabPress: onTabPress() }}
        options={{
          title: tb.saved,
          tabBarAccessibilityLabel: tb.savedA11y,
          popToTopOnBlur: true,
          tabBarIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        listeners={{ tabPress: onTabPress() }}
        options={{
          title: tb.chat,
          tabBarAccessibilityLabel: tb.chat,
          popToTopOnBlur: true,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
