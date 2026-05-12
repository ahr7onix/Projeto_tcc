import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IconName;
  value: string | number;
  label: string;
  tint?: 'primary' | 'success' | 'warning' | 'danger';
}

const tintMap = {
  primary: { fg: colors.primary, bg: colors.primarySoft },
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
};

export function StatTile({ icon, value, label, tint = 'primary' }: Props) {
  const t = tintMap[tint];
  return (
    <View style={styles.tile}>
      <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={16} color={t.fg} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { ...typography.h2, color: colors.text },
  label: { ...typography.caption, color: colors.textMuted, fontWeight: '500' },
});
