/**
 * タブ・スタック・設定系の画面文言（AppLocale 7 言語。ホーム〜設定・プロフィールカードは zh〜th も個別定義）
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

export type AppScreensLocale = AppLocale;

function pickScreenStrings<T>(table: Record<AppLocale, T>, locale: AppLocale): T {
  return table[locale] ?? table[FALLBACK_APP_LOCALE];
}

/** ja / en は必須。zh〜th は省略時 en と同じ文言 */
function sevenLocales<T>(ja: T, en: T, extra?: Partial<Record<AppLocale, T>>): Record<AppLocale, T> {
  return {
    ja,
    en,
    zh: extra?.zh ?? en,
    vi: extra?.vi ?? en,
    es: extra?.es ?? en,
    id: extra?.id ?? en,
    th: extra?.th ?? en,
  };
}

export type NavigationTitles = {
  quizWord: string;
  quizReview: string;
  quizSaved: string;
  login: string;
  subscription: string;
};

export type HomeTabStrings = {
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  dayLabels: string[];
  /** カレンダー日付詳細など */
  recordNone: string;
  lessonsCleared: (n: number) => string;
  calendarDayA11y: (month: number, day: number, cleared: number) => string;
  /** 連続学習カード */
  streakTitle: string;
  streakUnit: string;
  streakLongest: (n: number) => string;
  streakHintContinue: string;
  streakHintStart: string;
  streakCtaStart: string;
  streakSubStart: string;
  streakWeekLabel: string;
  /** ホーム本文（ヘッダー・今日の目標・週・カレンダー・レベル・PRO） */
  subGreeting: string;
  todayGoalEyebrow: string;
  todayTodoTitle: string;
  changeGoal: string;
  tileWord: string;
  tileGrammar: string;
  clearLabel: string;
  noGoalLabel: string;
  openHint: string;
  setGoalHint: string;
  weekEyebrow: string;
  weekTitle: string;
  weekTotalLessons: (n: number) => string;
  recordEyebrow: string;
  calendarTitle: string;
  calendarSub: string;
  /** カレンダー見出し（年・月） */
  calendarMonthLabel: (year: number, month: number) => string;
  levelSectionEyebrow: string;
  levelProgressTitle: string;
  levelWordType: string;
  levelGrammarType: string;
  levelNLabel: (level: number) => string;
  upgradeRecommend: string;
  upgradeTitle: string;
  upgradeDesc: string;
  upgradeBenefit1: string;
  upgradeBenefit2: string;
  upgradeBenefit3: string;
  upgradeBenefit4: string;
  upgradeCta: string;
  profileCardA11y: string;
  profileCardHint: string;
  settingsA11y: string;
  settingsHint: string;
  upgradeCardA11y: string;
  changeGoalA11y: string;
  changeGoalHint: string;
  tileWordA11y: (cleared: number, goal: number, hasGoal: boolean) => string;
  tileGrammarA11y: (cleared: number, goal: number, hasGoal: boolean) => string;
  weekCardA11y: (total: number) => string;
  prevMonthA11y: string;
  nextMonthA11y: string;
  dayDetailAlert: (word: number, grammar: number, total: number) => string;
  dayAlertTitle: (year: number, month: number, day: number) => string;
  errorBoundaryContext: string;
};

/** ボトムタブのラベル */
export type TabBarStrings = {
  home: string;
  vocabulary: string;
  grammar: string;
  saved: string;
  /** 保存タブの VoiceOver 用（短い title と別） */
  savedA11y: string;
  chat: string;
};

export type VocabularyTabStrings = {
  title: string;
  subtitle: string;
  loadingData: string;
  loadingProgress: string;
  hangulPuzzle: string;
  hangulPuzzleHint: string;
  review: string;
  reviewNone: string;
  reviewHintActive: (max: number) => string;
  reviewHintEmpty: string;
  reviewAlertTitle: string;
  reviewAlertMessage: string;
  sectionLessons: string;
  levelLabels: string[];
  /** カード見出し（例: 日本語「TOPIK 1級」／英語「TOPIK Level 1」） */
  topikLevelTitle: (level: number) => string;
  /** アクセシビリティ: ロック時（日本語「有料」） */
  paywalledA11y: string;
  /** 復習カード VoiceOver（件数あり） */
  reviewCardA11yActive: (count: number) => string;
  /** 復習件数バッジ（例: 「3 件」） */
  reviewCountBadge: (count: number) => string;
  /** レベルカードのレッスン数（例: 「19 レッスン」） */
  levelLessonCount: (count: number) => string;
  /** 復習0件時の a11y 補足 */
  reviewCardEmptyHint: string;
};

export type GrammarTabStrings = {
  title: string;
  subtitle: string;
  loadingData: string;
  loadingProgress: string;
  sectionLessons: string;
  levelLabels: string[];
  supabaseHint: string;
  noLessonsTitle: string;
  noLessonsMessage: string;
  noLessonsOk: string;
  topikLevelTitle: (level: number) => string;
  /** レッスン件数（例: 「3 レッスン」/「3 lessons」） */
  lessonCountLabel: (count: number) => string;
  /** レッスン一覧（レベル配下） */
  lessonListHint: string;
  /** レッスン詳細 */
  meaningLabel: string;
  shapeLabel: string;
  examplesLabel: string;
  lessonEmpty: string;
  examplesPlaceholder: string;
  quizStart: string;
  quizPreparing: string;
  /** フッターボタンが無効のときの短い表記 */
  quizButtonDisabledShort: string;
  speakGrammarA11y: string;
  speakExampleA11y: string;
  backA11y: string;
  clearedA11y: string;
};

export type ChatTabStrings = {
  title: string;
  loading: string;
  loadFailed: string;
  retry: string;
  supabaseNotConfigured: string;
  noRoom: string;
  sendFailedTitle: string;
  sendFailedMessage: string;
  /** 送信失敗（セッション切れ・Invalid JWT など） */
  sendFailedAuthMessage: string;
  today: string;
  yesterday: string;
  guest: string;
  reconnectA11y: string;
  reconnectBanner: string;
  emptyMessages: string;
  loginToChat: string;
  loginButton: string;
  loginButtonA11y: string;
  proOnly: string;
  proButton: string;
  proButtonA11y: string;
  messagePlaceholder: string;
  messageInputA11y: string;
  sendA11y: string;
  chatListA11y: string;
  /** ルーム切り替えチップ行（複数ルーム時） */
  roomPickerA11y: string;
  scrollToBottomA11y: string;
  offlineCannotSend: string;
  /** リアルタイム接続失敗時（フォールバック） */
  realtimeSubscribeError: string;
  /** 過去メッセージの末尾 */
  noOlderMessages: string;
  loginRequiredForChat: string;
  chatRestricted: string;
  termsModalTitle: string;
  termsModalBody: string;
  termsConsentCheckbox: string;
  termsConsentCheckboxA11y: string;
  termsAgree: string;
  termsAgreeA11y: string;
  termsDecline: string;
  termsDeclineA11y: string;
  termsAgreeFailedTitle: string;
  termsAgreeFailedBody: string;
  openTerms: string;
  openTermsA11y: string;
  userActionA11y: (name: string) => string;
  userActionTitle: string;
  replyAction: string;
  replyingTo: string;
  replyToUserLabel: (name: string) => string;
  originalMessage: string;
  reportAction: string;
  blockAction: string;
  blockConfirmTitle: string;
  blockConfirmBody: string;
  unblockAction: string;
  reportReasonTitle: string;
  blockReasonTitle: string;
  reportReasonSpam: string;
  reportReasonHarassment: string;
  reportReasonHate: string;
  reportReasonSexual: string;
  reportReasonViolence: string;
  reportReasonSelfHarm: string;
  reportReasonOther: string;
  reportSubmitAction: string;
  reportSuccessTitle: string;
  reportSuccessBody: string;
  reportFailedTitle: string;
  reportFailedBody: string;
  blockSuccessTitle: string;
  blockSuccessBody: string;
  blockFailedTitle: string;
  blockFailedBody: string;
  manageBlockedUsers: string;
  blockedUsersTitle: string;
  noBlockedUsers: string;
  blockedUserNameLabel: string;
  unblockSuccessTitle: string;
  unblockSuccessBody: string;
  unblockFailedTitle: string;
  unblockFailedBody: string;
  copyAction: string;
  copySuccessTitle: string;
  copySuccessBody: string;
  cancel: string;
};

export type EmptyStateStrings = {
  savedTitle: string;
  savedSubtitle: string;
  savedButton: string;
  savedBrowseA11y: string;
};

export type SavedTabStrings = {
  headerTitle: string;
  headerSubtitle: (count: number) => string;
  quizButton: string;
  quizButtonA11y: string;
  listA11y: string;
  speakA11y: string;
  unsaveA11y: string;
};

export type SettingsScreenStrings = {
  title: string;
  back: string;
  settingsList: string;
  appearance: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  feedback: string;
  sound: string;
  soundSub: string;
  haptics: string;
  hapticsSub: string;
  soundVolume: string;
  soundVolumeSub: string;
  volLow: string;
  volStandard: string;
  volHigh: string;
  pickVol: (label: string) => string;
  reminderSection: string;
  notification: string;
  notificationTime: string;
  reminderTimeA11y: (time: string, on: boolean) => string;
  done: string;
  studySection: string;
  studyPurpose: string;
  studyPurposeA11y: string;
  timezone: string;
  timezoneA11y: string;
  dataSection: string;
  resetData: string;
  resetDataA11y: string;
  resetConfirmTitle: string;
  resetConfirmMessage: string;
  cancel: string;
  resetConfirmAction: string;
  subSection: string;
  restorePurchase: string;
  restorePurchaseA11y: (busy: boolean) => string;
  manageSubscription: string;
  manageSubscriptionA11y: string;
  appInfo: string;
  version: string;
  privacy: string;
  privacyA11y: string;
  terms: string;
  termsA11y: string;
  /** App Store 標準 EULA（stdeula） */
  appleStandardEula: string;
  appleStandardEulaA11y: string;
  legalAppleEulaMissing: string;
  support: string;
  supportA11y: string;
  devSection: string;
  onboardingStart: string;
  onboardingStartA11y: string;
  sentryTest: string;
  sentryTestA11y: string;
  sentryTestSentTitle: string;
  sentryTestSentBody: string;
  restoreSuccessTitle: string;
  restoreSuccessMessage: string;
  restoreFailTitle: string;
  restoreFailFallback: string;
  legalNotPublished: string;
  legalPrivacyMissing: string;
  legalTermsMissing: string;
  legalSupportMissing: string;
  soundOnA11y: string;
  soundOffA11y: string;
  hapticsOnA11y: string;
  hapticsOffA11y: string;
  reminderOnA11y: string;
  reminderOffA11y: string;
  /** 設定画面（アカウントカード等） */
  accountSection: string;
  accountSectionSub: string;
  accountSectionA11y: string;
  todayGoalRow: string;
  todayGoalA11y: string;
  displayLanguageRow: string;
  /** 表示言語が英語固定のときの右側ラベル */
  displayLanguageValue: string;
  displayLanguageA11y: string;
  /** 言語行が静的表示のときの VoiceOver 用 */
  displayLanguageStaticA11y: string;
};

/** ルート `/settings` 用のヘッダー等（getSettingsScreenStrings の title と一致） */
export type SettingsScreenExtraStrings = {
  title: string;
  accountSection: string;
};

const navigationJa: NavigationTitles = {
  quizWord: '単語クイズ',
  quizReview: '今日の復習',
  quizSaved: '保存した単語クイズ',
  login: 'ログイン',
  subscription: 'サブスクリプションを管理',
};
const navigationEn: NavigationTitles = {
  quizWord: 'Word quiz',
  quizReview: "Today's review",
  quizSaved: 'Saved words quiz',
  login: 'Sign in',
  subscription: 'Manage subscription',
};

const navigationZh: NavigationTitles = {
  quizWord: '单词测验',
  quizReview: '今日复习',
  quizSaved: '已保存单词测验',
  login: '登录',
  subscription: '管理订阅',
};
const navigationVi: NavigationTitles = {
  quizWord: 'Quiz từ vựng',
  quizReview: 'Ôn tập hôm nay',
  quizSaved: 'Quiz từ đã lưu',
  login: 'Đăng nhập',
  subscription: 'Quản lý đăng ký',
};
const navigationEs: NavigationTitles = {
  quizWord: 'Quiz de palabras',
  quizReview: 'Repaso de hoy',
  quizSaved: 'Quiz de palabras guardadas',
  login: 'Iniciar sesión',
  subscription: 'Gestionar suscripción',
};
const navigationId: NavigationTitles = {
  quizWord: 'Kuis kosakata',
  quizReview: 'Review hari ini',
  quizSaved: 'Kuis kata tersimpan',
  login: 'Masuk',
  subscription: 'Kelola langganan',
};
const navigationTh: NavigationTitles = {
  quizWord: 'แบบทดสอบคำศัพท์',
  quizReview: 'ทบทวนวันนี้',
  quizSaved: 'แบบทดสอบคำที่บันทึก',
  login: 'เข้าสู่ระบบ',
  subscription: 'จัดการการสมัครสมาชิก',
};

const homeJa: HomeTabStrings = {
  greetingMorning: 'おはようございます',
  greetingAfternoon: 'こんにちは',
  greetingEvening: 'こんばんは',
  dayLabels: ['日', '月', '火', '水', '木', '金', '土'],
  recordNone: '記録なし',
  lessonsCleared: (n) => `レッスン${n}件クリア`,
  calendarDayA11y: (month, day, cleared) =>
    `${month}月${day}日。${cleared > 0 ? `レッスン${cleared}件クリア` : '記録なし'}`,
  streakTitle: '連続学習',
  streakUnit: '日連続',
  streakLongest: (n) => `過去最長 ${n}日`,
  streakHintContinue: '1日1レッスンでキープ',
  streakHintStart: 'タップして単語タブへ',
  streakCtaStart: '今日から始める',
  streakSubStart: '1レッスンクリアで記録スタート',
  streakWeekLabel: '今週',
  subGreeting: '今日も一緒に学びましょう',
  todayGoalEyebrow: '今日の目標',
  todayTodoTitle: '今日やること',
  changeGoal: '目標変更',
  tileWord: '単語',
  tileGrammar: '文法',
  clearLabel: 'クリア',
  noGoalLabel: '目標なし',
  openHint: '開く',
  setGoalHint: '目標を設定',
  weekEyebrow: '直近7日間',
  weekTitle: '今週の学習',
  weekTotalLessons: (n) => `合計 ${n} レッスン`,
  recordEyebrow: '記録',
  calendarTitle: '学習カレンダー',
  calendarSub: '学習した日は色が濃く表示されます',
  calendarMonthLabel: (year, month) => `${year}年${month}月`,
  levelSectionEyebrow: '全体',
  levelProgressTitle: 'レベル別進捗',
  levelWordType: '単語',
  levelGrammarType: '文法',
  levelNLabel: (level) => `${level}級`,
  upgradeRecommend: 'おすすめ',
  upgradeTitle: '全コンテンツを解放',
  upgradeDesc: '単語・文法・パズル 全レッスン／チャット送信／復習・保存 無制限。',
  upgradeBenefit1: '単語・文法・パズル 全レッスン',
  upgradeBenefit2: 'チャット送信',
  upgradeBenefit3: '学習曲線に基づいた復習機能 無制限',
  upgradeBenefit4: '単語保存機能 無制限',
  upgradeCta: '今すぐPROを試す',
  profileCardA11y: 'プロフィールカードを開く',
  profileCardHint: '学習記録がひと目で分かるプロフィールカードを表示します',
  settingsA11y: '設定を開く',
  settingsHint: '設定画面に移動します',
  upgradeCardA11y: 'PROにアップグレード',
  changeGoalA11y: '今日の目標を変更する',
  changeGoalHint: '日次の単語・文法の目標レッスン数を変更します',
  tileWordA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `単語の今日の進捗。${cleared}件クリア、目標${goal}件。タップで単語タブへ`
      : '目標未設定。タップで目標を設定',
  tileGrammarA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `文法の今日の進捗。${cleared}件クリア、目標${goal}件。タップで文法タブへ`
      : '目標未設定。タップで目標を設定',
  weekCardA11y: (total) => `今週の学習。直近7日間で合計${total}レッスン`,
  prevMonthA11y: '前月',
  nextMonthA11y: '翌月',
  dayDetailAlert: (word, grammar, total) =>
    `単語 ${word} レッスン、文法 ${grammar} レッスン（合計 ${total}）`,
  dayAlertTitle: (year, month, day) => `${month}月${day}日`,
  errorBoundaryContext: 'ホーム',
};
const homeEn: HomeTabStrings = {
  greetingMorning: 'Good morning',
  greetingAfternoon: 'Hello',
  greetingEvening: 'Good evening',
  dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  recordNone: 'No record',
  lessonsCleared: (n) => `${n} lesson(s) cleared`,
  calendarDayA11y: (month, day, cleared) =>
    `${month}/${day}. ${cleared > 0 ? `${cleared} lesson(s) cleared` : 'No record'}`,
  streakTitle: 'Streak',
  streakUnit: ' days',
  streakLongest: (n) => `Best ${n} days`,
  streakHintContinue: '1 lesson a day to keep it',
  streakHintStart: 'Tap to open Vocabulary',
  streakCtaStart: 'Start today',
  streakSubStart: 'Complete 1 lesson to start your streak',
  streakWeekLabel: 'This week',
  subGreeting: "Let's learn together today",
  todayGoalEyebrow: "Today's goal",
  todayTodoTitle: "Today's to-do",
  changeGoal: 'Change goal',
  tileWord: 'Vocabulary',
  tileGrammar: 'Grammar',
  clearLabel: 'Done',
  noGoalLabel: 'No goal',
  openHint: 'Open',
  setGoalHint: 'Set a goal',
  weekEyebrow: 'Last 7 days',
  weekTitle: 'This week',
  weekTotalLessons: (n) => `${n} lesson${n === 1 ? '' : 's'} total`,
  recordEyebrow: 'History',
  calendarTitle: 'Study calendar',
  calendarSub: 'Days you studied appear darker.',
  calendarMonthLabel: (year, month) =>
    new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  levelSectionEyebrow: 'Overall',
  levelProgressTitle: 'Progress by level',
  levelWordType: 'Vocabulary',
  levelGrammarType: 'Grammar',
  levelNLabel: (level) => `Lv.${level}`,
  upgradeRecommend: 'Recommended',
  upgradeTitle: 'Unlock everything',
  upgradeDesc: 'All vocabulary, grammar & puzzle lessons, chat, review & saved words — unlimited.',
  upgradeBenefit1: 'All vocabulary, grammar & puzzle lessons',
  upgradeBenefit2: 'Chat messages',
  upgradeBenefit3: 'Unlimited spaced-repetition review',
  upgradeBenefit4: 'Unlimited saved words',
  upgradeCta: 'Try PRO',
  profileCardA11y: 'Open profile card',
  profileCardHint: 'Shows your learning stats at a glance',
  settingsA11y: 'Open settings',
  settingsHint: 'Go to settings',
  upgradeCardA11y: 'Upgrade to PRO',
  changeGoalA11y: "Change today's study goal",
  changeGoalHint: 'Change daily vocabulary and grammar lesson targets',
  tileWordA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Today's vocabulary: ${cleared} cleared, goal ${goal}. Opens Vocabulary tab`
      : 'No goal set. Tap to set a goal',
  tileGrammarA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Today's grammar: ${cleared} cleared, goal ${goal}. Opens Grammar tab`
      : 'No goal set. Tap to set a goal',
  weekCardA11y: (total) => `This week's study: ${total} lesson${total === 1 ? '' : 's'} in the last 7 days`,
  prevMonthA11y: 'Previous month',
  nextMonthA11y: 'Next month',
  dayDetailAlert: (word, grammar, total) =>
    `${word} vocabulary lesson(s), ${grammar} grammar lesson(s) (${total} total)`,
  dayAlertTitle: (year, month, day) =>
    new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  errorBoundaryContext: 'Home',
};

