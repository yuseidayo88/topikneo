/**
 * レッスン一覧・進捗などで使う文言（多言語対応）。
 * 「どの級のどのレッスンか」が分かるように level と lessonNum を両方含める。
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

export type LessonLocale = AppLocale;

const lessonsJa = {
  /** 級とレッスン番号を組み合わせた表示（例: 1級 レッスン 1） */
  lessonWithLevel: (level: number | string, lessonNum: number | string) =>
    `${level}級 レッスン ${lessonNum}`,
  /** レッスン一覧のヘッダー */
  vocabularyLessonsHeader: (level: number) => `TOPIK ${level}級 単語レッスン`,
  grammarLessonsHeader: (level: number) => `TOPIK ${level}級 文法レッスン`,
  /** 進捗サマリ（例: 2/73 レッスンクリア） */
  lessonsCleared: (cleared: number, total: number) => `${cleared} / ${total} レッスンクリア`,
  /** PROで解放（アクセシビリティなど） */
  lessonLockedPro: 'PROで解放',
  /** クリア済み */
  cleared: 'クリア',
  wordListErrorTitle: '読み込みに失敗しました',
  retry: '再試行',
  sectionProgress: '進捗',
  wordListHint:
    'タップで単語を確認 → クイズに挑戦（緑=正解・赤=不正解は最後のクイズ結果）',
  wordsCountA11y: (n: number) => `${n}語`,
  lessonListA11y: 'レッスン一覧',
  backA11y: '戻る',
  clearedA11ySuffix: '、クリア済み',
  wordLessonEmpty: 'このレッスンに単語がありません。',
  wordLessonEmptySub: 'ネット接続を確認し、単語タブでレベルを開き直してみてください。',
  speakWord: '発音を再生',
  speakExample: '例文の発音を再生',
  quizStart: 'クイズ開始',
};

const lessonsEn = {
  lessonWithLevel: (level: number | string, lessonNum: number | string) =>
    `TOPIK Level ${level} · Lesson ${lessonNum}`,
  vocabularyLessonsHeader: (level: number) => `TOPIK Level ${level} · Vocabulary`,
  grammarLessonsHeader: (level: number) => `TOPIK Level ${level} · Grammar`,
  lessonsCleared: (cleared: number, total: number) => `${cleared}/${total} lessons cleared`,
  lessonLockedPro: 'Unlock with PRO',
  cleared: 'Done',
  wordListErrorTitle: 'Could not load',
  retry: 'Retry',
  sectionProgress: 'Progress',
  wordListHint:
    'Tap a lesson to study words, then take the quiz. Green/red dots show your last quiz result.',
  wordsCountA11y: (n: number) => `${n} words`,
  lessonListA11y: 'Lesson list',
  backA11y: 'Back',
  clearedA11ySuffix: ', completed',
  wordLessonEmpty: 'No words in this lesson.',
  wordLessonEmptySub: 'Check your connection and reopen the level from the vocabulary tab.',
  speakWord: 'Play pronunciation',
  speakExample: 'Play example sentence',
  quizStart: 'Start quiz',
};

const lessonMaps: Record<AppLocale, typeof lessonsJa> = {
  ja: lessonsJa,
  en: lessonsEn,
  zh: lessonsEn,
  vi: lessonsEn,
  es: lessonsEn,
  id: lessonsEn,
  th: lessonsEn,
};

export function getLessonStrings(locale: LessonLocale = 'ja') {
  return lessonMaps[locale] ?? lessonMaps[FALLBACK_APP_LOCALE];
}
