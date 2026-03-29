import { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCardBorder, getCardShadowSubtle, PRESS_SCALE } from '../theme';
import { useProfileStore } from '../store/profileStore';
import { getCommonStrings } from '../i18n/common';

const SIZE = 40;
const PRESS_SPRING = { friction: 6, tension: 300 };

type Props = {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  style?: ViewStyle;
};

/** ソリッド質感の丸型ヘッダーボタン（不透明・控えめな影・spring scale） */
export function CircularHeaderButton({ onPress, icon, accessibilityLabel, style }: Props) {
  const { colors, resolvedMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cardBorder = getCardBorder(resolvedMode);
  const cardShadow = getCardShadowSubtle(resolvedMode);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: PRESS_SCALE, useNativeDriver: true, ...PRESS_SPRING }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, ...PRESS_SPRING }).start();

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} accessibilityLabel={accessibilityLabel} accessibilityRole="button">
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: colors.card },
          cardBorder,
          cardShadow,
          style,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconWrap} pointerEvents="none">
          <Ionicons name={icon} size={22} color={colors.text} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function HeaderBackButton() {
  const router = useRouter();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const backLabel = useMemo(
    () => getCommonStrings(displayLanguage).back,
    [displayLanguage]
  );
  return (
    <CircularHeaderButton onPress={() => router.back()} icon="arrow-back" accessibilityLabel={backLabel} />
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
