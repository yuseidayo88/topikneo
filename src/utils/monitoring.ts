import { logger } from './logger';

type MonitorContext = Record<string, unknown>;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const hasSentryDsn = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

const MANUAL_SENTRY_TEST_MESSAGE = 'manual_sentry_test_exception';

function isManualSentryTestException(error: unknown): boolean {
  return error instanceof Error && error.message === MANUAL_SENTRY_TEST_MESSAGE;
}

function toErrorLogValue(error: unknown): unknown {
  if (error instanceof Error) return error.message;
  return error;
}

async function loadSentry() {
  if (!hasSentryDsn) return null;
  try {
    return await import('@sentry/react-native');
  } catch (error) {
    logger.warn('[monitoring] Sentry import failed', error);
    return null;
  }
}

/**
 * 監視基盤の共通ラッパー。
 * Sentry DSN がある場合は送信し、開発中は logger にも出す。
 * 「Sentry テスト送信」用の意図的な例外は ERROR 扱いにしない（Metro の赤ログを避ける）。
 */
export function captureException(error: unknown, context?: MonitorContext): void {
  if (isDev) {
    if (isManualSentryTestException(error)) {
      logger.log('[monitoring][exception](Sentryテスト・意図的)', toErrorLogValue(error), context ?? {});
    } else {
      logger.error('[monitoring][exception]', error, context ?? {});
    }
  }
  if (!hasSentryDsn) return;
  void loadSentry().then((Sentry) => {
    Sentry?.captureException(error, {
      extra: context ?? {},
    });
  });
}

export function captureMessage(message: string, context?: MonitorContext): void {
  if (isDev) {
    logger.log('[monitoring][message]', message, context ?? {});
  }
  if (!hasSentryDsn) return;
  void loadSentry().then((Sentry) => {
    Sentry?.captureMessage(message, {
      level: 'info',
      extra: context ?? {},
    });
  });
}

export function addBreadcrumb(message: string, context?: MonitorContext): void {
  if (isDev) {
    logger.log('[monitoring][breadcrumb]', message, context ?? {});
  }
  if (!hasSentryDsn) return;
  void loadSentry().then((Sentry) => {
    Sentry?.addBreadcrumb({
      category: 'app',
      message,
      level: 'info',
      data: context ?? {},
    });
  });
}
