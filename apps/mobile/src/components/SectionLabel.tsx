import { StyleSheet, Text } from 'react-native';
import { colors, spacing } from '@/lib/theme';

interface Props {
  children: string;
}

export function SectionLabel({ children }: Props) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: 2,
  },
});
