import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  label?: string;
  tone?: 'light' | 'glass';
}

export function Divider({ label, tone = 'light' }: Props) {
  const lineStyle = [styles.line, tone === 'glass' && styles.lineGlass];
  const labelStyle = [styles.label, tone === 'glass' && styles.labelGlass];
  if (!label) return <View style={lineStyle} />;
  return (
    <View style={styles.row}>
      <View style={lineStyle} />
      <Text style={labelStyle}>{label}</Text>
      <View style={lineStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  lineGlass: { backgroundColor: 'rgba(255,255,255,0.18)' },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelGlass: { color: colors.authMuted },
});
