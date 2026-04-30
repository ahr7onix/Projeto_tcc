import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout() {
  const { token, isHydrated } = useAuthStore();

  if (isHydrated && token) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="cadastro" />
    </Stack>
  );
}
