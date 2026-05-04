import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { colors, radius, spacing, typography } from '@/lib/theme';
import type { UserRole } from '@/types/auth';

interface Option {
  value: UserRole;
  label: string;
}

const OPTIONS: Option[] = [
  { value: 'paciente', label: 'Paciente' },
  { value: 'nutricionista', label: 'Nutricionista' },
];

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
}

export function RoleSelector<T extends FieldValues>({
  control,
  name,
  label,
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.row}>
            {OPTIONS.map((opt) => {
              const selected = value === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange(opt.value)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {error?.message ? <Text style={styles.error}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { ...typography.body, color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: colors.textInverse },
  error: { ...typography.caption, color: colors.danger },
});
