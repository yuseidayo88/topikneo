export { supabase, isSupabaseConfigured } from './client';
export {
  getSession,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  onAuthStateChange,
  getCurrentUserId,
} from './auth';
export type { AuthState } from './auth';
export {
  fetchJsonFromStorage,
  fetchWordsByLevel,
  fetchGrammarJson,
  fetchWordsByLevelAndLocale,
  BUCKET_CONTENT,
  WORDS_PREFIX,
  GRAMMAR_PREFIX,
} from './storage';
