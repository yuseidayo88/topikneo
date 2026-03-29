/**
 * デイリー目標・タイムゾーン・ハングルパズルなどの画面文言
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';
import type { AppScreensLocale } from './appScreens';
import { TIMEZONE_OPTIONS } from '@/src/utils/timezone';

export type HangulPuzzleCourseId = 'basic' | 'batchim' | 'batchim2' | 'tensed' | 'mixed';

export type DailyGoalScreenStrings = {
  title: string;
  sectionTitle: string;
  description: string;
  wordRow: string;
  grammarRow: string;
  save: string;
  backA11y: string;
  saveA11y: string;
  modalHint: string;
  done: string;
  goalNone: string;
  wordGoalA11y: (current: string) => string;
  grammarGoalA11y: (current: string) => string;
};

export type TimezoneScreenStrings = {
  title: string;
  sectionTitle: string;
  description: string;
  matchDevice: string;
  currentBadge: string;
  backA11y: string;
};

/** IANA value → 英語表示名 */
const TIMEZONE_LABEL_EN: Record<string, string> = {
  'Asia/Tokyo': 'Japan',
  'Asia/Seoul': 'South Korea',
  'America/New_York': 'US (Eastern)',
  'America/Los_Angeles': 'US (Western)',
  'Europe/London': 'United Kingdom',
  'Europe/Paris': 'France',
  'Australia/Sydney': 'Australia (Sydney)',
  'Asia/Shanghai': 'China',
  'Asia/Singapore': 'Singapore',
  'Asia/Bangkok': 'Thailand',
  'Asia/Jakarta': 'Indonesia',
  'Asia/Kolkata': 'India',
  'America/Sao_Paulo': 'Brazil (São Paulo)',
  'Africa/Cairo': 'Egypt',
};

const TIMEZONE_LABEL_ZH: Record<string, string> = {
  'Asia/Tokyo': '日本',
  'Asia/Seoul': '韩国',
  'America/New_York': '美国（东部）',
  'America/Los_Angeles': '美国（西部）',
  'Europe/London': '英国',
  'Europe/Paris': '法国',
  'Australia/Sydney': '澳大利亚（悉尼）',
  'Asia/Shanghai': '中国',
  'Asia/Singapore': '新加坡',
  'Asia/Bangkok': '泰国',
  'Asia/Jakarta': '印度尼西亚',
  'Asia/Kolkata': '印度',
  'America/Sao_Paulo': '巴西（圣保罗）',
  'Africa/Cairo': '埃及',
};

const TIMEZONE_LABEL_VI: Record<string, string> = {
  'Asia/Tokyo': 'Nhật Bản',
  'Asia/Seoul': 'Hàn Quốc',
  'America/New_York': 'Mỹ (Đông)',
  'America/Los_Angeles': 'Mỹ (Tây)',
  'Europe/London': 'Vương quốc Anh',
  'Europe/Paris': 'Pháp',
  'Australia/Sydney': 'Úc (Sydney)',
  'Asia/Shanghai': 'Trung Quốc',
  'Asia/Singapore': 'Singapore',
  'Asia/Bangkok': 'Thái Lan',
  'Asia/Jakarta': 'Indonesia',
  'Asia/Kolkata': 'Ấn Độ',
  'America/Sao_Paulo': 'Brazil (São Paulo)',
  'Africa/Cairo': 'Ai Cập',
};

const TIMEZONE_LABEL_ES: Record<string, string> = {
  'Asia/Tokyo': 'Japón',
  'Asia/Seoul': 'Corea del Sur',
  'America/New_York': 'EE. UU. (Este)',
  'America/Los_Angeles': 'EE. UU. (Oeste)',
  'Europe/London': 'Reino Unido',
  'Europe/Paris': 'Francia',
  'Australia/Sydney': 'Australia (Sídney)',
  'Asia/Shanghai': 'China',
  'Asia/Singapore': 'Singapur',
  'Asia/Bangkok': 'Tailandia',
  'Asia/Jakarta': 'Indonesia',
  'Asia/Kolkata': 'India',
  'America/Sao_Paulo': 'Brasil (São Paulo)',
  'Africa/Cairo': 'Egipto',
};

