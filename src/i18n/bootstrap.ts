/**
 * 起動ブートストラップの進捗ラベル（AppLocale）
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

export type BootstrapLocale = AppLocale;

export type BootstrapStrings = {
  /** 初回フレーム（プロフィール読込前） */
  starting: string;
  preparingDb: string;
  loadingAuth: string;
  loadingProfile: string;
  loadingFeedback: string;
  loadingWordsGrammar: string;
  contentReady: string;
  checkingSubscription: string;
  preparingChat: string;
  loadingOnboarding: string;
  done: string;
};

const bootstrapJa: BootstrapStrings = {
  starting: '起動しています…',
  preparingDb: 'データベースを準備しています…',
  loadingAuth: '認証情報を読み込み中…',
  loadingProfile: 'プロフィールを読み込み中…',
  loadingFeedback: 'フィードバック設定を読み込み中…',
  loadingWordsGrammar: '単語・文法データを取得しています…',
  contentReady: '学習コンテンツを反映しました',
  checkingSubscription: '課金・サブスクリプションを確認しています…',
  preparingChat: 'チャットの準備をしています…',
  loadingOnboarding: 'オンボーディング状態を読み込み中…',
  done: '完了',
};

const bootstrapEn: BootstrapStrings = {
  starting: 'Starting…',
  preparingDb: 'Preparing database…',
  loadingAuth: 'Loading sign-in…',
  loadingProfile: 'Loading profile…',
  loadingFeedback: 'Loading feedback settings…',
  loadingWordsGrammar: 'Loading vocabulary & grammar…',
  contentReady: 'Learning content ready',
  checkingSubscription: 'Checking subscription…',
  preparingChat: 'Preparing chat…',
  loadingOnboarding: 'Loading onboarding…',
  done: 'Done',
};

const bootstrapMaps: Record<AppLocale, BootstrapStrings> = {
  ja: bootstrapJa,
  en: bootstrapEn,
  zh: bootstrapEn,
  vi: bootstrapEn,
  es: bootstrapEn,
  id: bootstrapEn,
  th: bootstrapEn,
};

export function getBootstrapStrings(locale: BootstrapLocale = 'ja'): BootstrapStrings {
  return bootstrapMaps[locale] ?? bootstrapMaps[FALLBACK_APP_LOCALE];
}

/** 進捗バーを隠す初期ラベルか（起動直後は 0% に見えるため） */
export function isBootstrapStartingLabel(label: string): boolean {
  const t = label.trimStart();
  return t.startsWith('起動しています') || t.startsWith('Starting');
}
