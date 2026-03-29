import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typographyScale } from '../theme';
import { getSettingsFlowTokens } from '../theme/settingsFlowTokens';
import { getCommonStrings } from '../i18n/common';
import { useProfileStore } from '../store/profileStore';

type Props = {
  /** エラー説明（未指定時は既定文言） */
  message?: string;
  /** 再試行ボタンのコールバック */
  onRetry: () => void;
  /** 再試行中なら true（ボタン無効化は呼び出し側で行う想定） */
  loading?: boolean;
};

/**
 * 単語・文法タブなどで共通利用する「ネットワークエラー＋再試行」ブロック。
 */
export function NetworkErrorBlock({ message, onRetry, loading = false }: Props) {
  const { colors, resolvedMode } = useTheme();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const t = React.useMemo(
    () => getCommonStrings(displayLanguage),
    [displayLanguage]
  );
  const displayMessage = message ?? t.networkErrorMessage;
  const TOKEN = React.useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        block: { alignItems: 'center', marginBottom: 24 },
        icon: { marginBottom: 8 },
        text: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, marginBottom: 12, textAlign: 'center' as const },
        btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, backgroundColor: TOKEN.accent },
        btnText: { ...typographyScale.button, color: '#FFF' },
      }),
    [TOKEN]
  );
  const dangerColor = colors.danger ?? '#EF4444';

  return (
    <View style={styles.block} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={24} color={dangerColor} style={styles.icon} />
      <Text style={styles.text}>{displayMessage}</Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
        onPress={onRetry}
        disabled={loading}
        accessibilityLabel={t.retry}
        accessibilityRole="button"
      >
        <Text style={styles.btnText}>{t.retry}</Text>
      </Pressable>
    </View>
  );
}
