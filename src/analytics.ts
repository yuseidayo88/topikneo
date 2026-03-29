/**
 * 分析用スタブ。本番で Firebase Analytics 等を入れる場合は、
 * ここで logEvent を実装し、サブスク・オンボーディング等の trackXxx から呼ばれる。
 */
export function logEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // 開発時はコンソールでイベント名・パラメータを確認（本番 SDK 未接続時の可視化）
    if (typeof console !== 'undefined' && console.log) {
      console.log('[analytics]', name, params ?? {});
    }
    return;
  }
  // 本番で SDK 連携する例:
  // import { getAnalytics, logEvent as firebaseLogEvent } from 'firebase/analytics';
  // firebaseLogEvent(getAnalytics(), name, params);
  void name;
  void params;
}
