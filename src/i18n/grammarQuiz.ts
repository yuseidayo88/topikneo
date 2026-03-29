/**
 * 文法クイズ画面のUI文言（多言語対応用）。
 * 表示言語は useProfileStore(s => s.displayLanguage) で取得し、
 * getGrammarQuizStrings(locale) に渡す想定。
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

export type UILocale = AppLocale;

export type GrammarQuizStrings = {
  quizTitle: string;
  problemLabel: string;
  instruction: string;
  tapHint: string;
  answerPlaceholder: string;
  confirm: string;
  correct: string;
  wrong: string;
  correctAnswerLabel: string;
  next: string;
  playPronunciation: string;
  translationAlways: string;
  translationWrongOnly: string;
  translationToggleLabel: string;
  playCorrectSentence: string;
  noQuestionsTitle: string;
  noQuestionsSub: string;
  backToLesson: string;
  periodLabel: string;
  confirmAnswer: string;
  selectAllFirst: string;
  selectedTapToReturn: (orderInAnswer: number, word: string) => string;
  poolWordLabel: (orderInPool: number, poolSize: number, word: string) => string;
  quitConfirmTitle: string;
  cancel: string;
  quit: string;
  quitButtonLabel: string;
  correctScore: (n: number) => string;
  quizHeaderA11y: (quizTitle: string, current: number, total: number) => string;
};

const grammarQuizJa: GrammarQuizStrings = {
    quizTitle: '文法クイズ',
    problemLabel: 'この文を韓国語で作りましょう',
    instruction: '語をタップして正しい順に並べましょう',
    tapHint: '選択した語をタップすると戻せます',
    answerPlaceholder: '語をタップしてここに並べる',
    confirm: '確認',
    correct: '正解!',
    wrong: '不正解',
    correctAnswerLabel: '正解:',
    next: '次へ',
    playPronunciation: '発音を再生',
    translationAlways: '訳を不正解時のみ表示に切り替え',
    translationWrongOnly: '訳を常に表示に切り替え',
    translationToggleLabel: '訳の表示',
    playCorrectSentence: '正解文を読み上げ',
    noQuestionsTitle: 'このレッスンには問題がありません',
    noQuestionsSub: 'ほかのレッスンでクイズに挑戦しましょう',
    backToLesson: 'レッスンに戻る',
    periodLabel: '文末の句点',
    confirmAnswer: '答えを確認する',
    selectAllFirst: '語をすべて選んでから確認できます',
    selectedTapToReturn: (orderInAnswer, word) => `答えの${orderInAnswer}番目: ${word}。タップで戻す`,
    poolWordLabel: (orderInPool, poolSize, word) => `候補 ${orderInPool}/${poolSize}: ${word}`,
    quitConfirmTitle: 'クイズを中断しますか？',
    cancel: 'キャンセル',
    quit: '中断する',
    quitButtonLabel: 'クイズを中断する',
    correctScore: (n) => `正解: ${n}`,
    quizHeaderA11y: (quizTitle: string, current: number, total: number) =>
      `${quizTitle} ${current} 問目、全 ${total} 問`,
};

const grammarQuizEn: GrammarQuizStrings = {
    quizTitle: 'Grammar Quiz',
    problemLabel: 'Make this sentence in Korean',
    instruction: 'Tap the words to arrange them in the correct order',
    tapHint: 'Tap a selected word to return it',
    answerPlaceholder: 'Tap words to place them here',
    confirm: 'Check',
    correct: 'Correct!',
    wrong: 'Incorrect',
    correctAnswerLabel: 'Correct:',
    next: 'Next',
    playPronunciation: 'Play pronunciation',
    translationAlways: 'Show translation only when wrong',
    translationWrongOnly: 'Always show translation',
    translationToggleLabel: 'Translation',
    playCorrectSentence: 'Play correct sentence',
    noQuestionsTitle: 'No questions in this lesson',
    noQuestionsSub: 'Try another lesson for the quiz',
    backToLesson: 'Back to lesson',
    periodLabel: 'Period',
    confirmAnswer: 'Check answer',
    selectAllFirst: 'Select all words to check',
    selectedTapToReturn: (orderInAnswer, word) => `Answer position ${orderInAnswer}: ${word}. Tap to return`,
    poolWordLabel: (orderInPool, poolSize, word) => `Choice ${orderInPool} of ${poolSize}: ${word}`,
    quitConfirmTitle: 'Quit the quiz?',
    cancel: 'Cancel',
    quit: 'Quit',
    quitButtonLabel: 'Quit quiz',
    correctScore: (n) => `Correct: ${n}`,
    quizHeaderA11y: (quizTitle: string, current: number, total: number) =>
      `${quizTitle}, question ${current} of ${total}`,
};

export const grammarQuizStrings: Record<AppLocale, GrammarQuizStrings> = {
  ja: grammarQuizJa,
  en: grammarQuizEn,
  zh: grammarQuizEn,
  vi: grammarQuizEn,
  es: grammarQuizEn,
  id: grammarQuizEn,
  th: grammarQuizEn,
};

export function getGrammarQuizStrings(locale: UILocale = 'ja'): GrammarQuizStrings {
  return grammarQuizStrings[locale] ?? grammarQuizStrings[FALLBACK_APP_LOCALE];
}
