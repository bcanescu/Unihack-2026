import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, font } from '../constants/theme';

/**
 * Câmp „dropdown” simplu: se deschide în pagină cu lista de opțiuni.
 * Funcționează la fel pe telefon și în browser.
 */
export default function SelectField({ label, icon, placeholder, value, options, onChange, error }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.field, open && styles.fieldOpen, error && !open && styles.fieldError]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        accessibilityState={{ expanded: open }}
      >
        {icon && <Ionicons name={icon} size={20} color={colors.textMuted} />}
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>

      {open && (
        <View style={styles.list}>
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && { backgroundColor: colors.surface }]}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.optionText, selected && { color: colors.primary, fontWeight: '700' }]}>{opt}</Text>
                {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  fieldOpen: { borderColor: colors.primary, backgroundColor: colors.background },
  fieldError: { borderColor: colors.error },
  value: { flex: 1, fontSize: font.body, color: colors.text },
  placeholder: { color: '#94A3B8' },
  list: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionOn: { backgroundColor: colors.accentSoft },
  optionText: { flex: 1, fontSize: font.body - 1, color: colors.text },
});
