// Componente mici refolosite pe ecranele de medic și pacient.
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, font } from '../constants/theme';

export function initials(name = '') {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function Avatar({ name, muted = false }) {
  return (
    <View style={[styles.avatar, muted && { backgroundColor: colors.surface }]}>
      <Text style={[styles.avatarText, muted && { color: colors.textMuted }]}>{initials(name) || '?'}</Text>
    </View>
  );
}

/** Antet cu salut + buton de deconectare. */
export function GreetingHeader({ greeting, subtitle, onSignOut }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting}>{greeting}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Pressable
        onPress={onSignOut}
        hitSlop={8}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="Deconectare"
      >
        <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function SectionTitle({ children, count }) {
  return (
    <Text style={styles.section}>
      {children}
      {count != null ? <Text style={styles.count}>  {count}</Text> : null}
    </Text>
  );
}

export function Card({ children, style, tone }) {
  const toneStyle =
    tone === 'warning'
      ? { backgroundColor: colors.warningSoft, borderColor: '#FDE68A' }
      : tone === 'accent'
        ? { backgroundColor: colors.accentSoft, borderColor: '#B5EDE6' }
        : null;
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

const BADGES = {
  pending: { label: 'În așteptare', bg: colors.warningSoft, fg: colors.warning, icon: 'time-outline' },
  active: { label: 'Acces activ', bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle-outline' },
  declined: { label: 'Refuzat', bg: colors.surface, fg: colors.textMuted, icon: 'close-circle-outline' },
  revoked: { label: 'Acces retras', bg: colors.surface, fg: colors.textMuted, icon: 'remove-circle-outline' },
};

export function StatusBadge({ status }) {
  const b = BADGES[status] ?? BADGES.pending;
  return (
    <View style={[styles.badge, { backgroundColor: b.bg }]}>
      <Ionicons name={b.icon} size={14} color={b.fg} />
      <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={colors.accent} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!text && <Text style={styles.emptyText}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: font.body },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greeting: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  section: { fontSize: font.body + 2, fontWeight: '800', color: colors.text },
  count: { color: colors.textMuted, fontWeight: '600' },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: font.small - 1, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: font.small + 1, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
