import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isGoogleAuthConfigured,
} from '@/lib/google-auth';

WebBrowser.maybeCompleteAuthSession();

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (element: HTMLElement, config: object) => void
          cancel: () => void
        }
      }
    }
  }
}

let gsiScriptPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (Platform.OS !== 'web') {
    return Promise.resolve();
  }
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Falha ao carregar Google Identity Services.')),
      );
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services.'));
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

export function mountGoogleWebButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void,
  onError: (message: string) => void,
): () => void {
  let cancelled = false;

  void loadGoogleIdentityScript()
    .then(() => {
      if (cancelled || !window.google?.accounts?.id || !GOOGLE_WEB_CLIENT_ID) return;
      container.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        ux_mode: 'popup',
        auto_select: false,
        callback: (response: { credential?: string }) => {
          if (!response.credential) {
            onError('O Google não retornou o token de identidade.');
            return;
          }
          onCredential(response.credential);
        },
      });
      const width = Math.max(240, Math.min(Math.floor(container.clientWidth || 320), 400));
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        locale: 'pt-BR',
        width,
      });
    })
    .catch((err: Error) => {
      if (!cancelled) onError(err.message);
    });

  return () => {
    cancelled = true;
    container.innerHTML = '';
    window.google?.accounts.id.cancel();
  };
}

export function useNativeGoogleAuthRequest() {
  const redirectUri =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : undefined;

  return Google.useIdTokenAuthRequest(
    isGoogleAuthConfigured()
      ? {
          webClientId: GOOGLE_WEB_CLIENT_ID,
          iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
          androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
          clientId: GOOGLE_WEB_CLIENT_ID,
          redirectUri,
        }
      : {
          clientId: 'disabled.apps.googleusercontent.com',
          webClientId: 'disabled.apps.googleusercontent.com',
        },
  );
}

export { isGoogleAuthConfigured };
