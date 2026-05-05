import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  label?: string;
}

export function Divider({ label }: Props) {
  if (!label) return <View style={styles.line} />;
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
