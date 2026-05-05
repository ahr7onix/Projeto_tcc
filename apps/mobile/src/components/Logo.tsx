import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/lib/theme';

interface Props {
  size?: number;
}

export function Logo({ size = 56 }: Props) {
  const iconSize = Math.round(size * 0.55);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius.lg }]}>
      <Ionicons name="pulse" size={iconSize} color={colors.textInverse} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.35)',
    elevation: 6,
  },
});