const homeZh: HomeTabStrings = {
  greetingMorning: '早上好',
  greetingAfternoon: '你好',
  greetingEvening: '晚上好',
  dayLabels: ['日', '一', '二', '三', '四', '五', '六'],
  recordNone: '暂无记录',
  lessonsCleared: (n) => `已学完 ${n} 课`,
  calendarDayA11y: (month, day, cleared) =>
    `${month}月${day}日。${cleared > 0 ? `已学完 ${cleared} 课` : '暂无记录'}`,
  streakTitle: '连续学习',
  streakUnit: '天',
  streakLongest: (n) => `历史最长 ${n} 天`,
  streakHintContinue: '每天一课保持连胜',
  streakHintStart: '点按打开单词',
  streakCtaStart: '今天开始',
  streakSubStart: '完成一课即可开始记录',
  streakWeekLabel: '本周',
  subGreeting: '今天一起学吧',
  todayGoalEyebrow: '今日目标',
  todayTodoTitle: '今日待办',
  changeGoal: '更改目标',
  tileWord: '单词',
  tileGrammar: '语法',
  clearLabel: '完成',
  noGoalLabel: '未设目标',
  openHint: '打开',
  setGoalHint: '设置目标',
  weekEyebrow: '最近7天',
  weekTitle: '本周学习',
  weekTotalLessons: (n) => `共 ${n} 课`,
  recordEyebrow: '记录',
  calendarTitle: '学习日历',
  calendarSub: '学过的日期颜色更深。',
  calendarMonthLabel: (year, month) => `${year}年${month}月`,
  levelSectionEyebrow: '总览',
  levelProgressTitle: '各级进度',
  levelWordType: '单词',
  levelGrammarType: '语法',
  levelNLabel: (level) => `${level} 级`,
  upgradeRecommend: '推荐',
  upgradeTitle: '解锁全部内容',
  upgradeDesc: '单词·语法·拼图全部课程／聊天／复习与收藏 无限制。',
  upgradeBenefit1: '单词·语法·拼图 全部课程',
  upgradeBenefit2: '聊天消息',
  upgradeBenefit3: '无限间隔复习',
  upgradeBenefit4: '无限收藏单词',
  upgradeCta: '试用 PRO',
  profileCardA11y: '打开资料卡',
  profileCardHint: '一眼查看学习数据',
  settingsA11y: '打开设置',
  settingsHint: '前往设置',
  upgradeCardA11y: '升级到 PRO',
  changeGoalA11y: '更改今日学习目标',
  changeGoalHint: '更改每日单词与语法课目标',
  tileWordA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `今日单词进度：已 ${cleared}，目标 ${goal}。打开单词标签`
      : '未设目标，点按设置',
  tileGrammarA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `今日语法进度：已 ${cleared}，目标 ${goal}。打开语法标签`
      : '未设目标，点按设置',
  weekCardA11y: (total) => `本周学习：最近7天共 ${total} 课`,
  prevMonthA11y: '上月',
  nextMonthA11y: '下月',
  dayDetailAlert: (word, grammar, total) => `单词 ${word} 课，语法 ${grammar} 课（共 ${total}）`,
  dayAlertTitle: (year, month, day) => `${month}月${day}日`,
  errorBoundaryContext: '主页',
};

