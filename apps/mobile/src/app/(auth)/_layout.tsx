import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout() {
  const { token, user, isHydrated } = useAuthStore();

  if (isHydrated && token) {
    if (user?.role === 'paciente' && !user.perfilCompleto) {
      return <Redirect href="/onboarding/paciente" />;
    }
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login/index" />
      <Stack.Screen name="login/cliente" />
      <Stack.Screen name="login/nutricionista" />
      <Stack.Screen name="cadastro" />
      <Stack.Screen name="esqueci-senha" />
    </Stack>
  );
}
