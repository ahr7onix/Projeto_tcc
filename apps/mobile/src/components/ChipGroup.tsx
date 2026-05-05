import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type PathValue,
} from 'react-hook-form';
import { colors, radius, spacing, typography } from '@/lib/theme';

interface Option<V extends string> {
  value: V;
  label: string;
}

interface Props<T extends FieldValues, V extends string> {
  control: Control<T>;
  name: FieldPath<T>;
  options: Option<V>[];
}

export function ChipGroup<T extends FieldValues, V extends string>({
  control,
  name,
  options,
}: Props<T, V>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <View style={styles.row}>
            {options.map((opt) => {
              const selected = value === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange(opt.value as PathValue<T, FieldPath<T>>)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                  >
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
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    fontSize: 14,
  },
  chipTextSelected: { color: colors.textInverse, fontWeight: '700' },
  error: { ...typography.caption, color: colors.danger },
});
