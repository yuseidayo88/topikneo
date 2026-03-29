import Constants from 'expo-constants';

/** アプリの表示用バージョン（app.json / app.config の version、取得できない場合は '1.0.0'） */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}
