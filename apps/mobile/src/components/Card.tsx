import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/lib/theme';

interface Props {
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
}

export function Card({ title, action, children, style }: Props) {
  const hasHeader = title || action;
  return (
    <View style={[styles.card, style]}>
      {hasHeader ? (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          {action ?? null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    boxShadow: '0 2px 10px rgba(11,11,23,0.05)',
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h3, color: colors.text },
});
