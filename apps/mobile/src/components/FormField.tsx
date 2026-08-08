import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Variant = 'default' | 'pill' | 'glass';

interface Props<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: Variant;
  transform?: (value: string) => string;
}

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  icon,
  variant = 'default',
  transform,
  ...inputProps
}: Props<T>) {
  const isGlass = variant === 'glass';
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const containerStyle = [
          styles.container,
          variant === 'pill'
            ? styles.containerPill
            : isGlass
              ? styles.containerGlass
              : styles.containerDefault,
          error ? (isGlass ? styles.containerErrorGlass : styles.containerError) : null,
        ];
        return (
          <View style={styles.wrapper}>
            {label ? (
              <Text style={[styles.label, isGlass && styles.labelGlass]}>{label}</Text>
            ) : null}
            <View style={containerStyle}>
              {icon ? (
                <Ionicons
                  name={icon}
                  size={18}
                  color={isGlass ? colors.authMuted : colors.textMuted}
                  style={styles.icon}
                />
              ) : null}
              <TextInput
                {...inputProps}
                style={[styles.input, isGlass && styles.inputGlass, inputProps.style]}
                value={(value as string | undefined) ?? ''}
                onChangeText={(text) =>
                  onChange(transform ? transform(text) : text)
                }
                onBlur={onBlur}
                placeholderTextColor={
                  isGlass ? 'rgba(255,255,255,0.45)' : colors.textMuted
                }
              />
            </View>
            {error?.message ? (
              <Text style={[styles.error, isGlass && styles.errorGlass]}>
                {error.message}
              </Text>
            ) : null}
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  containerDefault: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  containerPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerGlass: {
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: radius.md,
    backgroundColor: colors.authInput,
  },
  containerError: { borderColor: colors.danger },
  containerErrorGlass: { borderColor: 'rgba(239, 68, 68, 0.7)' },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  inputGlass: { color: colors.textInverse },
  error: { ...typography.caption, color: colors.danger },
  errorGlass: { color: '#FECACA' },
});
