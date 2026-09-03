import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '';

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '';

export function isGoogleAuthConfigured(): boolean {
  // No web usamos o Client ID web; no nativo o provider escolhe por plataforma
  // e cai no webClientId se o específico não existir.
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}