const TIMEZONE_LABEL_ID: Record<string, string> = {
  'Asia/Tokyo': 'Jepang',
  'Asia/Seoul': 'Korea Selatan',
  'America/New_York': 'AS (Timur)',
  'America/Los_Angeles': 'AS (Barat)',
  'Europe/London': 'Inggris Raya',
  'Europe/Paris': 'Prancis',
  'Australia/Sydney': 'Australia (Sydney)',
  'Asia/Shanghai': 'Tiongkok',
  'Asia/Singapore': 'Singapura',
  'Asia/Bangkok': 'Thailand',
  'Asia/Jakarta': 'Indonesia',
  'Asia/Kolkata': 'India',
  'America/Sao_Paulo': 'Brasil (São Paulo)',
  'Africa/Cairo': 'Mesir',
};

const TIMEZONE_LABEL_TH: Record<string, string> = {
  'Asia/Tokyo': 'ญี่ปุ่น',
  'Asia/Seoul': 'เกาหลีใต้',
  'America/New_York': 'สหรัฐฯ (ตะวันออก)',
  'America/Los_Angeles': 'สหรัฐฯ (ตะวันตก)',
  'Europe/London': 'สหราชอาณาจักร',
  'Europe/Paris': 'ฝรั่งเศส',
  'Australia/Sydney': 'ออสเตรเลีย (ซิดนีย์)',
  'Asia/Shanghai': 'จีน',
  'Asia/Singapore': 'สิงคโปร์',
  'Asia/Bangkok': 'ไทย',
  'Asia/Jakarta': 'อินโดนีเซีย',
  'Asia/Kolkata': 'อินเดีย',
  'America/Sao_Paulo': 'บราซิล (เซาเปาโล)',
  'Africa/Cairo': 'อียิปต์',
};

const TIMEZONE_LABEL_BY_APP_LOCALE: Record<Exclude<AppLocale, 'ja'>, Record<string, string>> = {
  en: TIMEZONE_LABEL_EN,
  zh: TIMEZONE_LABEL_ZH,
  vi: TIMEZONE_LABEL_VI,
  es: TIMEZONE_LABEL_ES,
  id: TIMEZONE_LABEL_ID,
  th: TIMEZONE_LABEL_TH,
};

export function getTimezoneRows(locale: AppScreensLocale): { value: string; label: string }[] {
  return TIMEZONE_OPTIONS.map((o) => ({
    value: o.value,
    label:
      locale === 'ja'
        ? o.label
        : (TIMEZONE_LABEL_BY_APP_LOCALE[locale as Exclude<AppLocale, 'ja'>]?.[o.value] ??
            TIMEZONE_LABEL_EN[o.value] ??
            o.label),
  }));
}

export type HangulPuzzleCourseCopy = { title: string; description: string };

export type HangulPuzzleStrings = {
  listTitle: string;
  listIntro: string;
  backA11y: string;
  proUnlockA11y: string;
  courses: Record<HangulPuzzleCourseId, HangulPuzzleCourseCopy>;
  /** プレイ画面 */
  playTitle: string;
  quitTitle: string;
  quitCancel: string;
  quitConfirm: string;
  correctCount: (n: number) => string;
  headerProgressA11y: (current: number, total: number) => string;
  closeQuizA11y: string;
  buildSyllablePrompt: string;
  assemblingHint: string;
  labelCho: string;
  labelJung: string;
  labelJong: string;
  pickChars: string;
  pronounce: string;
  pronounceA11y: string;
  selectCho: string;
  selectJung: string;
  selectJong: string;
  redoChoA11y: string;
  redoJungA11y: string;
  redoJongA11y: string;
  feedbackCorrect: string;
  feedbackWrong: string;
  feedbackAnswer: (syllable: string) => string;
  feedbackNext: string;
  tryAgain: string;
  nextQuestion: string;
  resultTitle: string;
  resultClear: string;
  resultEncourage: string;
  accuracyLabel: string;
  scoreLine: (correct: number, total: number) => string;
  backToCoursesA11y: string;
  tryAgainA11y: string;
  toCoursesA11y: string;
  toVocabTabA11y: string;
  playAgain: string;
  toCourseList: string;
  toVocabTab: string;
  a11yCho: (hangul: string, rom: string) => string;
  a11yJung: (hangul: string, rom: string) => string;
  a11yJong: (hangul: string, rom: string) => string;
  a11yJongNone: string;
};

const dailyJa: DailyGoalScreenStrings = {
  title: '今日の目標',
  sectionTitle: '毎日クリアしたいレッスン数',
  description:
    'ホームの「今日すること」に表示されます。タップして0〜10のうちから選んでください。0は目標なしです。',
  wordRow: '単語レッスン',
  grammarRow: '文法レッスン',
  save: '保存',
  backA11y: '戻る',
  saveA11y: '保存して戻る',
  modalHint: '0は目標なし、1〜10で選択',
  done: '完了',
  goalNone: 'なし',
  wordGoalA11y: (current) => `単語レッスンの目標。現在${current}。タップで変更`,
  grammarGoalA11y: (current) => `文法レッスンの目標。現在${current}。タップで変更`,
};

