import { Pressable, StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function PerfilScreen() {
  const { user, signOut } = useAuthStore();

  return (
    <ScreenContainer title="Perfil" subtitle="Conta e preferências">
      <Card title="Dados da conta">
        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{user?.nome ?? '—'}</Text>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
        <Text style={styles.label}>Tipo</Text>
        <Text style={styles.value}>{user?.role ?? '—'}</Text>
      </Card>

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sair</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  value: { ...typography.body, color: colors.text },
  signOut: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  signOutText: { color: colors.textInverse, fontWeight: '600', fontSize: 15 },
});
