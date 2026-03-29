/**
 * RevenueCat の設定チェックのみ（react-native-purchases を import しない）。
 * 起動時に subscriptionStore が読み込まれてもネイティブモジュールをロードしないため、
 * このファイルだけを静的 import する。
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim();
const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim();

function getRevenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') return iosApiKey ?? null;
  if (Platform.OS === 'android') return androidApiKey ?? null;
  return null;
}

export function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/** RevenueCat が利用可能か（API Key があり、Expo Go でない）。ネイティブモジュールは参照しない。 */
export function isRevenueCatConfigured(): boolean {
  if (isRunningInExpoGo()) return false;
  return Boolean(getRevenueCatApiKey());
}
