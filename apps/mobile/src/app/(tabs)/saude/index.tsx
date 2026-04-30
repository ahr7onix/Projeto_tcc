import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { colors, typography } from '@/lib/theme';

export default function SaudeScreen() {
  return (
    <ScreenContainer title="Saúde" subtitle="Indicadores e metas clínicas">
      <Card title="Antropometria">
        <Text style={styles.muted}>Peso, altura e IMC ainda não registrados.</Text>
      </Card>

      <Card title="Metas clínicas">
        <Text style={styles.muted}>Nenhuma meta definida pelo nutricionista.</Text>
      </Card>

      <Card title="Medicamentos">
        <Text style={styles.muted}>Nenhum medicamento cadastrado.</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted },
});
