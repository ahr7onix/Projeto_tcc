import { useState } from 'react';
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

interface FieldInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant: Variant;
  errorMessage?: string;
  transform?: (value: string) => string;
  onChangeValue: (value: string) => void;
  onBlurField: () => void;
}

function FieldInput({
  value,
  label,
  icon,
  variant,
  errorMessage,
  transform,
  onChangeValue,
  onBlurField,
  ...inputProps
}: FieldInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!errorMessage;

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    inputProps.onFocus?.(e);
  };
  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlurField();
    inputProps.onBlur?.(e);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.container,
          variant === 'pill' ? styles.containerPill : styles.containerDefault,
          focused && !hasError ? styles.containerFocused : null,
          hasError ? styles.containerError : null,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textMuted}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          {...inputProps}
          style={[styles.input, inputProps.style]}
          value={value}
          onChangeText={(text) => onChangeValue(transform ? transform(text) : text)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
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
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <FieldInput
          {...inputProps}
          value={(value as string | undefined) ?? ''}
          label={label}
          icon={icon}
          variant={variant}
          errorMessage={error?.message}
          transform={transform}
          onChangeValue={onChange}
          onBlurField={onBlur}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSoft, fontWeight: '600' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  containerDefault: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  containerPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerFocused: {
    borderColor: colors.primary,
    boxShadow: '0 0 0 3px #E7F0F9',
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
