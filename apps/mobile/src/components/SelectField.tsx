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
  tone?: 'light' | 'glass';
}

export function SelectField<T extends FieldValues, V extends string>({
  control,
  name,
  label,
  placeholder,
  options,
  tone = 'light',
}: Props<T, V>) {
  const [open, setOpen] = useState(false);
  const isGlass = tone === 'glass';

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        const current = options.find((o) => o.value === value);
        return (
          <View style={styles.wrapper}>
            {label ? (
              <Text style={[styles.label, isGlass && styles.labelGlass]}>{label}</Text>
            ) : null}

            <Pressable
              style={[
                styles.field,
                isGlass && styles.fieldGlass,
                error && (isGlass ? styles.fieldErrorGlass : styles.fieldError),
              ]}
              onPress={() => setOpen(true)}
            >
              <Text
                style={[
                  styles.fieldText,
                  isGlass && styles.fieldTextGlass,
                  !current && {
                    color: isGlass ? 'rgba(255,255,255,0.45)' : colors.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {current?.label ?? placeholder}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={isGlass ? colors.authMuted : colors.textMuted}
              />
            </Pressable>

            {error?.message ? (
              <Text style={[styles.error, isGlass && styles.errorGlass]}>
                {error.message}
              </Text>
            ) : null}

            <Modal
              transparent
              visible={open}
              animationType="fade"
              onRequestClose={() => setOpen(false)}
            >
              <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                <Pressable
                  style={[styles.sheet, isGlass && styles.sheetGlass]}
                  onPress={() => undefined}
                >
                  <Text style={[styles.sheetTitle, isGlass && styles.sheetTitleGlass]}>
                    {placeholder}
                  </Text>
                  {options.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.option,
                          isGlass && styles.optionGlass,
                          selected && (isGlass ? styles.optionSelectedGlass : styles.optionSelected),
                        ]}
                        onPress={() => {
                          onChange(opt.value as PathValue<T, FieldPath<T>>);
                          setOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isGlass && styles.optionTextGlass,
                            selected &&
                              (isGlass
                                ? styles.optionTextSelectedGlass
                                : styles.optionTextSelected),
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={isGlass ? colors.authFocus : colors.primary}
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
  labelGlass: { color: colors.authMuted },
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
  fieldGlass: {
    backgroundColor: colors.authInput,
    borderColor: colors.authBorder,
  },
  fieldError: { borderColor: colors.danger },
  fieldErrorGlass: { borderColor: 'rgba(239, 68, 68, 0.7)' },
  fieldText: { ...typography.body, color: colors.text, flex: 1 },
  fieldTextGlass: { color: colors.textInverse },
  error: { ...typography.caption, color: colors.danger },
  errorGlass: { color: '#FECACA' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 0, 26, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetGlass: {
    backgroundColor: colors.authBg2,
    borderTopWidth: 1,
    borderColor: colors.authBorder,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sheetTitleGlass: { color: colors.textInverse },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionGlass: {},
  optionSelected: { backgroundColor: colors.surfaceAlt },
  optionSelectedGlass: { backgroundColor: 'rgba(162, 82, 255, 0.22)' },
  optionText: { ...typography.body, color: colors.text },
  optionTextGlass: { color: colors.authMuted },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  optionTextSelectedGlass: { color: colors.textInverse, fontWeight: '700' },
});
