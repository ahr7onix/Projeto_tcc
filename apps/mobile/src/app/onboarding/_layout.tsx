import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function OnboardingLayout() {
  const { token, user, isHydrated } = useAuthStore();

  if (!isHydrated) return null;
  if (!token || !user) return <Redirect href="/(auth)" />;
  if (user.perfilCompleto) return <Redirect href="/(tabs)/home" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
