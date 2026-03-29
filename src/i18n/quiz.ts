/**
 * 単語クイズ・復習・保存クイズ・結果画面のUI文言（多言語対応）。
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

export type UILocale = AppLocale;

const quizJa = {
  lessonNotFoundTitle: 'レッスンが見つかりません',
  lessonNotFoundBody: '単語データが読み込めていないか、レッスンIDが無効です。',
  lessonGoBack: '戻る',
  quitConfirmTitle: 'クイズを中断しますか？',
  cancel: 'キャンセル',
  quit: '中断する',
  quitButtonLabel: 'クイズを中断する',
  playPronunciation: '発音を再生',
  correctScore: (n: number) => `正解: ${n}`,
  addToFavorites: 'お気に入りに登録',
  removeFromFavorites: 'お気に入りから外す',
  quizHeaderA11y: (quizTitle: string, current: number, total: number) =>
    `${quizTitle} ${current} 問目、全 ${total} 問`,
  optionA11y: (index: number, text: string) => `選択肢 ${index + 1}: ${text}`,
  reviewEmptyTitle: '復習する単語がありません',
  reviewEmptySub: '新しいレッスンをクリアすると復習が出てきます',
  reviewEmptyButton: '単語タブへ',
  reviewEmptyButtonA11y: '単語タブへ',
  savedQuizEmptyTitle: '保存した単語がありません',
  savedQuizEmptySub: '単語学習で ★ をタップして保存すると、ここでクイズできます',
  savedQuizBackButton: '保存タブへ戻る',
  savedQuizBackButtonA11y: '保存タブへ戻る',
};

const quizEn = {
  lessonNotFoundTitle: 'Lesson not found',
  lessonNotFoundBody: 'Word data may not be loaded, or the lesson ID is invalid.',
  lessonGoBack: 'Go back',
  quitConfirmTitle: 'Quit the quiz?',
  cancel: 'Cancel',
  quit: 'Quit',
  quitButtonLabel: 'Quit quiz',
  playPronunciation: 'Play pronunciation',
  correctScore: (n: number) => `Correct: ${n}`,
  addToFavorites: 'Add to favorites',
  removeFromFavorites: 'Remove from favorites',
  quizHeaderA11y: (quizTitle: string, current: number, total: number) =>
    `${quizTitle}, question ${current} of ${total}`,
  optionA11y: (index: number, text: string) => `Option ${index + 1}: ${text}`,
  reviewEmptyTitle: 'No words to review',
  reviewEmptySub: 'Complete lessons to get words in your review queue.',
  reviewEmptyButton: 'Go to Vocabulary',
  reviewEmptyButtonA11y: 'Go to vocabulary tab',
  savedQuizEmptyTitle: 'No saved words yet',
  savedQuizEmptySub: 'Tap the star in vocabulary lessons to save words, then quiz them here.',
  savedQuizBackButton: 'Back to Saved',
  savedQuizBackButtonA11y: 'Back to saved tab',
};

const resultJa = {
  errorBoundaryContext: 'クイズ結果',
  resultTitle: '結果',
  percentLabel: '正答率',
  clear: 'クリア！',
  tryAgainLabel: 'もう一度挑戦しよう',
  correctCountCaption: (correct: number, total: number) => `${correct}問正解 / ${total}問中`,
  retry: 'もう一度',
  retryAccessibility: 'もう一度挑戦',
  nextLesson: '次のレッスン',
  backToList: 'レッスン一覧に戻る',
  backToWordList: '単語一覧に戻る',
  backToGrammarList: '文法一覧に戻る',
  backToSavedList: '保存した単語一覧に戻る',
  wrongWordsSection: (count: number) => `間違えた単語（${count}語）`,
  /** 文法クイズ結果から同じ級の単語タブへ */
  goToVocabularySameLevel: '単語レッスンへ（同じ級）',
};

const resultEn = {
  errorBoundaryContext: 'Quiz result',
  resultTitle: 'Result',
  percentLabel: 'Correct rate',
  clear: 'Clear!',
  tryAgainLabel: 'Try again',
  correctCountCaption: (correct: number, total: number) => `${correct} correct / ${total}`,
  retry: 'Retry',
  retryAccessibility: 'Try again',
  nextLesson: 'Next lesson',
  backToList: 'Back to lesson list',
  backToWordList: 'Back to word list',
  backToGrammarList: 'Back to grammar list',
  backToSavedList: 'Back to saved words',
  wrongWordsSection: (count: number) => `Wrong words (${count})`,
  goToVocabularySameLevel: 'Vocabulary (same level)',
};

const quizMap: Record<AppLocale, typeof quizJa> = {
  ja: quizJa,
  en: quizEn,
  zh: quizEn,
  vi: quizEn,
  es: quizEn,
  id: quizEn,
  th: quizEn,
};

const resultMap: Record<AppLocale, typeof resultJa> = {
  ja: resultJa,
  en: resultEn,
  zh: resultEn,
  vi: resultEn,
  es: resultEn,
  id: resultEn,
  th: resultEn,
};

export const quizStrings = quizMap;
export const resultStrings = resultMap;

export function getQuizStrings(locale: UILocale = FALLBACK_APP_LOCALE) {
  return quizMap[locale] ?? quizMap[FALLBACK_APP_LOCALE];
}

export function getResultStrings(locale: UILocale = FALLBACK_APP_LOCALE) {
  return resultMap[locale] ?? resultMap[FALLBACK_APP_LOCALE];
}
