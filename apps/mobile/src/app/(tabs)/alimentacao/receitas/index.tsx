import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Card } from '@/components/Card';
import { colors, typography } from '@/lib/theme';

export default function ReceitasScreen() {
  return (
    <ScreenContainer title="Receitas" subtitle="Sugestões para o seu plano">
      <Card>
        <Text style={styles.muted}>Lista de receitas em breve.</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted },
});