const homeVi: HomeTabStrings = {
  greetingMorning: 'Chào buổi sáng',
  greetingAfternoon: 'Xin chào',
  greetingEvening: 'Chào buổi tối',
  dayLabels: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  recordNone: 'Chưa có dữ liệu',
  lessonsCleared: (n) => `Đã hoàn thành ${n} bài`,
  calendarDayA11y: (month, day, cleared) =>
    `${day}/${month}. ${cleared > 0 ? `Đã hoàn thành ${cleared} bài` : 'Chưa có dữ liệu'}`,
  streakTitle: 'Chuỗi ngày',
  streakUnit: ' ngày',
  streakLongest: (n) => `Kỷ lục ${n} ngày`,
  streakHintContinue: '1 bài mỗi ngày để giữ chuỗi',
  streakHintStart: 'Chạm để mở Từ vựng',
  streakCtaStart: 'Bắt đầu hôm nay',
  streakSubStart: 'Hoàn thành 1 bài để bắt đầu',
  streakWeekLabel: 'Tuần này',
  subGreeting: 'Cùng học hôm nay nhé',
  todayGoalEyebrow: 'Mục tiêu hôm nay',
  todayTodoTitle: 'Việc cần làm',
  changeGoal: 'Đổi mục tiêu',
  tileWord: 'Từ vựng',
  tileGrammar: 'Ngữ pháp',
  clearLabel: 'Xong',
  noGoalLabel: 'Chưa đặt mục tiêu',
  openHint: 'Mở',
  setGoalHint: 'Đặt mục tiêu',
  weekEyebrow: '7 ngày qua',
  weekTitle: 'Tuần này',
  weekTotalLessons: (n) => `Tổng ${n} bài`,
  recordEyebrow: 'Lịch sử',
  calendarTitle: 'Lịch học',
  calendarSub: 'Ngày đã học sẽ đậm hơn.',
  calendarMonthLabel: (year, month) =>
    new Date(year, month - 1, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
  levelSectionEyebrow: 'Tổng quan',
  levelProgressTitle: 'Tiến độ theo cấp',
  levelWordType: 'Từ vựng',
  levelGrammarType: 'Ngữ pháp',
  levelNLabel: (level) => `Cấp ${level}`,
  upgradeRecommend: 'Gợi ý',
  upgradeTitle: 'Mở khóa toàn bộ',
  upgradeDesc: 'Tất cả bài từ vựng, ngữ pháp & puzzle, chat, ôn tập & lưu từ — không giới hạn.',
  upgradeBenefit1: 'Tất cả bài từ vựng, ngữ pháp & puzzle',
  upgradeBenefit2: 'Tin nhắn chat',
  upgradeBenefit3: 'Ôn tập không giới hạn',
  upgradeBenefit4: 'Lưu từ không giới hạn',
  upgradeCta: 'Dùng thử PRO',
  profileCardA11y: 'Mở thẻ hồ sơ',
  profileCardHint: 'Xem nhanh thống kê học tập',
  settingsA11y: 'Mở cài đặt',
  settingsHint: 'Đi tới cài đặt',
  upgradeCardA11y: 'Nâng cấp PRO',
  changeGoalA11y: 'Đổi mục tiêu hôm nay',
  changeGoalHint: 'Đổi số bài từ vựng và ngữ pháp mỗi ngày',
  tileWordA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Từ vựng hôm nay: ${cleared}/${goal}. Mở tab Từ vựng`
      : 'Chưa đặt mục tiêu. Chạm để đặt',
  tileGrammarA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Ngữ pháp hôm nay: ${cleared}/${goal}. Mở tab Ngữ pháp`
      : 'Chưa đặt mục tiêu. Chạm để đặt',
  weekCardA11y: (total) => `Tuần này: ${total} bài trong 7 ngày qua`,
  prevMonthA11y: 'Tháng trước',
  nextMonthA11y: 'Tháng sau',
  dayDetailAlert: (word, grammar, total) =>
    `${word} bài từ vựng, ${grammar} bài ngữ pháp (tổng ${total})`,
  dayAlertTitle: (year, month, day) =>
    new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  errorBoundaryContext: 'Trang chủ',
};

const homeEs: HomeTabStrings = {
  greetingMorning: 'Buenos días',
  greetingAfternoon: 'Hola',
  greetingEvening: 'Buenas noches',
  dayLabels: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  recordNone: 'Sin registro',
  lessonsCleared: (n) => `${n} lección(es) completada(s)`,
  calendarDayA11y: (month, day, cleared) =>
    `${day}/${month}. ${cleared > 0 ? `${cleared} lección(es)` : 'Sin registro'}`,
  streakTitle: 'Racha',
  streakUnit: ' días',
  streakLongest: (n) => `Récord: ${n} días`,
  streakHintContinue: '1 lección al día para mantenerla',
  streakHintStart: 'Toca para abrir Vocabulario',
  streakCtaStart: 'Empezar hoy',
  streakSubStart: 'Completa 1 lección para empezar',
  streakWeekLabel: 'Esta semana',
  subGreeting: 'Aprendamos juntos hoy',
  todayGoalEyebrow: 'Meta de hoy',
  todayTodoTitle: 'Pendientes',
  changeGoal: 'Cambiar meta',
  tileWord: 'Vocabulario',
  tileGrammar: 'Gramática',
  clearLabel: 'Hecho',
  noGoalLabel: 'Sin meta',
  openHint: 'Abrir',
  setGoalHint: 'Definir meta',
  weekEyebrow: 'Últimos 7 días',
  weekTitle: 'Esta semana',
  weekTotalLessons: (n) => `${n} lección(es) en total`,
  recordEyebrow: 'Historial',
  calendarTitle: 'Calendario',
  calendarSub: 'Los días estudiados se ven más oscuros.',
  calendarMonthLabel: (year, month) =>
    new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
  levelSectionEyebrow: 'Resumen',
  levelProgressTitle: 'Progreso por nivel',
  levelWordType: 'Vocabulario',
  levelGrammarType: 'Gramática',
  levelNLabel: (level) => `Nv.${level}`,
  upgradeRecommend: 'Recomendado',
  upgradeTitle: 'Desbloquea todo',
  upgradeDesc: 'Todas las lecciones de vocabulario, gramática y puzzle, chat, repaso y palabras guardadas — ilimitado.',
  upgradeBenefit1: 'Todas las lecciones de vocabulario, gramática y puzzle',
  upgradeBenefit2: 'Mensajes de chat',
  upgradeBenefit3: 'Repaso espaciado ilimitado',
  upgradeBenefit4: 'Palabras guardadas ilimitadas',
  upgradeCta: 'Probar PRO',
  profileCardA11y: 'Abrir tarjeta de perfil',
  profileCardHint: 'Ve tus estadísticas de un vistazo',
  settingsA11y: 'Abrir ajustes',
  settingsHint: 'Ir a ajustes',
  upgradeCardA11y: 'Pasarse a PRO',
  changeGoalA11y: 'Cambiar meta de estudio de hoy',
  changeGoalHint: 'Cambiar lecciones diarias de vocabulario y gramática',
  tileWordA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Vocabulario de hoy: ${cleared} de ${goal}. Abre la pestaña Vocabulario`
      : 'Sin meta. Toca para definir',
  tileGrammarA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Gramática de hoy: ${cleared} de ${goal}. Abre la pestaña Gramática`
      : 'Sin meta. Toca para definir',
  weekCardA11y: (total) => `Esta semana: ${total} lección(es) en los últimos 7 días`,
  prevMonthA11y: 'Mes anterior',
  nextMonthA11y: 'Mes siguiente',
  dayDetailAlert: (word, grammar, total) =>
    `${word} vocabulario, ${grammar} gramática (total ${total})`,
  dayAlertTitle: (year, month, day) =>
    new Date(year, month - 1, day).toLocaleDateString('es-ES', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  errorBoundaryContext: 'Inicio',
};

const homeId: HomeTabStrings = {
  greetingMorning: 'Selamat pagi',
  greetingAfternoon: 'Halo',
  greetingEvening: 'Selamat malam',
  dayLabels: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  recordNone: 'Belum ada catatan',
  lessonsCleared: (n) => `${n} pelajaran selesai`,
  calendarDayA11y: (month, day, cleared) =>
    `${day}/${month}. ${cleared > 0 ? `${cleared} pelajaran selesai` : 'Belum ada catatan'}`,
  streakTitle: 'Streak',
  streakUnit: ' hari',
  streakLongest: (n) => `Terpanjang ${n} hari`,
  streakHintContinue: '1 pelajaran per hari untuk mempertahankan',
  streakHintStart: 'Ketuk untuk membuka Kosakata',
  streakCtaStart: 'Mulai hari ini',
  streakSubStart: 'Selesaikan 1 pelajaran untuk memulai',
  streakWeekLabel: 'Minggu ini',
  subGreeting: 'Belajar bersama hari ini',
  todayGoalEyebrow: 'Target hari ini',
  todayTodoTitle: 'Yang harus dilakukan',
  changeGoal: 'Ubah target',
  tileWord: 'Kosakata',
  tileGrammar: 'Tata bahasa',
  clearLabel: 'Selesai',
  noGoalLabel: 'Tanpa target',
  openHint: 'Buka',
  setGoalHint: 'Atur target',
  weekEyebrow: '7 hari terakhir',
  weekTitle: 'Minggu ini',
  weekTotalLessons: (n) => `Total ${n} pelajaran`,
  recordEyebrow: 'Riwayat',
  calendarTitle: 'Kalender belajar',
  calendarSub: 'Hari yang dipelajari tampak lebih gelap.',
  calendarMonthLabel: (year, month) =>
    new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  levelSectionEyebrow: 'Ringkasan',
  levelProgressTitle: 'Progres per level',
  levelWordType: 'Kosakata',
  levelGrammarType: 'Tata bahasa',
  levelNLabel: (level) => `Lv.${level}`,
  upgradeRecommend: 'Rekomendasi',
  upgradeTitle: 'Buka semua konten',
  upgradeDesc: 'Semua pelajaran kosakata, tata bahasa & puzzle, chat, ulang & simpan — tanpa batas.',
  upgradeBenefit1: 'Semua pelajaran kosakata, tata bahasa & puzzle',
  upgradeBenefit2: 'Pesan chat',
  upgradeBenefit3: 'Ulang tanpa batas',
  upgradeBenefit4: 'Kata tersimpan tanpa batas',
  upgradeCta: 'Coba PRO',
  profileCardA11y: 'Buka kartu profil',
  profileCardHint: 'Lihat statistik belajar sekilas',
  settingsA11y: 'Buka pengaturan',
  settingsHint: 'Ke pengaturan',
  upgradeCardA11y: 'Upgrade ke PRO',
  changeGoalA11y: 'Ubah target belajar hari ini',
  changeGoalHint: 'Ubah target pelajaran harian kosakata & tata bahasa',
  tileWordA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Kosakata hari ini: ${cleared}/${goal}. Buka tab Kosakata`
      : 'Belum ada target. Ketuk untuk mengatur',
  tileGrammarA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `Tata bahasa hari ini: ${cleared}/${goal}. Buka tab Tata bahasa`
      : 'Belum ada target. Ketuk untuk mengatur',
  weekCardA11y: (total) => `Minggu ini: ${total} pelajaran dalam 7 hari terakhir`,
  prevMonthA11y: 'Bulan lalu',
  nextMonthA11y: 'Bulan depan',
  dayDetailAlert: (word, grammar, total) =>
    `${word} pelajaran kosakata, ${grammar} tata bahasa (total ${total})`,
  dayAlertTitle: (year, month, day) =>
    new Date(year, month - 1, day).toLocaleDateString('id-ID', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  errorBoundaryContext: 'Beranda',
};

const homeTh: HomeTabStrings = {
  greetingMorning: 'สวัสดีตอนเช้า',
  greetingAfternoon: 'สวัสดี',
  greetingEvening: 'สวัสดีตอนเย็น',
  dayLabels: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
  recordNone: 'ยังไม่มีบันทึก',
  lessonsCleared: (n) => `เรียนจบ ${n} บท`,
  calendarDayA11y: (month, day, cleared) =>
    `${day}/${month}. ${cleared > 0 ? `เรียนจบ ${cleared} บท` : 'ยังไม่มีบันทึก'}`,
  streakTitle: 'สตรีค',
  streakUnit: ' วัน',
  streakLongest: (n) => `นานสุด ${n} วัน`,
  streakHintContinue: 'เรียนวันละบทเพื่อรักษา',
  streakHintStart: 'แตะเพื่อเปิดคำศัพท์',
  streakCtaStart: 'เริ่มวันนี้',
  streakSubStart: 'เรียนจบ 1 บทเพื่อเริ่มนับ',
  streakWeekLabel: 'สัปดาห์นี้',
  subGreeting: 'มาเรียนด้วยกันวันนี้',
  todayGoalEyebrow: 'เป้าหมายวันนี้',
  todayTodoTitle: 'สิ่งที่ต้องทำ',
  changeGoal: 'เปลี่ยนเป้าหมาย',
  tileWord: 'คำศัพท์',
  tileGrammar: 'ไวยากรณ์',
  clearLabel: 'เสร็จ',
  noGoalLabel: 'ยังไม่ตั้งเป้า',
  openHint: 'เปิด',
  setGoalHint: 'ตั้งเป้าหมาย',
  weekEyebrow: '7 วันที่แล้ว',
  weekTitle: 'สัปดาห์นี้',
  weekTotalLessons: (n) => `รวม ${n} บท`,
  recordEyebrow: 'ประวัติ',
  calendarTitle: 'ปฏิทินการเรียน',
  calendarSub: 'วันที่เรียนจะเข้มกว่า',
  calendarMonthLabel: (year, month) =>
    new Date(year, month - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
  levelSectionEyebrow: 'ภาพรวม',
  levelProgressTitle: 'ความคืบหน้าระดับ',
  levelWordType: 'คำศัพท์',
  levelGrammarType: 'ไวยากรณ์',
  levelNLabel: (level) => `Lv.${level}`,
  upgradeRecommend: 'แนะนำ',
  upgradeTitle: 'ปลดล็อกทั้งหมด',
  upgradeDesc: 'บทคำศัพท์ ไวยากรณ์ ปริศนา แชท ทบทวน และบันทึก — ไม่จำกัด',
  upgradeBenefit1: 'บทคำศัพท์ ไวยากรณ์ และปริศนาทั้งหมด',
  upgradeBenefit2: 'ข้อความแชท',
  upgradeBenefit3: 'ทบทวนไม่จำกัด',
  upgradeBenefit4: 'บันทึกคำไม่จำกัด',
  upgradeCta: 'ลอง PRO',
  profileCardA11y: 'เปิดการ์ดโปรไฟล์',
  profileCardHint: 'ดูสถิติการเรียนคร่าวๆ',
  settingsA11y: 'เปิดการตั้งค่า',
  settingsHint: 'ไปการตั้งค่า',
  upgradeCardA11y: 'อัปเกรด PRO',
  changeGoalA11y: 'เปลี่ยนเป้าหมายการเรียนวันนี้',
  changeGoalHint: 'เปลี่ยนจำนวนบทคำศัพท์และไวยากรณ์ต่อวัน',
  tileWordA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `คำศัพท์วันนี้: ${cleared}/${goal} เปิดแท็บคำศัพท์`
      : 'ยังไม่ตั้งเป้า แตะเพื่อตั้ง',
  tileGrammarA11y: (cleared, goal, hasGoal) =>
    hasGoal
      ? `ไวยากรณ์วันนี้: ${cleared}/${goal} เปิดแท็บไวยากรณ์`
      : 'ยังไม่ตั้งเป้า แตะเพื่อตั้ง',
  weekCardA11y: (total) => `สัปดาห์นี้: ${total} บทใน 7 วันที่แล้ว`,
  prevMonthA11y: 'เดือนก่อน',
  nextMonthA11y: 'เดือนถัดไป',
  dayDetailAlert: (word, grammar, total) =>
    `คำศัพท์ ${word} บท ไวยากรณ์ ${grammar} บท (รวม ${total})`,
  dayAlertTitle: (year, month, day) =>
    new Date(year, month - 1, day).toLocaleDateString('th-TH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  errorBoundaryContext: 'หน้าแรก',
};

const tabBarJa: TabBarStrings = {
  home: 'ホーム',
  vocabulary: '単語',
  grammar: '文法',
  saved: '保存',
  savedA11y: '保存した単語',
  chat: 'チャット',
};
const tabBarEn: TabBarStrings = {
  home: 'Home',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  saved: 'Saved',
  savedA11y: 'Saved words',
  chat: 'Chat',
};

const tabBarZh: TabBarStrings = {
  home: '主页',
  vocabulary: '单词',
  grammar: '语法',
  saved: '收藏',
  savedA11y: '收藏的单词',
  chat: '聊天',
};
const tabBarVi: TabBarStrings = {
  home: 'Trang chủ',
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
  saved: 'Đã lưu',
  savedA11y: 'Từ đã lưu',
  chat: 'Chat',
};
const tabBarEs: TabBarStrings = {
  home: 'Inicio',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  saved: 'Guardados',
  savedA11y: 'Palabras guardadas',
  chat: 'Chat',
};
const tabBarId: TabBarStrings = {
  home: 'Beranda',
  vocabulary: 'Kosakata',
  grammar: 'Tata bahasa',
  saved: 'Tersimpan',
  savedA11y: 'Kata tersimpan',
  chat: 'Obrolan',
};
const tabBarTh: TabBarStrings = {
  home: 'หน้าแรก',
  vocabulary: 'คำศัพท์',
  grammar: 'ไวยากรณ์',
  saved: 'บันทึก',
  savedA11y: 'คำที่บันทึก',
  chat: 'แชท',
};

const vocabularyJa: VocabularyTabStrings = {
  title: '単語学習',
  subtitle: 'レベルを選んで始めよう',
  loadingData: '単語データを読み込み中...',
  loadingProgress: '読み込み中',
  hangulPuzzle: 'ハングルパズル',
  hangulPuzzleHint: 'ローマ字からハングルを組み立てよう',
  review: '復習',
  reviewNone: 'なし',
  reviewHintActive: (max) => `1回の復習で最大${max}問。苦手な単語・難問も出題されます。タップして始める`,
  reviewHintEmpty: '単語クイズで間違えた単語がここにたまります。単語タブで練習しよう',
  reviewAlertTitle: '本日の復習はありません',
  reviewAlertMessage: '単語クイズで間違えた単語がここにたまります。レッスンを進めると復習が出てきます。',
  sectionLessons: '単語レッスン',
  levelLabels: ['入門', '基本日常会話', '日常会話', 'ニュース理解', 'ビジネス', '高度な文章読解'],
  topikLevelTitle: (level) => `TOPIK ${level}級`,
  paywalledA11y: '有料',
  reviewCardA11yActive: (count) => `復習 ${count} 件、タップして開始`,
  reviewCountBadge: (count) => `${count} 件`,
  levelLessonCount: (count) => `${count} レッスン`,
  reviewCardEmptyHint: 'タップで説明を表示',
};
const vocabularyEn: VocabularyTabStrings = {
  title: 'Vocabulary',
  subtitle: 'Pick a level to start',
  loadingData: 'Loading vocabulary data...',
  loadingProgress: 'Loading...',
  hangulPuzzle: 'Hangul puzzle',
  hangulPuzzleHint: 'Build Hangul from romanization',
  review: 'Review',
  reviewNone: 'None',
  reviewHintActive: (max) => `Up to ${max} questions per session. Tap to start`,
  reviewHintEmpty: 'Words you miss in quizzes appear here. Practice in vocabulary lessons.',
  reviewAlertTitle: 'No review for today',
  reviewAlertMessage: 'Words you miss in quizzes will show up here. Keep studying lessons to get reviews.',
  sectionLessons: 'Vocabulary lessons',
  levelLabels: ['Intro', 'Basic conversation', 'Daily conversation', 'News', 'Business', 'Advanced reading'],
  topikLevelTitle: (level) => `TOPIK Level ${level}`,
  paywalledA11y: 'PRO only',
  reviewCardA11yActive: (count) => `Review ${count} words, tap to start`,
  reviewCountBadge: (count) => `${count}`,
  levelLessonCount: (count) => `${count} lesson${count === 1 ? '' : 's'}`,
  reviewCardEmptyHint: 'Tap for details',
};

const vocabularyZh: VocabularyTabStrings = {
  title: '单词学习',
  subtitle: '选择等级开始学习',
  loadingData: '正在加载单词数据…',
  loadingProgress: '加载中',
  hangulPuzzle: '韩文拼图',
  hangulPuzzleHint: '用罗马字拼出韩文',
  review: '复习',
  reviewNone: '无',
  reviewHintActive: (max) => `每次最多 ${max} 题。点按开始`,
  reviewHintEmpty: '测验中答错的单词会出现在这里。',
  reviewAlertTitle: '今天没有复习',
  reviewAlertMessage: '答错的单词会显示在这里。继续学习以获得更多复习。',
  sectionLessons: '单词课程',
  levelLabels: ['入门', '基础会话', '日常会话', '新闻', '商务', '高级阅读'],
  topikLevelTitle: (level) => `TOPIK ${level} 级`,
  paywalledA11y: '仅 PRO',
  reviewCardA11yActive: (count) => `复习 ${count} 条，点按开始`,
  reviewCountBadge: (count) => `${count} 条`,
  levelLessonCount: (count) => `${count} 课`,
  reviewCardEmptyHint: '点按查看说明',
};

const vocabularyVi: VocabularyTabStrings = {
  title: 'Từ vựng',
  subtitle: 'Chọn cấp để bắt đầu',
  loadingData: 'Đang tải dữ liệu từ vựng…',
  loadingProgress: 'Đang tải',
  hangulPuzzle: 'Xếp Hangul',
  hangulPuzzleHint: 'Ghép Hangul từ phiên âm Latin',
  review: 'Ôn tập',
  reviewNone: 'Không',
  reviewHintActive: (max) => `Tối đa ${max} câu mỗi lần. Chạm để bắt đầu`,
  reviewHintEmpty: 'Từ sai trong quiz sẽ xuất hiện ở đây.',
  reviewAlertTitle: 'Hôm nay không có ôn tập',
  reviewAlertMessage: 'Từ sai sẽ hiện ở đây. Tiếp tục học để có ôn tập.',
  sectionLessons: 'Bài từ vựng',
  levelLabels: ['Nhập môn', 'Hội thoại cơ bản', 'Hội thoại hàng ngày', 'Tin tức', 'Kinh doanh', 'Đọc nâng cao'],
  topikLevelTitle: (level) => `TOPIK cấp ${level}`,
  paywalledA11y: 'Chỉ PRO',
  reviewCardA11yActive: (count) => `Ôn tập ${count} từ, chạm để bắt đầu`,
  reviewCountBadge: (count) => `${count}`,
  levelLessonCount: (count) => `${count} bài`,
  reviewCardEmptyHint: 'Chạm để xem chi tiết',
};

const vocabularyEs: VocabularyTabStrings = {
  title: 'Vocabulario',
  subtitle: 'Elige un nivel para empezar',
  loadingData: 'Cargando vocabulario…',
  loadingProgress: 'Cargando',
  hangulPuzzle: 'Puzzle Hangul',
  hangulPuzzleHint: 'Construye Hangul desde romanización',
  review: 'Repaso',
  reviewNone: 'Ninguno',
  reviewHintActive: (max) => `Hasta ${max} preguntas por sesión. Toca para empezar`,
  reviewHintEmpty: 'Las palabras falladas en el quiz aparecerán aquí.',
  reviewAlertTitle: 'No hay repaso hoy',
  reviewAlertMessage: 'Las palabras falladas aparecerán aquí. Sigue estudiando.',
  sectionLessons: 'Lecciones de vocabulario',
  levelLabels: ['Intro', 'Conversación básica', 'Conversación diaria', 'Noticias', 'Negocios', 'Lectura avanzada'],
  topikLevelTitle: (level) => `TOPIK nivel ${level}`,
  paywalledA11y: 'Solo PRO',
  reviewCardA11yActive: (count) => `Repaso ${count} palabras, toca para empezar`,
  reviewCountBadge: (count) => `${count}`,
  levelLessonCount: (count) => `${count} lección${count === 1 ? '' : 'es'}`,
  reviewCardEmptyHint: 'Toca para detalles',
};

const vocabularyId: VocabularyTabStrings = {
  title: 'Kosakata',
  subtitle: 'Pilih level untuk mulai',
  loadingData: 'Memuat data kosakata…',
  loadingProgress: 'Memuat',
  hangulPuzzle: 'Teka-teki Hangul',
  hangulPuzzleHint: 'Susun Hangul dari romanisasi',
  review: 'Review',
  reviewNone: 'Tidak ada',
  reviewHintActive: (max) => `Maks. ${max} soal per sesi. Ketuk untuk mulai`,
  reviewHintEmpty: 'Kata yang salah di kuis akan muncul di sini.',
  reviewAlertTitle: 'Tidak ada review hari ini',
  reviewAlertMessage: 'Kata yang salah akan muncul di sini. Terus belajar.',
  sectionLessons: 'Pelajaran kosakata',
  levelLabels: ['Pengantar', 'Percakapan dasar', 'Percakapan sehari-hari', 'Berita', 'Bisnis', 'Bacaan lanjut'],
  topikLevelTitle: (level) => `TOPIK Level ${level}`,
  paywalledA11y: 'Hanya PRO',
  reviewCardA11yActive: (count) => `Review ${count} kata, ketuk untuk mulai`,
  reviewCountBadge: (count) => `${count}`,
  levelLessonCount: (count) => `${count} pelajaran`,
  reviewCardEmptyHint: 'Ketuk untuk detail',
};

const vocabularyTh: VocabularyTabStrings = {
  title: 'คำศัพท์',
  subtitle: 'เลือกระดับเพื่อเริ่ม',
  loadingData: 'กำลังโหลดคำศัพท์…',
  loadingProgress: 'กำลังโหลด',
  hangulPuzzle: 'ปริศนาฮันกึล',
  hangulPuzzleHint: 'ประกอบฮันกึลจากโรมัน',
  review: 'ทบทวน',
  reviewNone: 'ไม่มี',
  reviewHintActive: (max) => `สูงสุด ${max} ข้อต่อรอบ แตะเพื่อเริ่ม`,
  reviewHintEmpty: 'คำที่ตอบผิดในควิซจะมาที่นี่',
  reviewAlertTitle: 'วันนี้ไม่มีทบทวน',
  reviewAlertMessage: 'คำที่ตอบผิดจะแสดงที่นี่ เรียนต่อเพื่อได้ทบทวน',
  sectionLessons: 'บทคำศัพท์',
  levelLabels: ['เบื้องต้น', 'สนทนาพื้นฐาน', 'สนทนาประจำวัน', 'ข่าว', 'ธุรกิจ', 'อ่านขั้นสูง'],
  topikLevelTitle: (level) => `TOPIK ระดับ ${level}`,
  paywalledA11y: 'เฉพาะ PRO',
  reviewCardA11yActive: (count) => `ทบทวน ${count} คำ แตะเพื่อเริ่ม`,
  reviewCountBadge: (count) => `${count}`,
  levelLessonCount: (count) => `${count} บท`,
  reviewCardEmptyHint: 'แตะเพื่อรายละเอียด',
};

const grammarJa: GrammarTabStrings = {
  title: '文法学習',
  subtitle: 'レベルを選んで始めよう',
  loadingData: '文法データを読み込み中...',
  loadingProgress: '読み込み中',
  sectionLessons: '文法レッスン',
  levelLabels: ['TOPIK 1級', 'TOPIK 2級', 'TOPIK 3級', 'TOPIK 4級', 'TOPIK 5級', 'TOPIK 6級'],
  supabaseHint:
    '文法データは Supabase の grammar/ko_ja/grammar.json（日本語訳）または grammar/ko_en/grammar.json（英語訳）で管理されています。下に引いて再取得できます。',
  noLessonsTitle: 'レッスン準備中',
  noLessonsMessage: 'このレベルの文法データはまだ読み込めていません。通信を確認するか、しばらくしてから再度お試しください。',
  noLessonsOk: 'OK',
  topikLevelTitle: (level) => `TOPIK ${level}級`,
  lessonCountLabel: (count) => `${count} レッスン`,
  lessonListHint: 'タップして文法を確認し、クイズに挑戦',
  meaningLabel: '意味',
  shapeLabel: '形',
  examplesLabel: '例文',
  lessonEmpty: 'このレッスンのデータはありません。',
  examplesPlaceholder: '例文は準備中です。',
  quizStart: 'クイズ開始',
  quizPreparing: 'クイズは準備中です',
  quizButtonDisabledShort: '準備中',
  speakGrammarA11y: '文法を読み上げる',
  speakExampleA11y: '例文を読み上げる',
  backA11y: '戻る',
  clearedA11y: 'クリア済み',
};
const grammarEn: GrammarTabStrings = {
  title: 'Grammar',
  subtitle: 'Pick a level to start',
  loadingData: 'Loading grammar data...',
  loadingProgress: 'Loading...',
  sectionLessons: 'Grammar lessons',
  levelLabels: [
    'TOPIK Level 1',
    'TOPIK Level 2',
    'TOPIK Level 3',
    'TOPIK Level 4',
    'TOPIK Level 5',
    'TOPIK Level 6',
  ],
  supabaseHint:
    'Grammar JSON lives at grammar/ko_en/grammar.json (English) or grammar/ko_ja/grammar.json (Japanese) in the content bucket. Pull down to refresh.',
  noLessonsTitle: 'Lessons not ready',
  noLessonsMessage: 'Grammar data for this level is not loaded yet. Check your connection or try again later.',
  noLessonsOk: 'OK',
  topikLevelTitle: (level) => `TOPIK Level ${level}`,
  lessonCountLabel: (count) => `${count} lesson${count === 1 ? '' : 's'}`,
  lessonListHint: 'Tap a lesson to study, then take the quiz.',
  meaningLabel: 'Meaning',
  shapeLabel: 'Form',
  examplesLabel: 'Examples',
  lessonEmpty: 'No data for this lesson.',
  examplesPlaceholder: 'Examples coming soon.',
  quizStart: 'Start quiz',
  quizPreparing: 'Quiz not ready',
  quizButtonDisabledShort: 'Not ready',
  speakGrammarA11y: 'Speak grammar title',
  speakExampleA11y: 'Speak example',
  backA11y: 'Back',
  clearedA11y: 'Completed',
};

const grammarZh: GrammarTabStrings = {
  title: '语法学习',
  subtitle: '选择等级开始学习',
  loadingData: '正在加载语法数据…',
  loadingProgress: '加载中',
  sectionLessons: '语法课程',
  levelLabels: ['TOPIK 1 级', 'TOPIK 2 级', 'TOPIK 3 级', 'TOPIK 4 级', 'TOPIK 5 级', 'TOPIK 6 级'],
  supabaseHint:
    '语法 JSON 位于 Storage 的 grammar/ko_zh/grammar.json 等路径。下拉可刷新。',
  noLessonsTitle: '课程准备中',
  noLessonsMessage: '该等级的语法数据尚未加载。请检查网络或稍后重试。',
  noLessonsOk: '确定',
  topikLevelTitle: (level) => `TOPIK ${level} 级`,
  lessonCountLabel: (count) => `${count} 课`,
  lessonListHint: '点按学习并完成测验',
  meaningLabel: '含义',
  shapeLabel: '形式',
  examplesLabel: '例句',
  lessonEmpty: '本课暂无数据。',
  examplesPlaceholder: '例句准备中。',
  quizStart: '开始测验',
  quizPreparing: '测验准备中',
  quizButtonDisabledShort: '准备中',
  speakGrammarA11y: '朗读语法',
  speakExampleA11y: '朗读例句',
  backA11y: '返回',
  clearedA11y: '已完成',
};

const grammarVi: GrammarTabStrings = {
  title: 'Ngữ pháp',
  subtitle: 'Chọn cấp để bắt đầu',
  loadingData: 'Đang tải dữ liệu ngữ pháp…',
  loadingProgress: 'Đang tải',
  sectionLessons: 'Bài ngữ pháp',
  levelLabels: [
    'TOPIK cấp 1',
    'TOPIK cấp 2',
    'TOPIK cấp 3',
    'TOPIK cấp 4',
    'TOPIK cấp 5',
    'TOPIK cấp 6',
  ],
  supabaseHint:
    'File ngữ pháp nằm tại grammar/ko_vi/grammar.json trong bucket. Kéo xuống để làm mới.',
  noLessonsTitle: 'Bài chưa sẵn sàng',
  noLessonsMessage: 'Dữ liệu ngữ pháp chưa tải. Kiểm tra mạng hoặc thử lại sau.',
  noLessonsOk: 'OK',
  topikLevelTitle: (level) => `TOPIK cấp ${level}`,
  lessonCountLabel: (count) => `${count} bài`,
  lessonListHint: 'Chạm để học rồi làm quiz.',
  meaningLabel: 'Nghĩa',
  shapeLabel: 'Cấu trúc',
  examplesLabel: 'Ví dụ',
  lessonEmpty: 'Không có dữ liệu cho bài này.',
  examplesPlaceholder: 'Ví dụ sẽ có sau.',
  quizStart: 'Bắt đầu quiz',
  quizPreparing: 'Quiz chưa sẵn sàng',
  quizButtonDisabledShort: 'Chưa sẵn sàng',
  speakGrammarA11y: 'Đọc mục ngữ pháp',
  speakExampleA11y: 'Đọc ví dụ',
  backA11y: 'Quay lại',
  clearedA11y: 'Đã xong',
};

const grammarEs: GrammarTabStrings = {
  title: 'Gramática',
  subtitle: 'Elige un nivel para empezar',
  loadingData: 'Cargando gramática…',
  loadingProgress: 'Cargando',
  sectionLessons: 'Lecciones de gramática',
  levelLabels: [
    'TOPIK nivel 1',
    'TOPIK nivel 2',
    'TOPIK nivel 3',
    'TOPIK nivel 4',
    'TOPIK nivel 5',
    'TOPIK nivel 6',
  ],
  supabaseHint:
    'El JSON está en grammar/ko_es/grammar.json del bucket. Desliza para actualizar.',
  noLessonsTitle: 'Lecciones no listas',
  noLessonsMessage: 'Los datos de gramática aún no se han cargado. Comprueba la conexión.',
  noLessonsOk: 'OK',
  topikLevelTitle: (level) => `TOPIK nivel ${level}`,
  lessonCountLabel: (count) => `${count} lección${count === 1 ? '' : 'es'}`,
  lessonListHint: 'Toca una lección y luego el quiz.',
  meaningLabel: 'Significado',
  shapeLabel: 'Forma',
  examplesLabel: 'Ejemplos',
  lessonEmpty: 'No hay datos para esta lección.',
  examplesPlaceholder: 'Ejemplos próximamente.',
  quizStart: 'Empezar quiz',
  quizPreparing: 'Quiz no listo',
  quizButtonDisabledShort: 'No listo',
  speakGrammarA11y: 'Leer gramática',
  speakExampleA11y: 'Leer ejemplo',
  backA11y: 'Atrás',
  clearedA11y: 'Hecho',
};

const grammarId: GrammarTabStrings = {
  title: 'Tata bahasa',
  subtitle: 'Pilih level untuk mulai',
  loadingData: 'Memuat data tata bahasa…',
  loadingProgress: 'Memuat',
  sectionLessons: 'Pelajaran tata bahasa',
  levelLabels: [
    'TOPIK Level 1',
    'TOPIK Level 2',
    'TOPIK Level 3',
    'TOPIK Level 4',
    'TOPIK Level 5',
    'TOPIK Level 6',
  ],
  supabaseHint:
    'JSON tata bahasa ada di grammar/ko_id/grammar.json di bucket. Tarik untuk menyegarkan.',
  noLessonsTitle: 'Pelajaran belum siap',
  noLessonsMessage: 'Data belum dimuat. Periksa koneksi atau coba lagi nanti.',
  noLessonsOk: 'OK',
  topikLevelTitle: (level) => `TOPIK Level ${level}`,
  lessonCountLabel: (count) => `${count} pelajaran`,
  lessonListHint: 'Ketuk pelajaran lalu kerjakan kuis.',
  meaningLabel: 'Arti',
  shapeLabel: 'Bentuk',
  examplesLabel: 'Contoh',
  lessonEmpty: 'Tidak ada data untuk pelajaran ini.',
  examplesPlaceholder: 'Contoh akan menyusul.',
  quizStart: 'Mulai kuis',
  quizPreparing: 'Kuis belum siap',
  quizButtonDisabledShort: 'Belum siap',
  speakGrammarA11y: 'Baca judul tata bahasa',
  speakExampleA11y: 'Baca contoh',
  backA11y: 'Kembali',
  clearedA11y: 'Selesai',
};

const grammarTh: GrammarTabStrings = {
  title: 'ไวยากรณ์',
  subtitle: 'เลือกระดับเพื่อเริ่ม',
  loadingData: 'กำลังโหลดไวยากรณ์…',
  loadingProgress: 'กำลังโหลด',
  sectionLessons: 'บทไวยากรณ์',
  levelLabels: [
    'TOPIK ระดับ 1',
    'TOPIK ระดับ 2',
    'TOPIK ระดับ 3',
    'TOPIK ระดับ 4',
    'TOPIK ระดับ 5',
    'TOPIK ระดับ 6',
  ],
  supabaseHint:
    'ไฟล์อยู่ที่ grammar/ko_th/grammar.json ใน bucket ดึงลงเพื่อรีเฟรช',
  noLessonsTitle: 'บทยังไม่พร้อม',
  noLessonsMessage: 'ยังโหลดข้อมูลไม่ได้ ตรวจสอบเครือข่ายหรือลองใหม่',
  noLessonsOk: 'ตกลง',
  topikLevelTitle: (level) => `TOPIK ระดับ ${level}`,
  lessonCountLabel: (count) => `${count} บท`,
  lessonListHint: 'แตะบทเรียนแล้วทำแบบทดสอบ',
  meaningLabel: 'ความหมาย',
  shapeLabel: 'รูปแบบ',
  examplesLabel: 'ตัวอย่าง',
  lessonEmpty: 'ไม่มีข้อมูลบทนี้',
  examplesPlaceholder: 'ตัวอย่างจะตามมา',
  quizStart: 'เริ่มควิซ',
  quizPreparing: 'ควิซยังไม่พร้อม',
  quizButtonDisabledShort: 'ยังไม่พร้อม',
  speakGrammarA11y: 'อ่านหัวข้อไวยากรณ์',
  speakExampleA11y: 'อ่านตัวอย่าง',
  backA11y: 'กลับ',
  clearedA11y: 'เสร็จแล้ว',
};

const chatJa: ChatTabStrings = {
  title: 'チャット',
  loading: '読み込み中...',
  loadFailed: '読み込みに失敗しました',
  retry: '再試行',
  supabaseNotConfigured: 'チャットは Supabase 設定後に利用できます',
  noRoom: 'ルームがありません\nSupabase でマイグレーションを実行してください',
  sendFailedTitle: '送信できませんでした',
  sendFailedMessage: 'ネットワークを確認してください。',
  sendFailedAuthMessage: 'ログインの有効期限が切れています。設定から一度ログアウトして、再度ログインしてください。',
  today: '今日',
  yesterday: '昨日',
  guest: 'ゲスト',
  reconnectA11y: '再接続する',
  reconnectBanner: '接続できませんでした。タップして再接続',
  emptyMessages: 'メッセージがまだありません。最初の一言を送ろう！',
  loginToChat: 'ログインしてからチャットに参加できます',
  loginButton: 'ログイン',
  loginButtonA11y: 'ログインする',
  proOnly: 'PRO会員になるとメッセージを送信できます',
  proButton: 'PROを試す',
  proButtonA11y: 'PROを試す',
  messagePlaceholder: 'メッセージ...',
  messageInputA11y: 'メッセージを入力',
  sendA11y: '送信',
  chatListA11y: 'チャットメッセージ一覧',
  roomPickerA11y: 'チャットルームを選択',
  scrollToBottomA11y: '一番下へ',
  offlineCannotSend: 'オフラインのため送信できません',
  realtimeSubscribeError: '接続できませんでした。タップして再接続',
  noOlderMessages: 'これより前の履歴はありません',
  loginRequiredForChat: 'チャットを利用するにはログインが必要です',
  chatRestricted: 'このアカウントではチャットを利用できません',
  termsModalTitle: 'チャット利用規約への同意',
  termsModalBody:
    '不適切な投稿・嫌がらせ・暴言を禁止します。違反時は投稿削除・利用停止となる場合があります。チャット利用前に規約へ同意してください。',
  termsConsentCheckbox: '規約に同意し、違反コンテンツを投稿しないことを確認します',
  termsConsentCheckboxA11y: 'チャット利用規約への同意チェック',
  termsAgree: '同意して続行',
  termsAgreeA11y: '規約に同意して続行',
  termsDecline: '同意しない',
  termsDeclineA11y: '規約に同意せず戻る',
  termsAgreeFailedTitle: '同意を保存できませんでした',
  termsAgreeFailedBody: '通信状況を確認して、もう一度お試しください。',
  openTerms: '利用規約を開く',
  openTermsA11y: '利用規約をブラウザで開く',
  userActionA11y: (name) => `${name} に対する操作を開く`,
  userActionTitle: 'ユーザーへの操作',
  replyAction: '返信',
  replyingTo: '返信先',
  replyToUserLabel: (name) => `${name} に返信`,
  originalMessage: '元メッセージ',
  reportAction: 'この投稿を報告',
  blockAction: 'このユーザーをブロック',
  blockConfirmTitle: 'このユーザーをブロックしますか？',
  blockConfirmBody: 'ブロックすると、このユーザーのメッセージはチャットで表示されなくなります。',
  unblockAction: 'ブロックを解除',
  reportReasonTitle: '報告理由を選択',
  blockReasonTitle: 'ブロック理由を選択',
  reportReasonSpam: 'スパム',
  reportReasonHarassment: '嫌がらせ',
  reportReasonHate: 'ヘイト・差別',
  reportReasonSexual: '性的な内容',
  reportReasonViolence: '暴力的な内容',
  reportReasonSelfHarm: '自傷・自殺に関する内容',
  reportReasonOther: 'その他',
  reportSubmitAction: '報告する',
  reportSuccessTitle: '報告を受け付けました',
  reportSuccessBody: '24時間以内に確認し、必要な対応を行います。',
  reportFailedTitle: '報告に失敗しました',
  reportFailedBody: 'しばらくしてからもう一度お試しください。',
  blockSuccessTitle: 'ブロックしました',
  blockSuccessBody: 'このユーザーの投稿はすぐに表示されなくなります。',
  blockFailedTitle: 'ブロックに失敗しました',
  blockFailedBody: 'しばらくしてからもう一度お試しください。',
  manageBlockedUsers: 'ブロック中ユーザーを管理',
  blockedUsersTitle: 'ブロック中のユーザー',
  noBlockedUsers: 'ブロック中のユーザーはいません',
  blockedUserNameLabel: '名前',
  unblockSuccessTitle: 'ブロックを解除しました',
  unblockSuccessBody: 'このユーザーのメッセージを再表示できます。',
  unblockFailedTitle: 'ブロック解除に失敗しました',
  unblockFailedBody: 'しばらくしてからもう一度お試しください。',
  copyAction: 'コピー',
  copySuccessTitle: 'コピーしました',
  copySuccessBody: 'メッセージをコピーしました。',
  cancel: 'キャンセル',
};
const chatEn: ChatTabStrings = {
  title: 'Chat',
  loading: 'Loading...',
  loadFailed: 'Failed to load',
  retry: 'Retry',
  supabaseNotConfigured: 'Chat is available after Supabase is configured.',
  noRoom: 'No chat room.\nRun Supabase migrations.',
  sendFailedTitle: 'Could not send',
  sendFailedMessage: 'Please check your network.',
  sendFailedAuthMessage: 'Your session expired. Please sign out and sign in again.',
  today: 'Today',
  yesterday: 'Yesterday',
  guest: 'Guest',
  reconnectA11y: 'Reconnect',
  reconnectBanner: 'Disconnected. Tap to reconnect',
  emptyMessages: 'No messages yet. Say hello!',
  loginToChat: 'Sign in to join the chat',
  loginButton: 'Sign in',
  loginButtonA11y: 'Sign in',
  proOnly: 'PRO members can send messages',
  proButton: 'Try PRO',
  proButtonA11y: 'Try PRO',
  messagePlaceholder: 'Message…',
  messageInputA11y: 'Message input',
  sendA11y: 'Send',
  chatListA11y: 'Chat messages',
  roomPickerA11y: 'Select chat room',
  scrollToBottomA11y: 'Scroll to bottom',
  offlineCannotSend: 'You are offline. Connect to send.',
  realtimeSubscribeError: 'Could not connect. Tap to reconnect.',
  noOlderMessages: 'No older messages',
  loginRequiredForChat: 'Sign in is required to access chat.',
  chatRestricted: 'This account is restricted from chat.',
  termsModalTitle: 'Agree to Chat Terms',
  termsModalBody:
    'Objectionable content and abusive behavior are not tolerated. Violations may result in content removal and account restriction.',
  termsConsentCheckbox: 'I agree to the chat terms and community safety rules.',
  termsConsentCheckboxA11y: 'Agree to chat terms checkbox',
  termsAgree: 'Agree and continue',
  termsAgreeA11y: 'Agree to terms and continue',
  termsDecline: 'Decline',
  termsDeclineA11y: 'Decline terms and go back',
  termsAgreeFailedTitle: 'Could not save agreement',
  termsAgreeFailedBody: 'Please check your connection and try again.',
  openTerms: 'Open Terms of Use',
  openTermsA11y: 'Open Terms of Use in browser',
  userActionA11y: (name) => `Open actions for ${name}`,
  userActionTitle: 'User actions',
  replyAction: 'Reply',
  replyingTo: 'Replying to',
  replyToUserLabel: (name) => `Replying to ${name}`,
  originalMessage: 'Original message',
  reportAction: 'Report this message',
  blockAction: 'Block this user',
  blockConfirmTitle: 'Block this user?',
  blockConfirmBody: 'Blocked users\' messages will be hidden in chat.',
  unblockAction: 'Unblock',
  reportReasonTitle: 'Select report reason',
  blockReasonTitle: 'Select block reason',
  reportReasonSpam: 'Spam',
  reportReasonHarassment: 'Harassment',
  reportReasonHate: 'Hate speech',
  reportReasonSexual: 'Sexual content',
  reportReasonViolence: 'Violence',
  reportReasonSelfHarm: 'Self-harm',
  reportReasonOther: 'Other',
  reportSubmitAction: 'Submit report',
  reportSuccessTitle: 'Report submitted',
  reportSuccessBody: 'We review reports within 24 hours.',
  reportFailedTitle: 'Report failed',
  reportFailedBody: 'Please try again later.',
  blockSuccessTitle: 'User blocked',
  blockSuccessBody: 'Their messages are removed from your feed immediately.',
  blockFailedTitle: 'Block failed',
  blockFailedBody: 'Please try again later.',
  manageBlockedUsers: 'Manage blocked users',
  blockedUsersTitle: 'Blocked users',
  noBlockedUsers: 'No blocked users',
  blockedUserNameLabel: 'Name',
  unblockSuccessTitle: 'User unblocked',
  unblockSuccessBody: 'Their messages can be shown in chat again.',
  unblockFailedTitle: 'Unblock failed',
  unblockFailedBody: 'Please try again later.',
  copyAction: 'Copy',
  copySuccessTitle: 'Copied',
  copySuccessBody: 'Message copied to clipboard.',
  cancel: 'Cancel',
};

const chatZh: ChatTabStrings = {
  title: '聊天',
  loading: '加载中…',
  loadFailed: '加载失败',
  retry: '重试',
  supabaseNotConfigured: '配置 Supabase 后可使用聊天',
  noRoom: '暂无聊天室\n请运行 Supabase 迁移',
  sendFailedTitle: '发送失败',
  sendFailedMessage: '请检查网络。',
  sendFailedAuthMessage: '登录已过期，请退出后重新登录。',
  today: '今天',
  yesterday: '昨天',
  guest: '访客',
  reconnectA11y: '重新连接',
  reconnectBanner: '已断开，点按重连',
  emptyMessages: '还没有消息，打个招呼吧！',
  loginToChat: '登录后即可参与聊天',
  loginButton: '登录',
  loginButtonA11y: '登录',
  proOnly: 'PRO 会员可发送消息',
  proButton: '试用 PRO',
  proButtonA11y: '试用 PRO',
  messagePlaceholder: '消息…',
  messageInputA11y: '输入消息',
  sendA11y: '发送',
  chatListA11y: '聊天消息列表',
  roomPickerA11y: '选择聊天室',
  scrollToBottomA11y: '滚动到底部',
  offlineCannotSend: '离线无法发送',
  realtimeSubscribeError: '连接失败，点按重试',
  noOlderMessages: '没有更早的消息',
  loginRequiredForChat: '使用聊天前请先登录',
  chatRestricted: '该账号当前无法使用聊天',
  termsModalTitle: '同意聊天使用条款',
  termsModalBody: '禁止不良内容与辱骂行为，违规可能被删除内容并限制账号。',
  termsConsentCheckbox: '我同意聊天条款与社区安全规则',
  termsConsentCheckboxA11y: '同意聊天条款复选框',
  termsAgree: '同意并继续',
  termsAgreeA11y: '同意条款并继续',
  termsDecline: '不同意',
  termsDeclineA11y: '不同意并返回',
  termsAgreeFailedTitle: '无法保存同意',
  termsAgreeFailedBody: '请检查网络后重试。',
  openTerms: '打开使用条款',
  openTermsA11y: '在浏览器中打开使用条款',
  userActionA11y: (name) => `打开对 ${name} 的操作`,
  userActionTitle: '用户操作',
  replyAction: '回复',
  replyingTo: '回复给',
  replyToUserLabel: (name) => `回复给 ${name}`,
  originalMessage: '原消息',
  reportAction: '举报该消息',
  blockAction: '屏蔽该用户',
  blockConfirmTitle: '要屏蔽该用户吗？',
  blockConfirmBody: '屏蔽后，该用户的消息将不再显示在聊天中。',
  unblockAction: '解除屏蔽',
  reportReasonTitle: '选择举报原因',
  blockReasonTitle: '选择屏蔽原因',
  reportReasonSpam: '垃圾信息',
  reportReasonHarassment: '骚扰',
  reportReasonHate: '仇恨/歧视',
  reportReasonSexual: '色情内容',
  reportReasonViolence: '暴力内容',
  reportReasonSelfHarm: '自伤/自杀',
  reportReasonOther: '其他',
  reportSubmitAction: '提交举报',
  reportSuccessTitle: '已提交举报',
  reportSuccessBody: '我们会在24小时内处理。',
  reportFailedTitle: '举报失败',
  reportFailedBody: '请稍后重试。',
  blockSuccessTitle: '已屏蔽用户',
  blockSuccessBody: '该用户消息将立即从你的列表中移除。',
  blockFailedTitle: '屏蔽失败',
  blockFailedBody: '请稍后重试。',
  manageBlockedUsers: '管理已屏蔽用户',
  blockedUsersTitle: '已屏蔽用户',
  noBlockedUsers: '暂无已屏蔽用户',
  blockedUserNameLabel: '名称',
  unblockSuccessTitle: '已解除屏蔽',
  unblockSuccessBody: '该用户消息可再次显示。',
  unblockFailedTitle: '解除屏蔽失败',
  unblockFailedBody: '请稍后重试。',
  copyAction: '复制',
  copySuccessTitle: '已复制',
  copySuccessBody: '消息已复制到剪贴板。',
  cancel: '取消',
};

const chatVi: ChatTabStrings = {
  title: 'Chat',
  loading: 'Đang tải…',
  loadFailed: 'Tải thất bại',
  retry: 'Thử lại',
  supabaseNotConfigured: 'Chat khả dụng sau khi cấu hình Supabase.',
  noRoom: 'Chưa có phòng chat.\nChạy migration Supabase.',
  sendFailedTitle: 'Không gửi được',
  sendFailedMessage: 'Hãy kiểm tra mạng.',
  sendFailedAuthMessage: 'Phiên đăng nhập đã hết hạn. Đăng xuất rồi đăng nhập lại.',
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  guest: 'Khách',
  reconnectA11y: 'Kết nối lại',
  reconnectBanner: 'Mất kết nối. Chạm để kết nối lại',
  emptyMessages: 'Chưa có tin nhắn. Chào nhé!',
  loginToChat: 'Đăng nhập để tham gia chat',
  loginButton: 'Đăng nhập',
  loginButtonA11y: 'Đăng nhập',
  proOnly: 'Thành viên PRO mới gửi tin được',
  proButton: 'Dùng thử PRO',
  proButtonA11y: 'Dùng thử PRO',
  messagePlaceholder: 'Tin nhắn…',
  messageInputA11y: 'Ô nhập tin',
  sendA11y: 'Gửi',
  chatListA11y: 'Danh sách tin nhắn',
  roomPickerA11y: 'Chọn phòng chat',
  scrollToBottomA11y: 'Cuối danh sách',
  offlineCannotSend: 'Ngoại tuyến, không gửi được',
  realtimeSubscribeError: 'Không kết nối được. Chạm để thử lại.',
  noOlderMessages: 'Không còn tin cũ hơn',
  loginRequiredForChat: 'Bạn cần đăng nhập để dùng chat.',
  chatRestricted: 'Tài khoản này bị hạn chế chat.',
  termsModalTitle: 'Đồng ý điều khoản chat',
  termsModalBody: 'Không chấp nhận nội dung phản cảm hoặc lạm dụng. Vi phạm có thể bị khóa.',
  termsConsentCheckbox: 'Tôi đồng ý điều khoản chat và quy tắc cộng đồng',
  termsConsentCheckboxA11y: 'Ô chọn đồng ý điều khoản chat',
  termsAgree: 'Đồng ý và tiếp tục',
  termsAgreeA11y: 'Đồng ý điều khoản và tiếp tục',
  termsDecline: 'Không đồng ý',
  termsDeclineA11y: 'Không đồng ý và quay lại',
  termsAgreeFailedTitle: 'Không lưu được đồng ý',
  termsAgreeFailedBody: 'Vui lòng kiểm tra mạng và thử lại.',
  openTerms: 'Mở điều khoản sử dụng',
  openTermsA11y: 'Mở điều khoản bằng trình duyệt',
  userActionA11y: (name) => `Mở thao tác cho ${name}`,
  userActionTitle: 'Thao tác người dùng',
  replyAction: 'Trả lời',
  replyingTo: 'Đang trả lời',
  replyToUserLabel: (name) => `Đang trả lời ${name}`,
  originalMessage: 'Tin nhắn gốc',
  reportAction: 'Báo cáo tin nhắn',
  blockAction: 'Chặn người dùng',
  blockConfirmTitle: 'Chặn người dùng này?',
  blockConfirmBody: 'Khi bị chặn, tin nhắn của họ sẽ bị ẩn trong chat.',
  unblockAction: 'Bỏ chặn',
  reportReasonTitle: 'Chọn lý do báo cáo',
  blockReasonTitle: 'Chọn lý do chặn',
  reportReasonSpam: 'Spam',
  reportReasonHarassment: 'Quấy rối',
  reportReasonHate: 'Thù ghét/kỳ thị',
  reportReasonSexual: 'Nội dung tình dục',
  reportReasonViolence: 'Nội dung bạo lực',
  reportReasonSelfHarm: 'Tự hại/tự tử',
  reportReasonOther: 'Khác',
  reportSubmitAction: 'Gửi báo cáo',
  reportSuccessTitle: 'Đã gửi báo cáo',
  reportSuccessBody: 'Chúng tôi sẽ xử lý trong 24 giờ.',
  reportFailedTitle: 'Báo cáo thất bại',
  reportFailedBody: 'Vui lòng thử lại sau.',
  blockSuccessTitle: 'Đã chặn người dùng',
  blockSuccessBody: 'Tin nhắn của người này đã được ẩn ngay.',
  blockFailedTitle: 'Chặn thất bại',
  blockFailedBody: 'Vui lòng thử lại sau.',
  manageBlockedUsers: 'Quản lý người dùng đã chặn',
  blockedUsersTitle: 'Người dùng đã chặn',
  noBlockedUsers: 'Không có người dùng bị chặn',
  blockedUserNameLabel: 'Tên',
  unblockSuccessTitle: 'Đã bỏ chặn',
  unblockSuccessBody: 'Tin nhắn của người này có thể hiển thị lại.',
  unblockFailedTitle: 'Bỏ chặn thất bại',
  unblockFailedBody: 'Vui lòng thử lại sau.',
  copyAction: 'Sao chép',
  copySuccessTitle: 'Đã sao chép',
  copySuccessBody: 'Đã sao chép tin nhắn vào bộ nhớ tạm.',
  cancel: 'Hủy',
};

const chatEs: ChatTabStrings = {
  title: 'Chat',
  loading: 'Cargando…',
  loadFailed: 'Error al cargar',
  retry: 'Reintentar',
  supabaseNotConfigured: 'El chat está disponible tras configurar Supabase.',
  noRoom: 'No hay sala de chat.\nEjecuta las migraciones de Supabase.',
  sendFailedTitle: 'No se pudo enviar',
  sendFailedMessage: 'Comprueba tu red.',
  sendFailedAuthMessage: 'La sesión expiró. Cierra sesión e inicia de nuevo.',
  today: 'Hoy',
  yesterday: 'Ayer',
  guest: 'Invitado',
  reconnectA11y: 'Reconectar',
  reconnectBanner: 'Sin conexión. Toca para reconectar',
  emptyMessages: 'Aún no hay mensajes. ¡Saluda!',
  loginToChat: 'Inicia sesión para chatear',
  loginButton: 'Iniciar sesión',
  loginButtonA11y: 'Iniciar sesión',
  proOnly: 'Los miembros PRO pueden enviar mensajes',
  proButton: 'Probar PRO',
  proButtonA11y: 'Probar PRO',
  messagePlaceholder: 'Mensaje…',
  messageInputA11y: 'Campo de mensaje',
  sendA11y: 'Enviar',
  chatListA11y: 'Mensajes del chat',
  roomPickerA11y: 'Elegir sala de chat',
  scrollToBottomA11y: 'Ir al final',
  offlineCannotSend: 'Sin conexión, no se puede enviar',
  realtimeSubscribeError: 'No se pudo conectar. Toca para reintentar.',
  noOlderMessages: 'No hay mensajes más antiguos',
  loginRequiredForChat: 'Debes iniciar sesión para usar el chat.',
  chatRestricted: 'Esta cuenta tiene el chat restringido.',
  termsModalTitle: 'Aceptar términos del chat',
  termsModalBody: 'No se tolera contenido ofensivo ni abuso. Las infracciones pueden causar bloqueo.',
  termsConsentCheckbox: 'Acepto los términos del chat y reglas de seguridad',
  termsConsentCheckboxA11y: 'Casilla de aceptación de términos del chat',
  termsAgree: 'Aceptar y continuar',
  termsAgreeA11y: 'Aceptar términos y continuar',
  termsDecline: 'No aceptar',
  termsDeclineA11y: 'No aceptar y volver',
  termsAgreeFailedTitle: 'No se pudo guardar',
  termsAgreeFailedBody: 'Comprueba la red e inténtalo de nuevo.',
  openTerms: 'Abrir términos de uso',
  openTermsA11y: 'Abrir términos de uso en el navegador',
  userActionA11y: (name) => `Abrir acciones para ${name}`,
  userActionTitle: 'Acciones de usuario',
  replyAction: 'Responder',
  replyingTo: 'Respondiendo a',
  replyToUserLabel: (name) => `Respondiendo a ${name}`,
  originalMessage: 'Mensaje original',
  reportAction: 'Reportar este mensaje',
  blockAction: 'Bloquear este usuario',
  blockConfirmTitle: '¿Bloquear a este usuario?',
  blockConfirmBody: 'Si lo bloqueas, sus mensajes se ocultarán en el chat.',
  unblockAction: 'Desbloquear',
  reportReasonTitle: 'Selecciona motivo',
  blockReasonTitle: 'Selecciona motivo de bloqueo',
  reportReasonSpam: 'Spam',
  reportReasonHarassment: 'Acoso',
  reportReasonHate: 'Odio/discriminación',
  reportReasonSexual: 'Contenido sexual',
  reportReasonViolence: 'Contenido violento',
  reportReasonSelfHarm: 'Autolesión/suicidio',
  reportReasonOther: 'Otro',
  reportSubmitAction: 'Enviar reporte',
  reportSuccessTitle: 'Reporte enviado',
  reportSuccessBody: 'Revisamos en menos de 24 horas.',
  reportFailedTitle: 'No se pudo reportar',
  reportFailedBody: 'Inténtalo más tarde.',
  blockSuccessTitle: 'Usuario bloqueado',
  blockSuccessBody: 'Sus mensajes se eliminan de tu feed al instante.',
  blockFailedTitle: 'No se pudo bloquear',
  blockFailedBody: 'Inténtalo más tarde.',
  manageBlockedUsers: 'Gestionar usuarios bloqueados',
  blockedUsersTitle: 'Usuarios bloqueados',
  noBlockedUsers: 'No hay usuarios bloqueados',
  blockedUserNameLabel: 'Nombre',
  unblockSuccessTitle: 'Usuario desbloqueado',
  unblockSuccessBody: 'Sus mensajes pueden volver a mostrarse.',
  unblockFailedTitle: 'No se pudo desbloquear',
  unblockFailedBody: 'Inténtalo más tarde.',
  copyAction: 'Copiar',
  copySuccessTitle: 'Copiado',
  copySuccessBody: 'Mensaje copiado al portapapeles.',
  cancel: 'Cancelar',
};

const chatId: ChatTabStrings = {
  title: 'Chat',
  loading: 'Memuat…',
  loadFailed: 'Gagal memuat',
  retry: 'Coba lagi',
  supabaseNotConfigured: 'Chat tersedia setelah Supabase dikonfigurasi.',
  noRoom: 'Belum ada ruang chat.\nJalankan migrasi Supabase.',
  sendFailedTitle: 'Tidak terkirim',
  sendFailedMessage: 'Periksa jaringan Anda.',
  sendFailedAuthMessage: 'Sesi berakhir. Keluar lalu masuk lagi.',
  today: 'Hari ini',
  yesterday: 'Kemarin',
  guest: 'Tamu',
  reconnectA11y: 'Sambungkan lagi',
  reconnectBanner: 'Terputus. Ketuk untuk menyambung lagi',
  emptyMessages: 'Belum ada pesan. Sapa dulu!',
  loginToChat: 'Masuk untuk ikut chat',
  loginButton: 'Masuk',
  loginButtonA11y: 'Masuk',
  proOnly: 'Anggota PRO dapat mengirim pesan',
  proButton: 'Coba PRO',
  proButtonA11y: 'Coba PRO',
  messagePlaceholder: 'Pesan…',
  messageInputA11y: 'Input pesan',
  sendA11y: 'Kirim',
  chatListA11y: 'Daftar pesan',
  roomPickerA11y: 'Pilih ruang chat',
  scrollToBottomA11y: 'Ke bawah',
  offlineCannotSend: 'Offline, tidak bisa kirim',
  realtimeSubscribeError: 'Tidak terhubung. Ketuk untuk coba lagi.',
  noOlderMessages: 'Tidak ada pesan lebih lama',
  loginRequiredForChat: 'Masuk diperlukan untuk menggunakan chat.',
  chatRestricted: 'Akun ini dibatasi dari chat.',
  termsModalTitle: 'Setujui ketentuan chat',
  termsModalBody: 'Konten tidak pantas dan perilaku abusif dilarang. Pelanggaran dapat diblokir.',
  termsConsentCheckbox: 'Saya setuju ketentuan chat dan aturan keamanan',
  termsConsentCheckboxA11y: 'Centang setuju ketentuan chat',
  termsAgree: 'Setuju & lanjut',
  termsAgreeA11y: 'Setuju ketentuan dan lanjut',
  termsDecline: 'Tidak setuju',
  termsDeclineA11y: 'Tidak setuju dan kembali',
  termsAgreeFailedTitle: 'Gagal menyimpan persetujuan',
  termsAgreeFailedBody: 'Periksa koneksi lalu coba lagi.',
  openTerms: 'Buka syarat penggunaan',
  openTermsA11y: 'Buka syarat penggunaan di browser',
  userActionA11y: (name) => `Buka tindakan untuk ${name}`,
  userActionTitle: 'Tindakan pengguna',
  replyAction: 'Balas',
  replyingTo: 'Membalas ke',
  replyToUserLabel: (name) => `Membalas ${name}`,
  originalMessage: 'Pesan asli',
  reportAction: 'Laporkan pesan ini',
  blockAction: 'Blokir pengguna ini',
  blockConfirmTitle: 'Blokir pengguna ini?',
  blockConfirmBody: 'Jika diblokir, pesannya tidak akan tampil di chat.',
  unblockAction: 'Buka blokir',
  reportReasonTitle: 'Pilih alasan laporan',
  blockReasonTitle: 'Pilih alasan blokir',
  reportReasonSpam: 'Spam',
  reportReasonHarassment: 'Pelecehan',
  reportReasonHate: 'Kebencian/diskriminasi',
  reportReasonSexual: 'Konten seksual',
  reportReasonViolence: 'Konten kekerasan',
  reportReasonSelfHarm: 'Menyakiti diri/bunuh diri',
  reportReasonOther: 'Lainnya',
  reportSubmitAction: 'Kirim laporan',
  reportSuccessTitle: 'Laporan terkirim',
  reportSuccessBody: 'Kami meninjau dalam 24 jam.',
  reportFailedTitle: 'Laporan gagal',
  reportFailedBody: 'Silakan coba lagi nanti.',
  blockSuccessTitle: 'Pengguna diblokir',
  blockSuccessBody: 'Pesan pengguna ini langsung disembunyikan.',
  blockFailedTitle: 'Blokir gagal',
  blockFailedBody: 'Silakan coba lagi nanti.',
  manageBlockedUsers: 'Kelola pengguna diblokir',
  blockedUsersTitle: 'Pengguna diblokir',
  noBlockedUsers: 'Tidak ada pengguna diblokir',
  blockedUserNameLabel: 'Nama',
  unblockSuccessTitle: 'Pengguna dibuka blokirnya',
  unblockSuccessBody: 'Pesannya dapat tampil lagi di chat.',
  unblockFailedTitle: 'Gagal membuka blokir',
  unblockFailedBody: 'Silakan coba lagi nanti.',
  copyAction: 'Salin',
  copySuccessTitle: 'Tersalin',
  copySuccessBody: 'Pesan disalin ke clipboard.',
  cancel: 'Batal',
};

const chatTh: ChatTabStrings = {
  title: 'แชท',
  loading: 'กำลังโหลด…',
  loadFailed: 'โหลดไม่สำเร็จ',
  retry: 'ลองอีกครั้ง',
  supabaseNotConfigured: 'ใช้แชทได้หลังตั้งค่า Supabase',
  noRoom: 'ยังไม่มีห้องแชท\nรัน migration Supabase',
  sendFailedTitle: 'ส่งไม่ได้',
  sendFailedMessage: 'ตรวจสอบเครือข่าย',
  sendFailedAuthMessage: 'เซสชันหมดอายุ ออกจากระบบแล้วเข้าใหม่',
  today: 'วันนี้',
  yesterday: 'เมื่อวาน',
  guest: 'ผู้เยี่ยมชม',
  reconnectA11y: 'เชื่อมต่อใหม่',
  reconnectBanner: 'ขาดการเชื่อมต่อ แตะเพื่อเชื่อมใหม่',
  emptyMessages: 'ยังไม่มีข้อความ ทักทายเลย!',
  loginToChat: 'เข้าสู่ระบบเพื่อแชท',
  loginButton: 'เข้าสู่ระบบ',
  loginButtonA11y: 'เข้าสู่ระบบ',
  proOnly: 'สมาชิก PRO ส่งข้อความได้',
  proButton: 'ลอง PRO',
  proButtonA11y: 'ลอง PRO',
  messagePlaceholder: 'ข้อความ…',
  messageInputA11y: 'ช่องพิมพ์ข้อความ',
  sendA11y: 'ส่ง',
  chatListA11y: 'รายการข้อความ',
  roomPickerA11y: 'เลือกห้องแชท',
  scrollToBottomA11y: 'เลื่อนลงล่าง',
  offlineCannotSend: 'ออฟไลน์ ส่งไม่ได้',
  realtimeSubscribeError: 'เชื่อมต่อไม่ได้ แตะเพื่อลองใหม่',
  noOlderMessages: 'ไม่มีข้อความเก่ากว่านี้',
  loginRequiredForChat: 'ต้องเข้าสู่ระบบก่อนใช้แชท',
  chatRestricted: 'บัญชีนี้ถูกจำกัดการใช้งานแชท',
  termsModalTitle: 'ยอมรับข้อกำหนดการใช้งานแชท',
  termsModalBody: 'ไม่อนุญาตเนื้อหาไม่เหมาะสมหรือพฤติกรรมคุกคาม ผู้ฝ่าฝืนอาจถูกระงับบัญชี',
  termsConsentCheckbox: 'ฉันยอมรับข้อกำหนดแชทและกฎความปลอดภัย',
  termsConsentCheckboxA11y: 'ช่องทำเครื่องหมายยอมรับข้อกำหนดแชท',
  termsAgree: 'ยอมรับและดำเนินการต่อ',
  termsAgreeA11y: 'ยอมรับข้อกำหนดและดำเนินการต่อ',
  termsDecline: 'ไม่ยอมรับ',
  termsDeclineA11y: 'ไม่ยอมรับและกลับ',
  termsAgreeFailedTitle: 'บันทึกการยอมรับไม่สำเร็จ',
  termsAgreeFailedBody: 'โปรดตรวจสอบเครือข่ายแล้วลองอีกครั้ง',
  openTerms: 'เปิดข้อกำหนดการใช้งาน',
  openTermsA11y: 'เปิดข้อกำหนดการใช้งานในเบราว์เซอร์',
  userActionA11y: (name) => `เปิดการจัดการสำหรับ ${name}`,
  userActionTitle: 'การจัดการผู้ใช้',
  replyAction: 'ตอบกลับ',
  replyingTo: 'กำลังตอบกลับถึง',
  replyToUserLabel: (name) => `ตอบกลับถึง ${name}`,
  originalMessage: 'ข้อความต้นฉบับ',
  reportAction: 'รายงานข้อความนี้',
  blockAction: 'บล็อกผู้ใช้นี้',
  blockConfirmTitle: 'บล็อกผู้ใช้นี้หรือไม่?',
  blockConfirmBody: 'เมื่อบล็อกแล้ว ข้อความของผู้ใช้นี้จะไม่แสดงในแชท',
  unblockAction: 'เลิกบล็อก',
  reportReasonTitle: 'เลือกเหตุผลการรายงาน',
  blockReasonTitle: 'เลือกเหตุผลในการบล็อก',
  reportReasonSpam: 'สแปม',
  reportReasonHarassment: 'คุกคาม',
  reportReasonHate: 'ความเกลียดชัง/เลือกปฏิบัติ',
  reportReasonSexual: 'เนื้อหาทางเพศ',
  reportReasonViolence: 'เนื้อหารุนแรง',
  reportReasonSelfHarm: 'ทำร้ายตนเอง/ฆ่าตัวตาย',
  reportReasonOther: 'อื่นๆ',
  reportSubmitAction: 'ส่งรายงาน',
  reportSuccessTitle: 'ส่งรายงานแล้ว',
  reportSuccessBody: 'เราจะตรวจสอบภายใน 24 ชั่วโมง',
  reportFailedTitle: 'ส่งรายงานไม่สำเร็จ',
  reportFailedBody: 'โปรดลองอีกครั้งภายหลัง',
  blockSuccessTitle: 'บล็อกผู้ใช้แล้ว',
  blockSuccessBody: 'ข้อความของผู้ใช้นี้ถูกซ่อนทันที',
  blockFailedTitle: 'บล็อกไม่สำเร็จ',
  blockFailedBody: 'โปรดลองอีกครั้งภายหลัง',
  manageBlockedUsers: 'จัดการผู้ใช้ที่บล็อก',
  blockedUsersTitle: 'ผู้ใช้ที่บล็อก',
  noBlockedUsers: 'ยังไม่มีผู้ใช้ที่บล็อก',
  blockedUserNameLabel: 'ชื่อ',
  unblockSuccessTitle: 'เลิกบล็อกแล้ว',
  unblockSuccessBody: 'สามารถแสดงข้อความของผู้ใช้นี้ได้อีกครั้ง',
  unblockFailedTitle: 'เลิกบล็อกไม่สำเร็จ',
  unblockFailedBody: 'โปรดลองอีกครั้งภายหลัง',
  copyAction: 'คัดลอก',
  copySuccessTitle: 'คัดลอกแล้ว',
  copySuccessBody: 'คัดลอกข้อความไปยังคลิปบอร์ดแล้ว',
  cancel: 'ยกเลิก',
};

const emptyJa: EmptyStateStrings = {
  savedTitle: 'まだ保存した単語はありません',
  savedSubtitle: '単語クイズで星マークを押すとここに追加されます',
  savedButton: '単語タブで探す',
  savedBrowseA11y: '単語タブで単語を探す',
};
const emptyEn: EmptyStateStrings = {
  savedTitle: 'No saved words yet',
  savedSubtitle: 'Tap the star in vocabulary quizzes to save words here.',
  savedButton: 'Browse vocabulary',
  savedBrowseA11y: 'Browse words in the vocabulary tab',
};

const emptyZh: EmptyStateStrings = {
  savedTitle: '还没有保存的单词',
  savedSubtitle: '在单词测验中点星标即可保存到这里。',
  savedButton: '去单词页',
  savedBrowseA11y: '在单词标签中浏览',
};

const emptyVi: EmptyStateStrings = {
  savedTitle: 'Chưa có từ đã lưu',
  savedSubtitle: 'Chạm sao trong quiz từ vựng để lưu vào đây.',
  savedButton: 'Xem từ vựng',
  savedBrowseA11y: 'Duyệt từ trong tab Từ vựng',
};

const emptyEs: EmptyStateStrings = {
  savedTitle: 'Aún no hay palabras guardadas',
  savedSubtitle: 'Toca la estrella en los quizzes de vocabulario para guardarlas aquí.',
  savedButton: 'Ver vocabulario',
  savedBrowseA11y: 'Explorar palabras en la pestaña Vocabulario',
};

const emptyId: EmptyStateStrings = {
  savedTitle: 'Belum ada kata tersimpan',
  savedSubtitle: 'Ketuk bintang di kuis kosakata untuk menyimpan di sini.',
  savedButton: 'Lihat kosakata',
  savedBrowseA11y: 'Jelajahi kata di tab Kosakata',
};

const emptyTh: EmptyStateStrings = {
  savedTitle: 'ยังไม่มีคำที่บันทึก',
  savedSubtitle: 'แตะดาวในควิซคำศัพท์เพื่อบันทึกที่นี่',
  savedButton: 'ไปดูคำศัพท์',
  savedBrowseA11y: 'ดูคำในแท็บคำศัพท์',
};

const savedTabJa: SavedTabStrings = {
  headerTitle: '保存した単語',
  headerSubtitle: (n) => `${n} 語保存済み`,
  quizButton: 'まとめてクイズ',
  quizButtonA11y: '保存した単語でまとめてクイズ',
  listA11y: '保存した単語一覧',
  speakA11y: '発音を再生',
  unsaveA11y: '保存から解除',
};
const savedTabEn: SavedTabStrings = {
  headerTitle: 'Saved words',
  headerSubtitle: (n) => `${n} saved`,
  quizButton: 'Quiz all',
  quizButtonA11y: 'Quiz all saved words',
  listA11y: 'Saved words list',
  speakA11y: 'Play pronunciation',
  unsaveA11y: 'Remove from saved',
};

const savedTabZh: SavedTabStrings = {
  headerTitle: '已保存单词',
  headerSubtitle: (n) => `已保存 ${n} 词`,
  quizButton: '全部测验',
  quizButtonA11y: '对已保存单词测验',
  listA11y: '已保存单词列表',
  speakA11y: '播放发音',
  unsaveA11y: '取消保存',
};

const savedTabVi: SavedTabStrings = {
  headerTitle: 'Từ đã lưu',
  headerSubtitle: (n) => `${n} từ`,
  quizButton: 'Quiz tất cả',
  quizButtonA11y: 'Quiz tất cả từ đã lưu',
  listA11y: 'Danh sách từ đã lưu',
  speakA11y: 'Phát âm',
  unsaveA11y: 'Bỏ lưu',
};

const savedTabEs: SavedTabStrings = {
  headerTitle: 'Palabras guardadas',
  headerSubtitle: (n) => `${n} guardada(s)`,
  quizButton: 'Quiz a todas',
  quizButtonA11y: 'Hacer quiz con todas las guardadas',
  listA11y: 'Lista de palabras guardadas',
  speakA11y: 'Reproducir',
  unsaveA11y: 'Quitar de guardadas',
};

const savedTabId: SavedTabStrings = {
  headerTitle: 'Kata tersimpan',
  headerSubtitle: (n) => `${n} kata`,
  quizButton: 'Kuis semua',
  quizButtonA11y: 'Kuis semua kata tersimpan',
  listA11y: 'Daftar kata tersimpan',
  speakA11y: 'Putar pelafalan',
  unsaveA11y: 'Hapus dari tersimpan',
};

const savedTabTh: SavedTabStrings = {
  headerTitle: 'คำที่บันทึก',
  headerSubtitle: (n) => `บันทึก ${n} คำ`,
  quizButton: 'ควิซทั้งหมด',
  quizButtonA11y: 'ควิซคำที่บันทึกทั้งหมด',
  listA11y: 'รายการคำที่บันทึก',
  speakA11y: 'เล่นเสียง',
  unsaveA11y: 'เลิกบันทึก',
};

const settingsJa: SettingsScreenStrings = {
  title: '設定',
  back: '戻る',
  settingsList: '設定の項目一覧',
  appearance: '外観',
  themeLight: 'ライト',
  themeDark: 'ダーク',
  themeSystem: 'システム',
  feedback: 'フィードバック',
  sound: '効果音',
  soundSub: 'クイズ開始・正解・不正解などの音',
  haptics: 'バイブレーション',
  hapticsSub: 'ボタン操作や選択時の触感',
  soundVolume: '効果音の音量',
  soundVolumeSub: '小さめ・標準・大きめ',
  volLow: '小さめ',
  volStandard: '標準',
  volHigh: '大きめ',
  pickVol: (label) => `${label}を選ぶ`,
  reminderSection: 'リマインダー通知',
  notification: '通知',
  notificationTime: '通知時刻',
  reminderTimeA11y: (time, on) =>
    on ? `通知時刻。${time}。タップで変更` : '通知がオフのため変更できません',
  done: '完了',
  studySection: '学習',
  studyPurpose: '学習の目的を変更',
  studyPurposeA11y: '学習の目的・レベル・1日の目標を変更',
  timezone: '地域（タイムゾーン）',
  timezoneA11y: '地域（タイムゾーン）を変更',
  dataSection: '学習データ',
  resetData: '学習データをリセット',
  resetDataA11y: '学習データをリセットする',
  resetConfirmTitle: '学習データをリセット',
  resetConfirmMessage: '本当にリセットしますか？この操作は取り消せません',
  cancel: 'キャンセル',
  resetConfirmAction: 'リセットする',
  subSection: 'サブスクリプション',
  restorePurchase: '購入を復元する',
  restorePurchaseA11y: (busy) => (busy ? '復元中' : '購入を復元する'),
  manageSubscription: 'サブスクリプションを管理',
  manageSubscriptionA11y: 'サブスクリプションを管理',
  appInfo: 'アプリ情報',
  version: 'バージョン',
  privacy: 'プライバシーポリシー',
  privacyA11y: 'プライバシーポリシーを開く',
  terms: '利用規約',
  termsA11y: '利用規約を開く',
  appleStandardEula: 'Apple 利用規約（EULA）',
  appleStandardEulaA11y: 'Apple 標準の利用規約（EULA）を開く',
  legalAppleEulaMissing: 'Apple の利用規約ページを開けませんでした。',
  support: 'サポート・お問い合わせ',
  supportA11y: 'サポート・お問い合わせを開く',
  devSection: '開発',
  onboardingStart: 'オンボーディングを開始',
  onboardingStartA11y: 'オンボーディングを最初から開始（開発用）',
  sentryTest: 'Sentry テスト送信',
  sentryTestA11y: 'Sentry にテストイベントを送信',
  sentryTestSentTitle: '送信しました',
  sentryTestSentBody: 'Sentry にテストイベントを送信しました。ダッシュボードで確認してください。',
  restoreSuccessTitle: '復元完了',
  restoreSuccessMessage: '購入が復元されました。',
  restoreFailTitle: '復元できませんでした',
  restoreFailFallback: '有効な購入が見つかりません。',
  legalNotPublished: 'まだ公開されていません',
  legalPrivacyMissing: 'プライバシーポリシーのURLがまだ設定されていません。',
  legalTermsMissing: '利用規約のURLがまだ設定されていません。',
  legalSupportMissing: 'サポートページのURLがまだ設定されていません。',
  soundOnA11y: '効果音をオフにする',
  soundOffA11y: '効果音をオンにする',
  hapticsOnA11y: 'バイブレーションをオフにする',
  hapticsOffA11y: 'バイブレーションをオンにする',
  reminderOnA11y: '通知をオフにする',
  reminderOffA11y: '通知をオンにする',
  accountSection: 'アカウント',
  accountSectionSub: 'プロフィール・ログイン・進捗同期',
  accountSectionA11y: 'アカウント',
  todayGoalRow: '今日の目標',
  todayGoalA11y: '今日の目標を変更',
  displayLanguageRow: 'アプリの表示言語',
  displayLanguageValue: '日本語',
  displayLanguageA11y: 'アプリの表示言語を変更',
  displayLanguageStaticA11y: 'アプリの表示言語',
};

const settingsEn: SettingsScreenStrings = {
  title: 'Settings',
  back: 'Back',
  settingsList: 'Settings list',
  appearance: 'Appearance',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  feedback: 'Feedback',
  sound: 'Sound effects',
  soundSub: 'Quiz start, correct, incorrect, etc.',
  haptics: 'Haptics',
  hapticsSub: 'Tactile feedback on taps',
  soundVolume: 'Sound volume',
  soundVolumeSub: 'Quiet · Normal · Loud',
  volLow: 'Quiet',
  volStandard: 'Normal',
  volHigh: 'Loud',
  pickVol: (label) => `Select ${label}`,
  reminderSection: 'Study reminders',
  notification: 'Notifications',
  notificationTime: 'Reminder time',
  reminderTimeA11y: (time, on) =>
    on ? `Reminder time. ${time}. Tap to change` : 'Notifications off; cannot change time',
  done: 'Done',
  studySection: 'Study',
  studyPurpose: 'Study goals & level',
  studyPurposeA11y: 'Change study purpose, level, and daily goals',
  timezone: 'Region (time zone)',
  timezoneA11y: 'Change region and time zone',
  dataSection: 'Study data',
  resetData: 'Reset study data',
  resetDataA11y: 'Reset all study data',
  resetConfirmTitle: 'Reset study data',
  resetConfirmMessage: 'This cannot be undone. Continue?',
  cancel: 'Cancel',
  resetConfirmAction: 'Reset',
  subSection: 'Subscription',
  restorePurchase: 'Restore purchases',
  restorePurchaseA11y: (busy) => (busy ? 'Restoring…' : 'Restore purchases'),
  manageSubscription: 'Manage subscription',
  manageSubscriptionA11y: 'Manage subscription',
  appInfo: 'About',
  version: 'Version',
  privacy: 'Privacy policy',
  privacyA11y: 'Open privacy policy',
  terms: 'Terms of use',
  termsA11y: 'Open terms of use',
  appleStandardEula: 'Apple Standard EULA',
  appleStandardEulaA11y: 'Open Apple standard end user license agreement',
  legalAppleEulaMissing: 'Could not open the Apple license page.',
  support: 'Support',
  supportA11y: 'Open support page',
  devSection: 'Development',
  onboardingStart: 'Start onboarding',
  onboardingStartA11y: 'Restart onboarding (dev)',
  sentryTest: 'Send Sentry test',
  sentryTestA11y: 'Send a test event to Sentry',
  sentryTestSentTitle: 'Sent',
  sentryTestSentBody: 'A test event was sent to Sentry. Check your dashboard.',
  restoreSuccessTitle: 'Restored',
  restoreSuccessMessage: 'Your purchases were restored.',
  restoreFailTitle: 'Could not restore',
  restoreFailFallback: 'No valid purchases found.',
  legalNotPublished: 'Not available yet',
  legalPrivacyMissing: 'Privacy policy URL is not set yet.',
  legalTermsMissing: 'Terms URL is not set yet.',
  legalSupportMissing: 'Support page URL is not set yet.',
  soundOnA11y: 'Turn sound effects off',
  soundOffA11y: 'Turn sound effects on',
  hapticsOnA11y: 'Turn haptics off',
  hapticsOffA11y: 'Turn haptics on',
  reminderOnA11y: 'Turn notifications off',
  reminderOffA11y: 'Turn notifications on',
  accountSection: 'Account',
  accountSectionSub: 'Profile, sign-in, sync',
  accountSectionA11y: 'Account',
  todayGoalRow: "Today's goal",
  todayGoalA11y: "Change today's study goal",
  displayLanguageRow: 'Language',
  displayLanguageValue: 'English',
  displayLanguageA11y: 'Change app display language',
  displayLanguageStaticA11y: 'App display language',
};

const settingsZh: SettingsScreenStrings = {
  title: '设置',
  back: '返回',
  settingsList: '设置列表',
  appearance: '外观',
  themeLight: '浅色',
  themeDark: '深色',
  themeSystem: '跟随系统',
  feedback: '反馈',
  sound: '音效',
  soundSub: '测验开始、答对、答错等',
  haptics: '触感',
  hapticsSub: '点击与选择时的振动',
  soundVolume: '音效音量',
  soundVolumeSub: '小 · 标准 · 大',
  volLow: '小',
  volStandard: '标准',
  volHigh: '大',
  pickVol: (label) => `选择${label}`,
  reminderSection: '学习提醒',
  notification: '通知',
  notificationTime: '提醒时间',
  reminderTimeA11y: (time, on) =>
    on ? `提醒时间：${time}，点按更改` : '通知已关闭，无法更改时间',
  done: '完成',
  studySection: '学习',
  studyPurpose: '学习目标与等级',
  studyPurposeA11y: '更改学习目的、等级与每日目标',
  timezone: '地区（时区）',
  timezoneA11y: '更改地区与时区',
  dataSection: '学习数据',
  resetData: '重置学习数据',
  resetDataA11y: '重置所有学习数据',
  resetConfirmTitle: '重置学习数据',
  resetConfirmMessage: '此操作无法撤销，确定继续？',
  cancel: '取消',
  resetConfirmAction: '重置',
  subSection: '订阅',
  restorePurchase: '恢复购买',
  restorePurchaseA11y: (busy) => (busy ? '恢复中…' : '恢复购买'),
  manageSubscription: '管理订阅',
  manageSubscriptionA11y: '管理订阅',
  appInfo: '关于',
  version: '版本',
  privacy: '隐私政策',
  privacyA11y: '打开隐私政策',
  terms: '使用条款',
  termsA11y: '打开使用条款',
  appleStandardEula: 'Apple 标准 EULA',
  appleStandardEulaA11y: '打开 Apple 标准最终用户许可协议',
  legalAppleEulaMissing: '无法打开 Apple 许可页面。',
  support: '支持与帮助',
  supportA11y: '打开支持页面',
  devSection: '开发',
  onboardingStart: '重新开始引导',
  onboardingStartA11y: '从头开始引导（开发用）',
  sentryTest: '发送 Sentry 测试',
  sentryTestA11y: '向 Sentry 发送测试事件',
  sentryTestSentTitle: '已发送',
  sentryTestSentBody: '已向 Sentry 发送测试事件，请在控制台查看。',
  restoreSuccessTitle: '恢复成功',
  restoreSuccessMessage: '购买已恢复。',
  restoreFailTitle: '无法恢复',
  restoreFailFallback: '未找到有效购买。',
  legalNotPublished: '尚未发布',
  legalPrivacyMissing: '尚未设置隐私政策 URL。',
  legalTermsMissing: '尚未设置使用条款 URL。',
  legalSupportMissing: '尚未设置支持页面 URL。',
  soundOnA11y: '关闭音效',
  soundOffA11y: '开启音效',
  hapticsOnA11y: '关闭触感',
  hapticsOffA11y: '开启触感',
  reminderOnA11y: '关闭通知',
  reminderOffA11y: '开启通知',
  accountSection: '账户',
  accountSectionSub: '资料、登录与同步',
  accountSectionA11y: '账户',
  todayGoalRow: '今日目标',
  todayGoalA11y: '更改今日学习目标',
  displayLanguageRow: '应用语言',
  displayLanguageValue: '简体中文',
  displayLanguageA11y: '更改应用显示语言',
  displayLanguageStaticA11y: '应用显示语言',
};

const settingsVi: SettingsScreenStrings = {
  title: 'Cài đặt',
  back: 'Quay lại',
  settingsList: 'Danh sách cài đặt',
  appearance: 'Giao diện',
  themeLight: 'Sáng',
  themeDark: 'Tối',
  themeSystem: 'Theo hệ thống',
  feedback: 'Phản hồi',
  sound: 'Hiệu ứng âm thanh',
  soundSub: 'Bắt đầu quiz, đúng, sai…',
  haptics: 'Rung',
  hapticsSub: 'Phản hồi khi chạm',
  soundVolume: 'Âm lượng hiệu ứng',
  soundVolumeSub: 'Nhỏ · Bình thường · Lớn',
  volLow: 'Nhỏ',
  volStandard: 'Bình thường',
  volHigh: 'Lớn',
  pickVol: (label) => `Chọn ${label}`,
  reminderSection: 'Nhắc học',
  notification: 'Thông báo',
  notificationTime: 'Giờ nhắc',
  reminderTimeA11y: (time, on) =>
    on ? `Giờ nhắc: ${time}. Chạm để đổi` : 'Thông báo tắt, không đổi giờ được',
  done: 'Xong',
  studySection: 'Học tập',
  studyPurpose: 'Mục tiêu & cấp độ',
  studyPurposeA11y: 'Đổi mục đích, cấp và mục tiêu hàng ngày',
  timezone: 'Khu vực (múi giờ)',
  timezoneA11y: 'Đổi khu vực và múi giờ',
  dataSection: 'Dữ liệu học',
  resetData: 'Đặt lại dữ liệu học',
  resetDataA11y: 'Xóa toàn bộ dữ liệu học',
  resetConfirmTitle: 'Đặt lại dữ liệu học',
  resetConfirmMessage: 'Không hoàn tác được. Tiếp tục?',
  cancel: 'Hủy',
  resetConfirmAction: 'Đặt lại',
  subSection: 'Đăng ký',
  restorePurchase: 'Khôi phục mua hàng',
  restorePurchaseA11y: (busy) => (busy ? 'Đang khôi phục…' : 'Khôi phục mua hàng'),
  manageSubscription: 'Quản lý đăng ký',
  manageSubscriptionA11y: 'Quản lý đăng ký',
  appInfo: 'Giới thiệu',
  version: 'Phiên bản',
  privacy: 'Chính sách riêng tư',
  privacyA11y: 'Mở chính sách riêng tư',
  terms: 'Điều khoản sử dụng',
  termsA11y: 'Mở điều khoản',
  appleStandardEula: 'EULA chuẩn Apple',
  appleStandardEulaA11y: 'Mở thỏa thuận cấp phép người dùng cuối của Apple',
  legalAppleEulaMissing: 'Không mở được trang giấy phép của Apple.',
  support: 'Hỗ trợ',
  supportA11y: 'Mở trang hỗ trợ',
  devSection: 'Phát triển',
  onboardingStart: 'Bắt đầu onboarding',
  onboardingStartA11y: 'Làm lại onboarding (dev)',
  sentryTest: 'Gửi test Sentry',
  sentryTestA11y: 'Gửi sự kiện thử tới Sentry',
  sentryTestSentTitle: 'Đã gửi',
  sentryTestSentBody: 'Đã gửi sự kiện thử. Kiểm tra dashboard.',
  restoreSuccessTitle: 'Đã khôi phục',
  restoreSuccessMessage: 'Giao dịch của bạn đã được khôi phục.',
  restoreFailTitle: 'Không khôi phục được',
  restoreFailFallback: 'Không tìm thấy giao dịch hợp lệ.',
  legalNotPublished: 'Chưa có',
  legalPrivacyMissing: 'Chưa cấu hình URL chính sách riêng tư.',
  legalTermsMissing: 'Chưa cấu hình URL điều khoản.',
  legalSupportMissing: 'Chưa cấu hình URL hỗ trợ.',
  soundOnA11y: 'Tắt hiệu ứng âm thanh',
  soundOffA11y: 'Bật hiệu ứng âm thanh',
  hapticsOnA11y: 'Tắt rung',
  hapticsOffA11y: 'Bật rung',
  reminderOnA11y: 'Tắt thông báo',
  reminderOffA11y: 'Bật thông báo',
  accountSection: 'Tài khoản',
  accountSectionSub: 'Hồ sơ, đăng nhập, đồng bộ',
  accountSectionA11y: 'Tài khoản',
  todayGoalRow: 'Mục tiêu hôm nay',
  todayGoalA11y: 'Đổi mục tiêu học hôm nay',
  displayLanguageRow: 'Ngôn ngữ ứng dụng',
  displayLanguageValue: 'Tiếng Việt',
  displayLanguageA11y: 'Đổi ngôn ngữ hiển thị',
  displayLanguageStaticA11y: 'Ngôn ngữ hiển thị',
};

const settingsEs: SettingsScreenStrings = {
  title: 'Ajustes',
  back: 'Atrás',
  settingsList: 'Lista de ajustes',
  appearance: 'Apariencia',
  themeLight: 'Claro',
  themeDark: 'Oscuro',
  themeSystem: 'Sistema',
  feedback: 'Comentarios',
  sound: 'Efectos de sonido',
  soundSub: 'Inicio de quiz, acierto, fallo…',
  haptics: 'Vibración',
  hapticsSub: 'Respuesta táctil',
  soundVolume: 'Volumen de efectos',
  soundVolumeSub: 'Bajo · Normal · Alto',
  volLow: 'Bajo',
  volStandard: 'Normal',
  volHigh: 'Alto',
  pickVol: (label) => `Seleccionar ${label}`,
  reminderSection: 'Recordatorios de estudio',
  notification: 'Notificaciones',
  notificationTime: 'Hora del recordatorio',
  reminderTimeA11y: (time, on) =>
    on ? `Hora: ${time}. Toca para cambiar` : 'Notificaciones desactivadas',
  done: 'Hecho',
  studySection: 'Estudio',
  studyPurpose: 'Objetivos y nivel',
  studyPurposeA11y: 'Cambiar propósito, nivel y metas diarias',
  timezone: 'Región (zona horaria)',
  timezoneA11y: 'Cambiar región y zona horaria',
  dataSection: 'Datos de estudio',
  resetData: 'Restablecer datos',
  resetDataA11y: 'Borrar todos los datos de estudio',
  resetConfirmTitle: 'Restablecer datos',
  resetConfirmMessage: 'No se puede deshacer. ¿Continuar?',
  cancel: 'Cancelar',
  resetConfirmAction: 'Restablecer',
  subSection: 'Suscripción',
  restorePurchase: 'Restaurar compras',
  restorePurchaseA11y: (busy) => (busy ? 'Restaurando…' : 'Restaurar compras'),
  manageSubscription: 'Gestionar suscripción',
  manageSubscriptionA11y: 'Gestionar suscripción',
  appInfo: 'Acerca de',
  version: 'Versión',
  privacy: 'Política de privacidad',
  privacyA11y: 'Abrir política de privacidad',
  terms: 'Términos de uso',
  termsA11y: 'Abrir términos',
  appleStandardEula: 'EULA estándar de Apple',
  appleStandardEulaA11y: 'Abrir el contrato de licencia de usuario final de Apple',
  legalAppleEulaMissing: 'No se pudo abrir la página de licencia de Apple.',
  support: 'Soporte',
  supportA11y: 'Abrir soporte',
  devSection: 'Desarrollo',
  onboardingStart: 'Iniciar onboarding',
  onboardingStartA11y: 'Reiniciar onboarding (dev)',
  sentryTest: 'Prueba Sentry',
  sentryTestA11y: 'Enviar evento de prueba a Sentry',
  sentryTestSentTitle: 'Enviado',
  sentryTestSentBody: 'Se envió un evento de prueba. Revisa el panel.',
  restoreSuccessTitle: 'Restaurado',
  restoreSuccessMessage: 'Tus compras se restauraron.',
  restoreFailTitle: 'No se pudo restaurar',
  restoreFailFallback: 'No se encontraron compras válidas.',
  legalNotPublished: 'No disponible aún',
  legalPrivacyMissing: 'Falta la URL de privacidad.',
  legalTermsMissing: 'Falta la URL de términos.',
  legalSupportMissing: 'Falta la URL de soporte.',
  soundOnA11y: 'Desactivar sonido',
  soundOffA11y: 'Activar sonido',
  hapticsOnA11y: 'Desactivar vibración',
  hapticsOffA11y: 'Activar vibración',
  reminderOnA11y: 'Desactivar notificaciones',
  reminderOffA11y: 'Activar notificaciones',
  accountSection: 'Cuenta',
  accountSectionSub: 'Perfil, inicio de sesión, sincronización',
  accountSectionA11y: 'Cuenta',
  todayGoalRow: 'Meta de hoy',
  todayGoalA11y: 'Cambiar meta de estudio de hoy',
  displayLanguageRow: 'Idioma',
  displayLanguageValue: 'Español',
  displayLanguageA11y: 'Cambiar idioma de la app',
  displayLanguageStaticA11y: 'Idioma de la app',
};

const settingsId: SettingsScreenStrings = {
  title: 'Pengaturan',
  back: 'Kembali',
  settingsList: 'Daftar pengaturan',
  appearance: 'Tampilan',
  themeLight: 'Terang',
  themeDark: 'Gelap',
  themeSystem: 'Sistem',
  feedback: 'Masukan',
  sound: 'Efek suara',
  soundSub: 'Mulai kuis, benar, salah…',
  haptics: 'Getaran',
  hapticsSub: 'Umpan balik sentuhan',
  soundVolume: 'Volume efek',
  soundVolumeSub: 'Pelan · Normal · Keras',
  volLow: 'Pelan',
  volStandard: 'Normal',
  volHigh: 'Keras',
  pickVol: (label) => `Pilih ${label}`,
  reminderSection: 'Pengingat belajar',
  notification: 'Notifikasi',
  notificationTime: 'Waktu pengingat',
  reminderTimeA11y: (time, on) =>
    on ? `Waktu: ${time}. Ketuk untuk ubah` : 'Notifikasi mati',
  done: 'Selesai',
  studySection: 'Belajar',
  studyPurpose: 'Tujuan & level',
  studyPurposeA11y: 'Ubah tujuan, level, dan target harian',
  timezone: 'Wilayah (zona waktu)',
  timezoneA11y: 'Ubah wilayah dan zona waktu',
  dataSection: 'Data belajar',
  resetData: 'Reset data belajar',
  resetDataA11y: 'Hapus semua data belajar',
  resetConfirmTitle: 'Reset data belajar',
  resetConfirmMessage: 'Tidak bisa dibatalkan. Lanjutkan?',
  cancel: 'Batal',
  resetConfirmAction: 'Reset',
  subSection: 'Langganan',
  restorePurchase: 'Pulihkan pembelian',
  restorePurchaseA11y: (busy) => (busy ? 'Memulihkan…' : 'Pulihkan pembelian'),
  manageSubscription: 'Kelola langganan',
  manageSubscriptionA11y: 'Kelola langganan',
  appInfo: 'Tentang',
  version: 'Versi',
  privacy: 'Kebijakan privasi',
  privacyA11y: 'Buka kebijakan privasi',
  terms: 'Syarat penggunaan',
  termsA11y: 'Buka syarat',
  appleStandardEula: 'EULA Standar Apple',
  appleStandardEulaA11y: 'Buka perjanjian lisensi pengguna akhir Apple',
  legalAppleEulaMissing: 'Tidak dapat membuka halaman lisensi Apple.',
  support: 'Dukungan',
  supportA11y: 'Buka halaman dukungan',
  devSection: 'Pengembangan',
  onboardingStart: 'Mulai onboarding',
  onboardingStartA11y: 'Ulang onboarding (dev)',
  sentryTest: 'Tes Sentry',
  sentryTestA11y: 'Kirim event uji ke Sentry',
  sentryTestSentTitle: 'Terkirim',
  sentryTestSentBody: 'Event uji terkirim. Cek dashboard.',
  restoreSuccessTitle: 'Dipulihkan',
  restoreSuccessMessage: 'Pembelian Anda dipulihkan.',
  restoreFailTitle: 'Tidak bisa memulihkan',
  restoreFailFallback: 'Tidak ada pembelian yang valid.',
  legalNotPublished: 'Belum tersedia',
  legalPrivacyMissing: 'URL kebijakan privasi belum diatur.',
  legalTermsMissing: 'URL syarat belum diatur.',
  legalSupportMissing: 'URL dukungan belum diatur.',
  soundOnA11y: 'Matikan efek suara',
  soundOffA11y: 'Nyalakan efek suara',
  hapticsOnA11y: 'Matikan getaran',
  hapticsOffA11y: 'Nyalakan getaran',
  reminderOnA11y: 'Matikan notifikasi',
  reminderOffA11y: 'Nyalakan notifikasi',
  accountSection: 'Akun',
  accountSectionSub: 'Profil, masuk, sinkron',
  accountSectionA11y: 'Akun',
  todayGoalRow: 'Target hari ini',
  todayGoalA11y: 'Ubah target belajar hari ini',
  displayLanguageRow: 'Bahasa aplikasi',
  displayLanguageValue: 'Bahasa Indonesia',
  displayLanguageA11y: 'Ubah bahasa tampilan',
  displayLanguageStaticA11y: 'Bahasa tampilan',
};

const settingsTh: SettingsScreenStrings = {
  title: 'การตั้งค่า',
  back: 'กลับ',
  settingsList: 'รายการตั้งค่า',
  appearance: 'รูปลักษณ์',
  themeLight: 'สว่าง',
  themeDark: 'มืด',
  themeSystem: 'ตามระบบ',
  feedback: 'ข้อเสนอแนะ',
  sound: 'เอฟเฟกต์เสียง',
  soundSub: 'เริ่มควิซ ถูก ผิด ฯลฯ',
  haptics: 'การสั่น',
  hapticsSub: 'การตอบสนองเมื่อแตะ',
  soundVolume: 'ระดับเสียงเอฟเฟกต์',
  soundVolumeSub: 'เบา · ปกติ · ดัง',
  volLow: 'เบา',
  volStandard: 'ปกติ',
  volHigh: 'ดัง',
  pickVol: (label) => `เลือก ${label}`,
  reminderSection: 'การแจ้งเตือนการเรียน',
  notification: 'การแจ้งเตือน',
  notificationTime: 'เวลาแจ้งเตือน',
  reminderTimeA11y: (time, on) =>
    on ? `เวลา: ${time} แตะเพื่อเปลี่ยน` : 'ปิดการแจ้งเตือนแล้ว',
  done: 'เสร็จ',
  studySection: 'การเรียน',
  studyPurpose: 'เป้าหมายและระดับ',
  studyPurposeA11y: 'เปลี่ยนจุดประสงค์ ระดับ และเป้าหมายรายวัน',
  timezone: 'ภูมิภาค (เขตเวลา)',
  timezoneA11y: 'เปลี่ยนภูมิภาคและเขตเวลา',
  dataSection: 'ข้อมูลการเรียน',
  resetData: 'รีเซ็ตข้อมูลการเรียน',
  resetDataA11y: 'ลบข้อมูลการเรียนทั้งหมด',
  resetConfirmTitle: 'รีเซ็ตข้อมูลการเรียน',
  resetConfirmMessage: 'ย้อนกลับไม่ได้ ต้องการดำเนินการต่อหรือไม่',
  cancel: 'ยกเลิก',
  resetConfirmAction: 'รีเซ็ต',
  subSection: 'การสมัครสมาชิก',
  restorePurchase: 'กู้คืนการซื้อ',
  restorePurchaseA11y: (busy) => (busy ? 'กำลังกู้คืน…' : 'กู้คืนการซื้อ'),
  manageSubscription: 'จัดการการสมัคร',
  manageSubscriptionA11y: 'จัดการการสมัคร',
  appInfo: 'เกี่ยวกับ',
  version: 'เวอร์ชัน',
  privacy: 'นโยบายความเป็นส่วนตัว',
  privacyA11y: 'เปิดนโยบายความเป็นส่วนตัว',
  terms: 'ข้อกำหนดการใช้งาน',
  termsA11y: 'เปิดข้อกำหนด',
  appleStandardEula: 'EULA มาตรฐาน Apple',
  appleStandardEulaA11y: 'เปิดข้อตกลงสิทธิ์การใช้งานสำหรับผู้ใช้ปลายทางของ Apple',
  legalAppleEulaMissing: 'เปิดหน้าใบอนุญาตของ Apple ไม่ได้',
  support: 'ช่วยเหลือ',
  supportA11y: 'เปิดหน้าช่วยเหลือ',
  devSection: 'นักพัฒนา',
  onboardingStart: 'เริ่มออนบอร์ดดิง',
  onboardingStartA11y: 'เริ่มออนบอร์ดดิงใหม่ (dev)',
  sentryTest: 'ทดสอบ Sentry',
  sentryTestA11y: 'ส่งอีเวนต์ทดสอบไป Sentry',
  sentryTestSentTitle: 'ส่งแล้ว',
  sentryTestSentBody: 'ส่งอีเวนต์ทดสอบแล้ว ตรวจสอบแดชบอร์ด',
  restoreSuccessTitle: 'กู้คืนแล้ว',
  restoreSuccessMessage: 'กู้คืนการซื้อของคุณแล้ว',
  restoreFailTitle: 'กู้คืนไม่ได้',
  restoreFailFallback: 'ไม่พบการซื้อที่ถูกต้อง',
  legalNotPublished: 'ยังไม่พร้อม',
  legalPrivacyMissing: 'ยังไม่ตั้ง URL นโยบายความเป็นส่วนตัว',
  legalTermsMissing: 'ยังไม่ตั้ง URL ข้อกำหนด',
  legalSupportMissing: 'ยังไม่ตั้ง URL ช่วยเหลือ',
  soundOnA11y: 'ปิดเอฟเฟกต์เสียง',
  soundOffA11y: 'เปิดเอฟเฟกต์เสียง',
  hapticsOnA11y: 'ปิดการสั่น',
  hapticsOffA11y: 'เปิดการสั่น',
  reminderOnA11y: 'ปิดการแจ้งเตือน',
  reminderOffA11y: 'เปิดการแจ้งเตือน',
  accountSection: 'บัญชี',
  accountSectionSub: 'โปรไฟล์ เข้าสู่ระบบ ซิงค์',
  accountSectionA11y: 'บัญชี',
  todayGoalRow: 'เป้าหมายวันนี้',
  todayGoalA11y: 'เปลี่ยนเป้าหมายการเรียนวันนี้',
  displayLanguageRow: 'ภาษาของแอป',
  displayLanguageValue: 'ไทย',
  displayLanguageA11y: 'เปลี่ยนภาษาที่แสดง',
  displayLanguageStaticA11y: 'ภาษาที่แสดง',
};

const settingsExtraJa: SettingsScreenExtraStrings = { title: '設定', accountSection: 'アカウント' };
const settingsExtraEn: SettingsScreenExtraStrings = { title: 'Settings', accountSection: 'Account' };
const settingsExtraZh: SettingsScreenExtraStrings = { title: '设置', accountSection: '账户' };
const settingsExtraVi: SettingsScreenExtraStrings = { title: 'Cài đặt', accountSection: 'Tài khoản' };
const settingsExtraEs: SettingsScreenExtraStrings = { title: 'Ajustes', accountSection: 'Cuenta' };
const settingsExtraId: SettingsScreenExtraStrings = { title: 'Pengaturan', accountSection: 'Akun' };
const settingsExtraTh: SettingsScreenExtraStrings = { title: 'การตั้งค่า', accountSection: 'บัญชี' };

export type DisplayLanguageScreenStrings = {
  title: string;
  hint: string;
  backA11y: string;
  /** 言語名を渡して VoiceOver 用 */
  selectLanguageA11y: (languageLabel: string) => string;
};

export type ProfileCardStrings = {
  title: string;
  closeModalA11y: string;
  sectionStudyRecord: string;
  streakDaysLabel: string;
  longestRecordLabel: string;
  clearedLessonsLabel: string;
  sectionCalendar: string;
  sectionLevelProgress: string;
  learnerDefaultName: string;
  editProfileLink: string;
  editProfileLinkA11y: string;
};

const displayLanguageScreenJa: DisplayLanguageScreenStrings = {
  title: 'アプリの表示言語',
  hint:
    '初回はデバイスの言語に合わせます。クイズ・結果画面などの表示言語が切り替わります。変更は開いている画面にすぐ反映されます。',
  backA11y: '戻る',
  selectLanguageA11y: (languageLabel: string) => `${languageLabel}を選択`,
};

const displayLanguageScreenEn: DisplayLanguageScreenStrings = {
  title: 'App language',
  hint:
    'On first launch, the app follows your device language. This switches quiz text, results, and UI language. Changes apply to open screens immediately.',
  backA11y: 'Back',
  selectLanguageA11y: (languageLabel: string) => `Select ${languageLabel}`,
};

const displayLanguageScreenZh: DisplayLanguageScreenStrings = {
  title: '应用语言',
  hint:
    '首次启动时跟随设备语言。将切换测验、结果等界面语言。更改会立即作用于已打开的界面。',
  backA11y: '返回',
  selectLanguageA11y: (languageLabel: string) => `选择 ${languageLabel}`,
};
const displayLanguageScreenVi: DisplayLanguageScreenStrings = {
  title: 'Ngôn ngữ ứng dụng',
  hint:
    'Lần đầu mở, ứng dụng theo ngôn ngữ thiết bị. Đổi ngôn ngữ cho quiz, kết quả và giao diện. Thay đổi áp dụng ngay cho màn hình đang mở.',
  backA11y: 'Quay lại',
  selectLanguageA11y: (languageLabel: string) => `Chọn ${languageLabel}`,
};
const displayLanguageScreenEs: DisplayLanguageScreenStrings = {
  title: 'Idioma de la app',
  hint:
    'Al iniciar, la app sigue el idioma del dispositivo. Cambia textos de quiz, resultados e interfaz. Los cambios se aplican de inmediato.',
  backA11y: 'Atrás',
  selectLanguageA11y: (languageLabel: string) => `Seleccionar ${languageLabel}`,
};
const displayLanguageScreenId: DisplayLanguageScreenStrings = {
  title: 'Bahasa aplikasi',
  hint:
    'Saat pertama dibuka, aplikasi mengikuti bahasa perangkat. Mengganti teks kuis, hasil, dan UI. Perubahan langsung berlaku pada layar yang terbuka.',
  backA11y: 'Kembali',
  selectLanguageA11y: (languageLabel: string) => `Pilih ${languageLabel}`,
};
const displayLanguageScreenTh: DisplayLanguageScreenStrings = {
  title: 'ภาษาของแอป',
  hint:
    'เมื่อเปิดครั้งแรก แอปจะตามภาษาของอุปกรณ์ สลับข้อความแบบทดสอบ ผลลัพธ์ และ UI การเปลี่ยนแปลงมีผลทันทีกับหน้าที่เปิดอยู่',
  backA11y: 'กลับ',
  selectLanguageA11y: (languageLabel: string) => `เลือก ${languageLabel}`,
};

const profileCardJa: ProfileCardStrings = {
  title: 'プロフィールカード',
  closeModalA11y: 'モーダルを閉じる',
  sectionStudyRecord: '学習記録',
  streakDaysLabel: '連続学習日',
  longestRecordLabel: '最長記録',
  clearedLessonsLabel: 'クリアレッスン',
  sectionCalendar: '学習カレンダー',
  sectionLevelProgress: 'レベル別進捗',
  learnerDefaultName: '学習者',
  editProfileLink: 'プロフィール・設定を編集',
  editProfileLinkA11y: 'プロフィール・設定を編集',
};

const profileCardEn: ProfileCardStrings = {
  title: 'Profile card',
  closeModalA11y: 'Close',
  sectionStudyRecord: 'Study stats',
  streakDaysLabel: 'Streak days',
  longestRecordLabel: 'Best streak',
  clearedLessonsLabel: 'Lessons cleared',
  sectionCalendar: 'Calendar',
  sectionLevelProgress: 'Progress by level',
  learnerDefaultName: 'Learner',
  editProfileLink: 'Edit profile & settings',
  editProfileLinkA11y: 'Edit profile and settings',
};

const profileCardZh: ProfileCardStrings = {
  title: '资料卡',
  closeModalA11y: '关闭',
  sectionStudyRecord: '学习记录',
  streakDaysLabel: '连续天数',
  longestRecordLabel: '最长记录',
  clearedLessonsLabel: '已完成课程',
  sectionCalendar: '学习日历',
  sectionLevelProgress: '各级进度',
  learnerDefaultName: '学习者',
  editProfileLink: '编辑资料与设置',
  editProfileLinkA11y: '编辑资料与设置',
};

const profileCardVi: ProfileCardStrings = {
  title: 'Thẻ hồ sơ',
  closeModalA11y: 'Đóng',
  sectionStudyRecord: 'Thống kê học',
  streakDaysLabel: 'Ngày liên tiếp',
  longestRecordLabel: 'Chuỗi dài nhất',
  clearedLessonsLabel: 'Bài đã xong',
  sectionCalendar: 'Lịch học',
  sectionLevelProgress: 'Tiến độ theo cấp',
  learnerDefaultName: 'Người học',
  editProfileLink: 'Sửa hồ sơ & cài đặt',
  editProfileLinkA11y: 'Sửa hồ sơ và cài đặt',
};

const profileCardEs: ProfileCardStrings = {
  title: 'Tarjeta de perfil',
  closeModalA11y: 'Cerrar',
  sectionStudyRecord: 'Estadísticas',
  streakDaysLabel: 'Días de racha',
  longestRecordLabel: 'Mejor racha',
  clearedLessonsLabel: 'Lecciones hechas',
  sectionCalendar: 'Calendario',
  sectionLevelProgress: 'Progreso por nivel',
  learnerDefaultName: 'Estudiante',
  editProfileLink: 'Editar perfil y ajustes',
  editProfileLinkA11y: 'Editar perfil y ajustes',
};

const profileCardId: ProfileCardStrings = {
  title: 'Kartu profil',
  closeModalA11y: 'Tutup',
  sectionStudyRecord: 'Statistik belajar',
  streakDaysLabel: 'Hari beruntun',
  longestRecordLabel: 'Rekor terpanjang',
  clearedLessonsLabel: 'Pelajaran selesai',
  sectionCalendar: 'Kalender',
  sectionLevelProgress: 'Progres per level',
  learnerDefaultName: 'Pelajar',
  editProfileLink: 'Edit profil & pengaturan',
  editProfileLinkA11y: 'Edit profil dan pengaturan',
};

const profileCardTh: ProfileCardStrings = {
  title: 'การ์ดโปรไฟล์',
  closeModalA11y: 'ปิด',
  sectionStudyRecord: 'สถิติการเรียน',
  streakDaysLabel: 'วันติดต่อกัน',
  longestRecordLabel: 'สตรีคยาวสุด',
  clearedLessonsLabel: 'บทที่เรียนจบ',
  sectionCalendar: 'ปฏิทิน',
  sectionLevelProgress: 'ความคืบหน้าระดับ',
  learnerDefaultName: 'ผู้เรียน',
  editProfileLink: 'แก้ไขโปรไฟล์และการตั้งค่า',
  editProfileLinkA11y: 'แก้ไขโปรไฟล์และการตั้งค่า',
};

const NAVIGATION_TABLE = sevenLocales(navigationJa, navigationEn, {
  zh: navigationZh,
  vi: navigationVi,
  es: navigationEs,
  id: navigationId,
  th: navigationTh,
});
const TAB_BAR_TABLE = sevenLocales(tabBarJa, tabBarEn, {
  zh: tabBarZh,
  vi: tabBarVi,
  es: tabBarEs,
  id: tabBarId,
  th: tabBarTh,
});
const HOME_TABLE = sevenLocales(homeJa, homeEn, {
  zh: homeZh,
  vi: homeVi,
  es: homeEs,
  id: homeId,
  th: homeTh,
});
const VOCABULARY_TABLE = sevenLocales(vocabularyJa, vocabularyEn, {
  zh: vocabularyZh,
  vi: vocabularyVi,
  es: vocabularyEs,
  id: vocabularyId,
  th: vocabularyTh,
});
const GRAMMAR_TABLE = sevenLocales(grammarJa, grammarEn, {
  zh: grammarZh,
  vi: grammarVi,
  es: grammarEs,
  id: grammarId,
  th: grammarTh,
});
const CHAT_TABLE = sevenLocales(chatJa, chatEn, {
  zh: chatZh,
  vi: chatVi,
  es: chatEs,
  id: chatId,
  th: chatTh,
});
const EMPTY_TABLE = sevenLocales(emptyJa, emptyEn, {
  zh: emptyZh,
  vi: emptyVi,
  es: emptyEs,
  id: emptyId,
  th: emptyTh,
});
const SAVED_TAB_TABLE = sevenLocales(savedTabJa, savedTabEn, {
  zh: savedTabZh,
  vi: savedTabVi,
  es: savedTabEs,
  id: savedTabId,
  th: savedTabTh,
});
const SETTINGS_TABLE = sevenLocales(settingsJa, settingsEn, {
  zh: settingsZh,
  vi: settingsVi,
  es: settingsEs,
  id: settingsId,
  th: settingsTh,
});
const SETTINGS_EXTRA_TABLE = sevenLocales(settingsExtraJa, settingsExtraEn, {
  zh: settingsExtraZh,
  vi: settingsExtraVi,
  es: settingsExtraEs,
  id: settingsExtraId,
  th: settingsExtraTh,
});
const DISPLAY_LANGUAGE_SCREEN_TABLE = sevenLocales(displayLanguageScreenJa, displayLanguageScreenEn, {
  zh: displayLanguageScreenZh,
  vi: displayLanguageScreenVi,
  es: displayLanguageScreenEs,
  id: displayLanguageScreenId,
  th: displayLanguageScreenTh,
});
const PROFILE_CARD_TABLE = sevenLocales(profileCardJa, profileCardEn, {
  zh: profileCardZh,
  vi: profileCardVi,
  es: profileCardEs,
  id: profileCardId,
  th: profileCardTh,
});

export function getDisplayLanguageScreenStrings(locale: AppScreensLocale): DisplayLanguageScreenStrings {
  return pickScreenStrings(DISPLAY_LANGUAGE_SCREEN_TABLE, locale);
}

export function getProfileCardStrings(locale: AppScreensLocale): ProfileCardStrings {
  return pickScreenStrings(PROFILE_CARD_TABLE, locale);
}

export function getNavigationTitles(locale: AppScreensLocale): NavigationTitles {
  return pickScreenStrings(NAVIGATION_TABLE, locale);
}

export function getHomeTabStrings(locale: AppScreensLocale): HomeTabStrings {
  return pickScreenStrings(HOME_TABLE, locale);
}

export function getTabBarStrings(locale: AppScreensLocale): TabBarStrings {
  return pickScreenStrings(TAB_BAR_TABLE, locale);
}

export function getVocabularyTabStrings(locale: AppScreensLocale): VocabularyTabStrings {
  return pickScreenStrings(VOCABULARY_TABLE, locale);
}

export function getGrammarTabStrings(locale: AppScreensLocale): GrammarTabStrings {
  return pickScreenStrings(GRAMMAR_TABLE, locale);
}

export function getChatTabStrings(locale: AppScreensLocale): ChatTabStrings {
  return pickScreenStrings(CHAT_TABLE, locale);
}

export function getEmptyStateStrings(locale: AppScreensLocale): EmptyStateStrings {
  return pickScreenStrings(EMPTY_TABLE, locale);
}

export function getSavedTabStrings(locale: AppScreensLocale): SavedTabStrings {
  return pickScreenStrings(SAVED_TAB_TABLE, locale);
}

export function getSettingsScreenStrings(locale: AppScreensLocale): SettingsScreenStrings {
  return pickScreenStrings(SETTINGS_TABLE, locale);
}

/** 未使用の場合は削除可（`getSettingsScreenStrings(locale).title` と同じ） */
export function getSettingsScreenHeaderTitle(locale: AppScreensLocale): string {
  return pickScreenStrings(SETTINGS_EXTRA_TABLE, locale).title;
}
