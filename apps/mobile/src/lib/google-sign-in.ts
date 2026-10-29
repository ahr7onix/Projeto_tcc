import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
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

// No APK do Android o login usa o Google Sign-In nativo. O token sai em nome do
// Client ID web, o mesmo que a API confere; o Google só libera se existir um
// cliente Android com o pacote e o SHA-1 da chave do APK (docs/LOGIN_GOOGLE.md).
// O Expo Go não tem esse módulo nativo e continua no expo-auth-session.
const RODANDO_NO_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function usaGoogleNativo(): boolean {
  return Platform.OS === 'android' && !RODANDO_NO_EXPO_GO;
}

// Devolve o id_token, ou null se a pessoa fechou a escolha de conta.
export async function entrarComGoogleNativo(): Promise<string | null> {
  // Carregado só aqui: no Expo Go o módulo quebra assim que é importado.
  const { GoogleSignin, isErrorWithCode, statusCodes } = await import(
    '@react-native-google-signin/google-signin'
  );

  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Sem isso o Google reaproveita a última conta e não deixa trocar.
    await GoogleSignin.signOut();
    const resposta = await GoogleSignin.signIn();
    if (resposta.type !== 'success') return null;
    if (!resposta.data.idToken) {
      throw new Error('O Google não retornou o token de identidade.');
    }
    return resposta.data.idToken;
  } catch (err) {
    if (!isErrorWithCode(err)) throw err;
    if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Este celular precisa do Google Play Services atualizado.');
    }
    // 7 é o NETWORK_ERROR: o celular não conseguiu falar com o Google.
    if (err.code === '7') {
      throw new Error('Sem internet para falar com o Google. Confira a conexão e tente de novo.');
    }
    // 10 é o DEVELOPER_ERROR: falta o cliente Android ou o SHA-1 não bate.
    if (err.code === '10') {
      throw new Error('O Google não reconheceu este aplicativo. Avise a equipe.');
    }
    throw new Error(err.message || 'Falha no login com Google.');
  }
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
