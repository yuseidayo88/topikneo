/**
 * オンボーディング画面の文言。多言語対応用。
 */
import type { StudyPurpose, HowFound, KoreanLevel } from '@/src/store/onboardingStore';
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

export type OnboardingLocale = AppLocale;

export type OnboardingStrings = {
  welcomeTitle: string;
  welcomeBody: string;
  welcomeSubtitle: string;
  welcomeContextSetting: string;
  progressLabel: (current: number, total: number) => string;
  progressStepDone: string;
  progressStepPending: string;
  buttonNext: string;
  buttonStart: string;
  buttonSave: string;
  doneTitle: string;
  doneBody: string;
  errorTitle: string;
  errorRetry: string;
  errorNetwork: string;
  errorGeneric: string;
  goalSectionTitle: string;
  goalDescription: string;
  goalWordLabel: string;
  goalGrammarLabel: string;
  goalOptionLabel: (n: number) => string;
  reminderToggleLabel: string;
  reminderOffHint: string;
  reminderTimeLabel: string;
  reminderTimeCardLabel: string;
  reminderChangeHint: string;
  reminderOnA11y: string;
  reminderOffA11y: string;
  reminderPermissionDeniedTitle: string;
  reminderPermissionDeniedMessage: string;
  backLabel: string;
  backToSettingsTitle: string;
  backToSettingsMessage: string;
  cancel: string;
  themeHint: string;
  themeLightLabel: string;
  themeLightSub: string;
  themeDarkLabel: string;
  themeDarkSub: string;
  themeSystemLabel: string;
  themeSystemSub: string;
  purposeOptions: { value: StudyPurpose; label: string; subtitle?: string }[];
  levelOptions: { value: KoreanLevel; label: string; subtitle?: string }[];
  howFoundOptions: { value: HowFound; label: string; subtitle?: string }[];
  stepQuestion: Record<string, string>;
};

const purposeOptionsJa: { value: StudyPurpose; label: string; subtitle?: string }[] = [
  { value: 'travel', label: '旅行', subtitle: '旅行で使えるフレーズを覚えたい' },
  { value: 'kpop', label: 'K-POP・ドラマ', subtitle: '歌詞やセリフを理解したい' },
  { value: 'topik', label: 'TOPIK受験', subtitle: '試験対策でしっかり学びたい' },
  { value: 'work', label: '仕事', subtitle: 'ビジネスで活用したい' },
  { value: 'other', label: 'その他', subtitle: 'そのほかの理由' },
];

const purposeOptionsEn: { value: StudyPurpose; label: string; subtitle?: string }[] = [
  { value: 'travel', label: 'Travel', subtitle: 'Learn phrases for trips' },
  { value: 'kpop', label: 'K-POP & Drama', subtitle: 'Understand lyrics and lines' },
  { value: 'topik', label: 'TOPIK exam', subtitle: 'Study for the test' },
  { value: 'work', label: 'Work', subtitle: 'Use for business' },
  { value: 'other', label: 'Other', subtitle: 'Other reasons' },
];

const levelOptionsJa: { value: KoreanLevel; label: string; subtitle?: string }[] = [
  { value: 'beginner', label: 'これから始める', subtitle: 'ハングルから学びたい' },
  { value: 'words', label: '単語は少し知っている', subtitle: '語彙を増やしたい' },
  { value: 'conversation', label: '簡単な会話はできる', subtitle: '表現を増やしたい' },
  { value: 'various', label: 'いろいろ話せる', subtitle: 'さらに上を目指したい' },
  { value: 'detail', label: 'だいたい話せる', subtitle: '仕上げ・維持したい' },
];

const levelOptionsEn: { value: KoreanLevel; label: string; subtitle?: string }[] = [
  { value: 'beginner', label: 'Just starting', subtitle: 'Want to learn from Hangeul' },
  { value: 'words', label: 'Know some words', subtitle: 'Want to build vocabulary' },
  { value: 'conversation', label: 'Can have simple conversations', subtitle: 'Want more expressions' },
  { value: 'various', label: 'Can talk about various topics', subtitle: 'Want to level up' },
  { value: 'detail', label: 'Fairly fluent', subtitle: 'Want to maintain and refine' },
];

