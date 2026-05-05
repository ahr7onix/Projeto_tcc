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

type Variant = 'default' | 'pill';

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
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const containerStyle = [
          styles.container,
          variant === 'pill' ? styles.containerPill : styles.containerDefault,
          error ? styles.containerError : null,
        ];
        return (
          <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View style={containerStyle}>
              {icon ? (
                <Ionicons
                  name={icon}
                  size={18}
                  color={colors.textMuted}
                  style={styles.icon}
                />
              ) : null}
              <TextInput
                {...inputProps}
                style={[styles.input, inputProps.style]}
                value={(value as string | undefined) ?? ''}
                onChangeText={(text) =>
                  onChange(transform ? transform(text) : text)
                }
                onBlur={onBlur}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            {error?.message ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.text },
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
  containerError: { borderColor: colors.danger },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  error: { ...typography.caption, color: colors.danger },
});
