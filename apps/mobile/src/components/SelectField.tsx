import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  label?: string;
  placeholder: string;
  options: Option<V>[];
}

export function SelectField<T extends FieldValues, V extends string>({
  control,
  name,
  label,
  placeholder,
  options,
}: Props<T, V>) {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        const current = options.find((o) => o.value === value);
        return (
          <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <Pressable
              style={[styles.field, error && styles.fieldError]}
              onPress={() => setOpen(true)}
            >
              <Text
                style={[
                  styles.fieldText,
                  !current && { color: colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {current?.label ?? placeholder}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>

            {error?.message ? <Text style={styles.error}>{error.message}</Text> : null}

            <Modal
              transparent
              visible={open}
              animationType="fade"
              onRequestClose={() => setOpen(false)}
            >
              <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                <Pressable style={styles.sheet} onPress={() => undefined}>
                  <Text style={styles.sheetTitle}>{placeholder}</Text>
                  {options.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => {
                          onChange(opt.value as PathValue<T, FieldPath<T>>);
                          setOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldError: { borderColor: colors.danger },
  fieldText: { ...typography.body, color: colors.text, flex: 1 },
  error: { ...typography.caption, color: colors.danger },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionSelected: { backgroundColor: colors.surfaceAlt },
  optionText: { ...typography.body, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
});
