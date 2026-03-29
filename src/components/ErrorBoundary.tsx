import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ThemeContext } from '../contexts/ThemeContext';
import { spacing, radius, getTypography, getGlassCardStyle } from '../theme';
import { logger } from '../utils/logger';
import { captureException } from '../utils/monitoring';
import { useProfileStore } from '../store/profileStore';
import { getCommonStrings } from '../i18n/common';

type Props = {
  children: ReactNode;
  /** エラー時に表示するラベル（例: 「文法」） */
  contextLabel?: string;
  /** フォールバック（未指定時はデフォルトUI） */
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * 子コンポーネントで未捕捉のエラーが起きたときにフォールバックを表示し、
 * 「再読み込み」でマウントし直せるようにする。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.warn('[ErrorBoundary]', error?.message, errorInfo?.componentStack);
    captureException(error, {
      boundary: this.props.contextLabel ?? 'unknown',
      componentStack: errorInfo?.componentStack ?? '',
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const uiLocale = useProfileStore.getState().displayLanguage;
      const common = getCommonStrings(uiLocale);
      const label = this.props.contextLabel ?? common.errorDefaultScreen;
      const title = common.errorWhileLoading(label);
      const reloadLabel = common.reload;
      return (
        <ThemeContext.Consumer>
          {(ctx) => {
            if (!ctx) {
              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
                  <Text style={{ fontSize: 18, marginBottom: spacing.sm }}>{title}</Text>
                  <Pressable onPress={this.handleRetry} accessibilityLabel={reloadLabel} accessibilityRole="button">
                    <Text style={{ fontSize: 17, fontWeight: '600' }}>{reloadLabel}</Text>
                  </Pressable>
                </View>
              );
            }
            const { colors, resolvedMode } = ctx;
            const typography = getTypography(colors);
            const glassPanel = getGlassCardStyle(colors, resolvedMode);
            const styles = StyleSheet.create({
              container: {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: spacing.xl,
                backgroundColor: colors.background,
              },
              glassPanel: {
                ...glassPanel,
                borderRadius: radius.xl,
                padding: spacing.xl,
                maxWidth: '100%',
              },
              title: {
                fontSize: 18,
                fontWeight: '700',
                color: colors.text,
                marginBottom: spacing.sm,
                textAlign: 'center',
              },
              message: {
                ...typography.bodySmall,
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: spacing.xl,
              },
              button: {
                backgroundColor: colors.primary,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xl,
                borderRadius: radius.xl,
              },
              buttonPressed: { opacity: 0.9 },
              buttonText: { fontSize: 17, fontWeight: '600', color: colors.onPrimary },
            });
            return (
              <View style={styles.container} accessibilityRole="alert">
                <View style={styles.glassPanel}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.message} numberOfLines={3}>
                    {this.state.error!.message}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                    onPress={this.handleRetry}
                    accessibilityLabel={reloadLabel}
                    accessibilityRole="button"
                  >
                    <Text style={styles.buttonText}>{reloadLabel}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        </ThemeContext.Consumer>
      );
    }
    return this.props.children;
  }
}
