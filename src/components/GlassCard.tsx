import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle, type AccessibilityRole } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getCardBorder, getGlassCardBackground, getGlassCardBorder, getGlassCardShadow, CARD_RADIUS, PRESS_SCALE, SOFT_WHITE } from '../theme';

/** Spring: friction 弱めで自然な弾み */
const PRESS_SPRING = { friction: 6, tension: 300 };

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  inList?: boolean;
  /** 半透明ガラス質感（グラデーション背景に浮かぶ）。false で不透明 */
  translucent?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
};

/** 半透明ガラス質感のカード（Blur なし・クラッシュ回避）。translucent=false で従来の不透明 */
export function GlassCard({ children, style, contentStyle, inList, translucent = true, onPress, accessibilityLabel, accessibilityRole }: Props) {
  const { colors, resolvedMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const mode = resolvedMode === 'dark' ? 'dark' : 'light';
  const cardBorder = translucent ? getGlassCardBorder(mode) : getCardBorder(mode);
  const cardShadow = getGlassCardShadow(mode);
  const backgroundColor = translucent ? getGlassCardBackground(mode) : (colors?.card ?? SOFT_WHITE);

  const borderRadius = (style && typeof style === 'object' && 'borderRadius' in style && typeof (style as { borderRadius?: number }).borderRadius === 'number')
    ? (style as { borderRadius: number }).borderRadius
    : CARD_RADIUS;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: PRESS_SCALE, useNativeDriver: true, ...PRESS_SPRING }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, ...PRESS_SPRING }).start();

  const card = (
    <View
      style={[
        styles.outer,
        { backgroundColor, borderRadius },
        cardBorder,
        cardShadow,
        style,
      ]}
      pointerEvents="box-none"
      {...(!onPress && { accessibilityLabel: accessibilityLabel, accessibilityRole: accessibilityRole })}
    >
      <View style={[styles.inner, contentStyle]} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressableWrap}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? 'button'}
      >
        <Animated.View style={[styles.animatedWrap, { transform: [{ scale: scaleAnim }] }]}>
          {card}
        </Animated.View>
      </Pressable>
    );
  }
  return card;
}

const styles = StyleSheet.create({
  pressableWrap: { alignSelf: 'stretch' },
  animatedWrap: { alignSelf: 'stretch' },
  outer: {
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
  },
  inner: { flex: 1 },
});
