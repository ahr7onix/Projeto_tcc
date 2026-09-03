import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { registrarPushToken } from '@/lib/api/push';
import { useAuthStore } from '@/stores/auth';

// O Expo Go perdeu o push remoto no SDK 53. Tentar pegar o token ali só gera
// erro no console — o push real só funciona em development build ou build final.
const RODANDO_NO_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function obterToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (RODANDO_NO_EXPO_GO) return null;

  const { status: statusAtual } = await Notifications.getPermissionsAsync();
  let status = statusAtual;

  if (status !== 'granted') {
    const solicitado = await Notifications.requestPermissionsAsync();
    status = solicitado.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const resposta = await Notifications.getExpoPushTokenAsync();
  return resposta.data;
}

export function usePushNotifications() {
  const token = useAuthStore((state) => state.token);
  const registrado = useRef(false);

  useEffect(() => {
    if (!token || registrado.current) return;

    let cancelado = false;

    (async () => {
      try {
        const pushToken = await obterToken();
        if (!pushToken || cancelado) return;

        const plataforma =
          Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

        await registrarPushToken(pushToken, plataforma);
        registrado.current = true;
      } catch {
        registrado.current = false;
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);
}