const howFoundOptionsJa: { value: HowFound; label: string; subtitle?: string }[] = [
  { value: 'search', label: 'Google検索', subtitle: '検索で見つけた' },
  { value: 'x', label: 'X', subtitle: 'X（旧Twitter）で' },
  { value: 'tiktok', label: 'TikTok', subtitle: 'TikTokで' },
  { value: 'instagram', label: 'Instagram', subtitle: 'Instagramで' },
  { value: 'friend', label: '友達・家族', subtitle: '知人に教えてもらった' },
  { value: 'other', label: 'その他', subtitle: 'そのほかのきっかけ' },
];

const howFoundOptionsEn: { value: HowFound; label: string; subtitle?: string }[] = [
  { value: 'search', label: 'Google search', subtitle: 'Found via search' },
  { value: 'x', label: 'X', subtitle: 'On X (Twitter)' },
  { value: 'tiktok', label: 'TikTok', subtitle: 'On TikTok' },
  { value: 'instagram', label: 'Instagram', subtitle: 'On Instagram' },
  { value: 'friend', label: 'Friend or family', subtitle: 'Someone told me' },
  { value: 'other', label: 'Other', subtitle: 'Other' },
];

const ja: OnboardingStrings = {
  welcomeTitle: '韓国語を始めよう',
  welcomeBody: '単語・文法・ハングルを、TOPIKの範囲で学べます。4択クイズと並び替えで、毎日少しずつ身につけましょう。',
  welcomeSubtitle: '約2分で設定できます',
  welcomeContextSetting: '設定の確認・変更',
  progressLabel: (current, total) => `ステップ ${current}／全${total}`,
  progressStepDone: '、完了',
  progressStepPending: '、未完了',
  buttonNext: '次へ',
  buttonStart: 'はじめる',
  buttonSave: '保存',
  doneTitle: '準備完了',
  doneBody: 'さっそくレッスンを始めましょう。',
  errorTitle: 'エラー',
  errorRetry: '再試行',
  errorNetwork: '接続を確認して、もう一度お試しください。',
  errorGeneric: 'しばらくしてから、もう一度お試しください。',
  goalSectionTitle: '毎日クリアしたいレッスン数',
  goalDescription: 'ホームの「今日すること」に表示されます。1〜3から選んでください。あとから設定で変更できます。',
  goalWordLabel: '単語レッスン',
  goalGrammarLabel: '文法レッスン',
  goalOptionLabel: (n) => `${n}レッスン`,
  reminderToggleLabel: '毎日、学習リマインダーを受け取る',
  reminderOffHint: '通知はあとから設定画面でオンにできます。',
  reminderTimeLabel: '通知時刻',
  reminderTimeCardLabel: '設定する時刻',
  reminderChangeHint: 'あとから設定で変更できます。',
  reminderOnA11y: '通知をオンにする',
  reminderOffA11y: '通知をオフにする',
  reminderPermissionDeniedTitle: '通知が許可されていません',
  reminderPermissionDeniedMessage: 'リマインダーを受け取るには、設定で通知を許可してください。あとからでも有効にできます。',
  backLabel: '戻る',
  backToSettingsTitle: '設定に戻りますか？',
  backToSettingsMessage: '入力内容は保存されません。',
  cancel: 'キャンセル',
  themeHint: 'タップするとこの画面の色がすぐに切り替わります。あとから設定でも変更できます。',
  themeLightLabel: 'ライトモード',
  themeLightSub: '明るい背景で読みやすい',
  themeDarkLabel: 'ダークモード',
  themeDarkSub: '目にやさしい暗い配色',
  themeSystemLabel: '端末の設定に合わせる',
  themeSystemSub: 'スマホの明るさ設定に連動',
  purposeOptions: purposeOptionsJa,
  levelOptions: levelOptionsJa,
  howFoundOptions: howFoundOptionsJa,
  stepQuestion: {
    welcome: '韓国語を始めよう',
    theme: 'アプリの見た目はどちらにしますか？',
    level: '今の韓国語のレベルはどれに近い？',
    purpose: '韓国語を学ぶ目的は？',
    found: 'どこでこのアプリを知りましたか？',
    goal: '1日にクリアしたいレッスン数は？',
    reminder: '毎日何時から勉強を始めますか？',
    done: '準備完了',
  },
};

