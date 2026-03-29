/**
 * タブ画面用の共通ヘッダー（ホームと同じ構成: アバター | タイトル+サブ | 設定ボタン）
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { triggerLightImpact } from '../utils/haptics';
import { typographyScale } from '../theme';
import { useProfileStore } from '../store/profileStore';
import { getHomeTabStrings } from '../i18n/appScreens';

const PAD = 24;
const MIN_TOUCH = 44;
const CONTENT_W = 400; // 呼び出し側で上書きするため style で渡す

export type TabHeaderTheme = {
  headerBg: string;
  headerBorderColor: string;
  avatarBg: string;
  avatarBorderColor: string;
  avatarIconColor: string;
  titleColor: string;
  subtitleColor: string;
  settingsCircleBg: string;
  settingsCircleBorder: string;
  settingsIconColor: string;
};

export type TabHeaderShadow = {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
};

type TabHeaderProps = {
  title: string;
  subtitle: string;
  paddingTop: number;
  contentWidth: number;
  theme: TabHeaderTheme;
  shadow: TabHeaderShadow;
  /** 中央（タイトル・サブ）タップ時のコールバック。未指定時はタップ不可 */
  onPressCenter?: () => void;
  /** 右上ボタンのカスタム動作。未指定時は設定画面へ遷移 */
  onPressRight?: () => void;
  /** 右上ボタンのアクセシビリティラベル（onPressRight 指定時に推奨） */
  rightButtonA11y?: string;
  /** 右上ボタンのアイコン名。未指定時は settings-outline */
  rightIconName?: React.ComponentProps<typeof Ionicons>['name'];
};

export function TabHeader({
  title,
  subtitle,
  paddingTop,
  contentWidth,
  theme,
  shadow,
  onPressCenter,
  onPressRight,
  rightButtonA11y,
  rightIconName,
}: TabHeaderProps) {
  const router = useRouter();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const ht = useMemo(
    () => getHomeTabStrings(displayLanguage),
    [displayLanguage]
  );
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        headerFixed: {
          paddingHorizontal: PAD,
          alignItems: 'center' as const,
          backgroundColor: theme.headerBg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.headerBorderColor,
        },
        headerInner: {
          width: contentWidth,
          flexDirection: 'row' as const,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 14,
        },
        headerProfile: { minHeight: MIN_TOUCH, justifyContent: 'center' as const },
        headerAvatar: {
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: theme.avatarBg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          borderWidth: 2,
          borderColor: theme.avatarBorderColor,
        },
        headerCenter: { flex: 1, marginHorizontal: 14, alignItems: 'flex-start' as const, justifyContent: 'center' as const },
        headerTitle: { ...typographyScale.header, color: theme.titleColor, letterSpacing: -0.5, marginBottom: 2, textAlign: 'left' as const },
        headerSub: { ...typographyScale.caption, color: theme.subtitleColor, textAlign: 'left' as const },
        headerSettingsCircle: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: theme.settingsCircleBg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          borderWidth: 1,
          borderColor: theme.settingsCircleBorder,
          ...shadow,
        },
      }),
    [theme, shadow, contentWidth]
  );

  return (
    <View style={[styles.headerFixed, { paddingTop }]}>
      <View style={styles.headerInner}>
        <Pressable
          style={({ pressed }) => [styles.headerProfile, pressed && { opacity: 0.8 }]}
          onPress={() => {
            void triggerLightImpact();
            router.push('/profile-card');
          }}
          accessibilityLabel={ht.profileCardA11y}
          accessibilityRole="button"
        >
          <View style={styles.headerAvatar}>
            <Ionicons name="person" size={24} color={theme.avatarIconColor} />
          </View>
        </Pressable>
        {onPressCenter ? (
          <Pressable style={styles.headerCenter} onPress={onPressCenter} accessibilityLabel={`${title}。${subtitle}`} accessibilityRole="button">
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>{subtitle}</Text>
          </Pressable>
        ) : (
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>{subtitle}</Text>
          </View>
        )}
        <Pressable
          onPress={() => {
            void triggerLightImpact();
            if (onPressRight) {
              onPressRight();
            } else {
              router.push('/settings');
            }
          }}
          style={({ pressed }) => [styles.headerSettingsCircle, pressed && { opacity: 0.85 }]}
          accessibilityLabel={rightButtonA11y ?? ht.settingsA11y}
          accessibilityRole="button"
        >
          <Ionicons name={rightIconName ?? 'settings-outline'} size={22} color={theme.settingsIconColor} />
        </Pressable>
      </View>
    </View>
  );
}
