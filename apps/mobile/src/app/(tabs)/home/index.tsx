import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/stores/auth';
import { colors, typography } from '@/lib/theme';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const nome = user?.nome ?? 'Visitante';

  return (
    <ScreenContainer title={`Olá, ${nome}`} subtitle="Resumo do seu dia">
      <Card title="Glicemia">
        <Text style={styles.value}>-- mg/dL</Text>
        <Text style={styles.muted}>Sem registros hoje</Text>
      </Card>

      <Card title="Refeições">
        <Text style={styles.value}>0 / 5</Text>
        <Text style={styles.muted}>Plano alimentar do dia</Text>
      </Card>

      <Card title="Medicamentos">
        <Text style={styles.value}>0 pendentes</Text>
        <Text style={styles.muted}>Próximas doses</Text>
      </Card>

      <View style={{ height: 24 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  value: { ...typography.h2, color: colors.primary },
  muted: { ...typography.caption, color: colors.textMuted },
});