const dailyEn: DailyGoalScreenStrings = {
  title: "Today's goal",
  sectionTitle: 'Daily lesson targets',
  description:
    'Shown under Today’s to-do on Home. Tap to pick 0–10. Use 0 for no goal.',
  wordRow: 'Vocabulary lessons',
  grammarRow: 'Grammar lessons',
  save: 'Save',
  backA11y: 'Back',
  saveA11y: 'Save and go back',
  modalHint: '0 = no goal, or choose 1–10',
  done: 'Done',
  goalNone: 'None',
  wordGoalA11y: (current) => `Vocabulary goal, currently ${current}. Tap to change`,
  grammarGoalA11y: (current) => `Grammar goal, currently ${current}. Tap to change`,
};

const tzJa: TimezoneScreenStrings = {
  title: '地域（タイムゾーン）',
  sectionTitle: '「今日」の日付について',
  description:
    '連続学習・今日すること・カレンダーなどの「今日」は、選択した地域の日付で変わります。日本以外でも正しく表示されます。',
  matchDevice: 'デバイスに合わせる',
  currentBadge: '現在',
  backA11y: '戻る',
};

const tzEn: TimezoneScreenStrings = {
  title: 'Region (time zone)',
  sectionTitle: 'What “today” means',
  description:
    'Streak, daily to-dos, and the calendar use the date in the region you select. This works correctly outside Japan too.',
  matchDevice: 'Match device',
  currentBadge: 'Current',
  backA11y: 'Back',
};

const hangulJa: HangulPuzzleStrings = {
  listTitle: 'ハングルパズル',
  listIntro: 'コースを選んでスタート',
  backA11y: '戻る',
  proUnlockA11y: 'PROで解放',
  courses: {
    basic: { title: 'はじめて', description: '子音＋母音だけ。パッチムなしの音節で練習。' },
    batchim: { title: 'パッチムに挑戦', description: 'パッチム1つの音節だけ。単語でよく使う形。' },
    batchim2: { title: 'パッチム2つ', description: 'ㄳ, ㄵ, ㄺ など、パッチムが2つつく音節の練習。' },
    tensed: { title: '濃音・激音', description: 'ㄱとㄲ、ㄷとㄸ など、似た音の聞き分け・書き分け。' },
    mixed: { title: '全部まぜて', description: 'はじめて・パッチム・濃音激音をランダムで出題。' },
  },
  playTitle: 'ハングルパズル',
  quitTitle: 'ハングルパズルを中断しますか？',
  quitCancel: 'キャンセル',
  quitConfirm: '中断する',
  correctCount: (n) => `正解: ${n}`,
  headerProgressA11y: (c, t) => `ハングルパズル ${c} 問目、全 ${t} 問`,
  closeQuizA11y: 'クイズを終了する',
  buildSyllablePrompt: 'この音節を組み立てよう',
  assemblingHint: '組み立て中（タップで取り消し）',
  labelCho: '子音',
  labelJung: '母音',
  labelJong: 'パッチム',
  pickChars: '文字を選んでタップ',
  pronounce: '発音',
  pronounceA11y: '発音を再生',
  selectCho: '子音を選ぶ',
  selectJung: '母音を選ぶ',
  selectJong: 'パッチムを選ぶ',
  redoChoA11y: '子音を選び直す',
  redoJungA11y: '母音を選び直す',
  redoJongA11y: 'パッチムを選び直す',
  feedbackCorrect: '正解！',
  feedbackWrong: '不正解',
  feedbackAnswer: (s) => `正解: ${s}`,
  feedbackNext: '次の問題へ…',
  tryAgain: 'もう一度',
  nextQuestion: '次の問題',
  resultTitle: '結果',
  resultClear: 'クリア！',
  resultEncourage: 'もう一度挑戦しよう',
  accuracyLabel: '正答率',
  scoreLine: (correct, total) => `${correct}問正解 / ${total}問中`,
  backToCoursesA11y: 'コース一覧に戻る',
  tryAgainA11y: 'もう一度挑戦',
  toCoursesA11y: 'コース一覧へ',
  toVocabTabA11y: '単語タブへ',
  playAgain: 'もう一度',
  toCourseList: 'コース一覧へ',
  toVocabTab: '単語タブへ',
  a11yCho: (h, r) => `子音 ${h}、${r}`,
  a11yJung: (h, r) => `母音 ${h}、${r}`,
  a11yJong: (h, r) => `パッチム ${h}、${r}`,
  a11yJongNone: 'パッチム なし',
};

