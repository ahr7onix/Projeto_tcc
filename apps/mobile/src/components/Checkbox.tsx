import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { colors, radius, spacing, typography } from '@/lib/theme';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  children: ReactNode;
}

export function Checkbox<T extends FieldValues>({ control, name, children }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <Pressable style={styles.row} onPress={() => onChange(!value)}>
            <View style={[styles.box, value && styles.boxChecked]}>
              {value ? (
                <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              ) : null}
            </View>
            <View style={styles.labelWrap}>
              <Text style={styles.labelText}>{children}</Text>
            </View>
          </Pressable>
          {error?.message ? <Text style={styles.error}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  labelWrap: { flex: 1 },
  labelText: { ...typography.caption, color: colors.text, lineHeight: 18 },
  error: { ...typography.caption, color: colors.danger, marginLeft: 30 },
});
