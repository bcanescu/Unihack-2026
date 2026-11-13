import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, font } from '../constants/theme';

export default function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = 'solid' }) {
  const isDisabled = disabled || loading;
  const outline = variant === 'outline';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.solid,
        pressed && !outline && { backgroundColor: colors.primaryPressed },
        pressed && outline && { backgroundColor: colors.accentSoft },
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, outline && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  solid: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  disabled: { opacity: 0.6 },
  text: { color: '#fff', fontSize: font.body + 1, fontWeight: '700' },
});
