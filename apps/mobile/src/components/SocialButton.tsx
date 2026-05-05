import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/lib/theme';

export type SocialProvider = 'google' | 'apple' | 'facebook';

interface Props {
  provider: SocialProvider;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const META: Record<
  SocialProvider,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; bg: string; fg: string; border?: string }
> = {
  google: {
    label: 'Continuar com Google',
    icon: 'logo-google',
    iconColor: '#DB4437',
    bg: '#FFFFFF',
    fg: '#0F172A',
    border: colors.border,
  },
  apple: {
    label: 'Continuar com Apple',
    icon: 'logo-apple',
    iconColor: '#FFFFFF',
    bg: '#000000',
    fg: '#FFFFFF',
  },
  facebook: {
    label: 'Continuar com Facebook',
    icon: 'logo-facebook',
    iconColor: '#FFFFFF',
    bg: '#1877F2',
    fg: '#FFFFFF',
  },
};

export function SocialButton({ provider, onPress, loading, disabled }: Props) {
  const meta = META[provider];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: meta.bg,
          borderColor: meta.border ?? meta.bg,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator color={meta.fg} />
        ) : (
          <Ionicons name={meta.icon} size={18} color={meta.iconColor} />
        )}
      </View>
      <Text style={[styles.label, { color: meta.fg }]}>{meta.label}</Text>
      <View style={styles.iconWrap} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconWrap: { width: 22, alignItems: 'center' },
  label: { ...typography.body, fontWeight: '600', flex: 1, textAlign: 'center' },
});
