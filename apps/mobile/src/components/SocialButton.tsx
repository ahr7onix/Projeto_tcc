import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/lib/theme';

export type SocialProvider = 'google' | 'apple' | 'facebook';

interface Props {
  provider: SocialProvider;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'light' | 'glass';
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

export function SocialButton({ provider, onPress, loading, disabled, tone = 'light' }: Props) {
  const meta = META[provider];
  const glass = tone === 'glass';
  const bg = glass ? 'rgba(0,0,0,0.55)' : meta.bg;
  const fg = glass ? '#FFFFFF' : meta.fg;
  const border = glass ? 'rgba(255,255,255,0.18)' : meta.border ?? meta.bg;
  const iconColor = glass && provider === 'google' ? '#FFFFFF' : meta.iconColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Ionicons name={meta.icon} size={18} color={iconColor} />
        )}
      </View>
      <Text style={[styles.label, { color: fg }]}>{meta.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconWrap: { width: 22, alignItems: 'center' },
  label: { ...typography.body, fontWeight: '600', textAlign: 'center' },
});
