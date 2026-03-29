import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { getSettingsFlowTokens } from '@/src/theme/settingsFlowTokens';
import { typographyScale } from '@/src/theme';

type Props = {
  /** アイコン名（Ionicons） */
  icon?: keyof typeof Ionicons.glyphMap;
  /** アイコンサイズ（デフォルト 56） */
  iconSize?: number;
  /** 見出し */
  title: string;
  /** 補足文（省略可） */
  subtitle?: string;
  /** ボタンラベル */
  buttonLabel: string;
  /** ボタン onPress */
  onPress: () => void;
  /** アクセシビリティ用ボタンラベル（省略時は buttonLabel） */
  accessibilityLabel?: string;
};

/**
 * 空状態の共通ブロック（アイコン・見出し・補足・1ボタン）。
 * 保存タブ・復習クイズの空状態などで利用。
 */
export function EmptyStateBlock({
  icon = 'folder-open-outline',
  iconSize = 56,
  title,
  subtitle,
  buttonLabel,
  onPress,
  accessibilityLabel,
}: Props) {
  const { resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const TOKEN = React.useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        block: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
        iconWrap: { marginBottom: 16 },
        title: {
          ...typographyScale.header,
          fontSize: 18,
          color: TOKEN.ink,
          marginBottom: 8,
          textAlign: 'center',
        },
        subtitle: {
          ...typographyScale.bodySmall,
          color: TOKEN.inkMuted,
          marginBottom: 24,
          textAlign: 'center',
        },
        button: {
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 14,
          backgroundColor: TOKEN.accent,
          minHeight: 44,
          justifyContent: 'center',
          ...SHADOW,
        },
        buttonText: { ...typographyScale.button, color: '#FFF' },
      }),
    [TOKEN, SHADOW]
  );

  return (
    <View style={styles.block}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={iconSize} color={TOKEN.inkFaint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? buttonLabel}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}
