import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { acordarServidor } from '@/lib/api';
import { capturarErrosGlobais } from '@/lib/logger';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth';
import { useLembretesAgenda } from '@/hooks/use-lembretes-agenda';
import { usePushNotifications } from '@/hooks/use-push-notifications';

// Registrado uma vez, no carregamento do módulo.
capturarErrosGlobais();

function PushBridge() {
  usePushNotifications();
  useLembretesAgenda();
  return null;
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // A API do plano gratuito dorme quando fica parada; acordar ao abrir e ao
  // voltar para o app faz o primeiro login não esbarrar no servidor desligado.
  useEffect(() => {
    acordarServidor();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') acordarServidor();
    });
    return () => assinatura.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PushBridge />
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