const hangulEn: HangulPuzzleStrings = {
  listTitle: 'Hangul puzzle',
  listIntro: 'Pick a course to start',
  backA11y: 'Back',
  proUnlockA11y: 'Unlock with PRO',
  courses: {
    basic: {
      title: 'First steps',
      description: 'Consonants and vowels only—syllables without batchim.',
    },
    batchim: {
      title: 'Try batchim',
      description: 'One batchim per syllable—common shapes in words.',
    },
    batchim2: {
      title: 'Double batchim',
      description: 'Practice syllables with two batchim (e.g. ㄳ, ㄵ, ㄺ).',
    },
    tensed: {
      title: 'Tense & aspirated',
      description: 'Tell and write similar sounds (e.g. ㄱ vs ㄲ, ㄷ vs ㄸ).',
    },
    mixed: {
      title: 'Mix all',
      description: 'Random mix of beginner, batchim, and tense/aspirated.',
    },
  },
  playTitle: 'Hangul puzzle',
  quitTitle: 'Leave Hangul puzzle?',
  quitCancel: 'Cancel',
  quitConfirm: 'Leave',
  correctCount: (n) => `Correct: ${n}`,
  headerProgressA11y: (c, t) => `Hangul puzzle, question ${c} of ${t}`,
  closeQuizA11y: 'Close quiz',
  buildSyllablePrompt: 'Build this syllable',
  assemblingHint: 'Building (tap to clear)',
  labelCho: 'C',
  labelJung: 'V',
  labelJong: 'Batchim',
  pickChars: 'Tap a character',
  pronounce: 'Play',
  pronounceA11y: 'Play pronunciation',
  selectCho: 'Pick a consonant',
  selectJung: 'Pick a vowel',
  selectJong: 'Pick batchim',
  redoChoA11y: 'Change consonant',
  redoJungA11y: 'Change vowel',
  redoJongA11y: 'Change batchim',
  feedbackCorrect: 'Correct!',
  feedbackWrong: 'Not quite',
  feedbackAnswer: (s) => `Answer: ${s}`,
  feedbackNext: 'Next question…',
  tryAgain: 'Try again',
  nextQuestion: 'Next',
  resultTitle: 'Results',
  resultClear: 'Perfect!',
  resultEncourage: 'Try again',
  accuracyLabel: 'Accuracy',
  scoreLine: (correct, total) => `${correct} / ${total} correct`,
  backToCoursesA11y: 'Back to courses',
  tryAgainA11y: 'Try again',
  toCoursesA11y: 'Course list',
  toVocabTabA11y: 'Vocabulary tab',
  playAgain: 'Play again',
  toCourseList: 'Course list',
  toVocabTab: 'Vocabulary tab',
  a11yCho: (h, r) => `Consonant ${h}, ${r}`,
  a11yJung: (h, r) => `Vowel ${h}, ${r}`,
  a11yJong: (h, r) => `Batchim ${h}, ${r}`,
  a11yJongNone: 'No batchim',
};

const dailyMaps: Record<AppLocale, DailyGoalScreenStrings> = {
  ja: dailyJa,
  en: dailyEn,
  zh: dailyEn,
  vi: dailyEn,
  es: dailyEn,
  id: dailyEn,
  th: dailyEn,
};

const tzMaps: Record<AppLocale, TimezoneScreenStrings> = {
  ja: tzJa,
  en: tzEn,
  zh: tzEn,
  vi: tzEn,
  es: tzEn,
  id: tzEn,
  th: tzEn,
};

const hangulMaps: Record<AppLocale, HangulPuzzleStrings> = {
  ja: hangulJa,
  en: hangulEn,
  zh: hangulEn,
  vi: hangulEn,
  es: hangulEn,
  id: hangulEn,
  th: hangulEn,
};

export function getDailyGoalScreenStrings(locale: AppScreensLocale): DailyGoalScreenStrings {
  return dailyMaps[locale] ?? dailyMaps[FALLBACK_APP_LOCALE];
}

export function getTimezoneScreenStrings(locale: AppScreensLocale): TimezoneScreenStrings {
  return tzMaps[locale] ?? tzMaps[FALLBACK_APP_LOCALE];
}

export function getHangulPuzzleStrings(locale: AppScreensLocale): HangulPuzzleStrings {
  return hangulMaps[locale] ?? hangulMaps[FALLBACK_APP_LOCALE];
}
