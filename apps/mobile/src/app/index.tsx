import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/lib/theme';

export default function Index() {
  const { isHydrated, token, user } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!token) return <Redirect href="/(auth)" />;
  if (user?.role === 'paciente' && !user.perfilCompleto) {
    return <Redirect href="/onboarding/paciente" />;
  }
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
