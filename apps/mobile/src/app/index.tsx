import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/lib/theme';

export default function Index() {
  const router = useRouter();
  const { isHydrated, token } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (token) router.replace('/(tabs)/home');
    else router.replace('/(auth)/login');
  }, [isHydrated, token, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