const en: OnboardingStrings = {
  welcomeTitle: 'Start learning Korean',
  welcomeBody: 'Learn vocabulary, grammar, and Hangeul within TOPIK scope. Quizzes and reordering help you build skills day by day.',
  welcomeSubtitle: 'Takes about 2 minutes',
  welcomeContextSetting: 'Review or change settings',
  progressLabel: (current, total) => `Step ${current} of ${total}`,
  progressStepDone: ', done',
  progressStepPending: ', not done',
  buttonNext: 'Next',
  buttonStart: 'Get started',
  buttonSave: 'Save',
  doneTitle: "You're all set",
  doneBody: "Let's start your first lesson.",
  errorTitle: 'Error',
  errorRetry: 'Retry',
  errorNetwork: 'Please check your connection and try again.',
  errorGeneric: 'Please try again later.',
  goalSectionTitle: 'Daily lesson goal',
  goalDescription: "Shown on Home under \"Today's tasks\". Choose 1–3. You can change this in settings later.",
  goalWordLabel: 'Vocabulary lessons',
  goalGrammarLabel: 'Grammar lessons',
  goalOptionLabel: (n) => `${n} lesson${n > 1 ? 's' : ''}`,
  reminderToggleLabel: 'Receive a daily study reminder',
  reminderOffHint: 'You can turn on notifications in settings later.',
  reminderTimeLabel: 'Reminder time',
  reminderTimeCardLabel: 'Time',
  reminderChangeHint: 'You can change this in settings later.',
  reminderOnA11y: 'Turn on notifications',
  reminderOffA11y: 'Turn off notifications',
  reminderPermissionDeniedTitle: 'Notifications not allowed',
  reminderPermissionDeniedMessage: 'To get reminders, please enable notifications in your device settings. You can do this later.',
  backLabel: 'Back',
  backToSettingsTitle: 'Return to settings?',
  backToSettingsMessage: 'Your answers will not be saved.',
  cancel: 'Cancel',
  themeHint: 'Tap to see the theme change on this screen. You can change it in settings later.',
  themeLightLabel: 'Light',
  themeLightSub: 'Bright, easy to read',
  themeDarkLabel: 'Dark',
  themeDarkSub: 'Easier on the eyes',
  themeSystemLabel: 'Use system setting',
  themeSystemSub: 'Follows your device appearance',
  purposeOptions: purposeOptionsEn,
  levelOptions: levelOptionsEn,
  howFoundOptions: howFoundOptionsEn,
  stepQuestion: {
    welcome: 'Start learning Korean',
    theme: 'How do you want the app to look?',
    level: "What's your current Korean level?",
    purpose: 'Why are you learning Korean?',
    found: 'Where did you hear about this app?',
    goal: 'How many lessons do you want to complete per day?',
    reminder: 'What time do you start studying each day?',
    done: "You're all set",
  },
};

const onboardingMaps: Record<AppLocale, OnboardingStrings> = {
  ja,
  en,
  zh: en,
  vi: en,
  es: en,
  id: en,
  th: en,
};

export function getOnboardingStrings(locale: OnboardingLocale): OnboardingStrings {
  return onboardingMaps[locale] ?? onboardingMaps[FALLBACK_APP_LOCALE];
}
