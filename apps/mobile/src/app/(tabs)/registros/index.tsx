import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { colors, typography } from '@/lib/theme';

export default function RegistrosScreen() {
  return (
    <ScreenContainer title="Registros" subtitle="Histórico de medições">
      <Card title="Glicemia">
        <Text style={styles.muted}>Sem registros nos últimos 7 dias.</Text>
      </Card>

      <Card title="Refeições">
        <Text style={styles.muted}>Sem registros nos últimos 7 dias.</Text>
      </Card>

      <Card title="Estado emocional">
        <Text style={styles.muted}>Sem registros nos últimos 7 dias.</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted },
});
