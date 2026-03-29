/**
 * 開発時のみ console に出力。本番ではログを出さず、必要ならモニタリング送信に回す。
 */
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
    // 本番ではここで Sentry 等に送信可能
  },
};
