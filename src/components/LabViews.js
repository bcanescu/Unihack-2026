import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { flagOf, rangeText, outOfRangeCount, formatLabDate, getLabFileUrl } from '../lib/labs';
import { Card } from './ui';
import PrimaryButton from './PrimaryButton';
import { colors, spacing, radius, font } from '../constants/theme';

const FLAG_STYLE = {
  high: { color: colors.error, icon: 'arrow-up', label: 'crescut' },
  low: { color: '#1D4ED8', icon: 'arrow-down', label: 'scăzut' },
  normal: { color: colors.success, icon: null, label: 'normal' },
};

export function OutOfRangeBadge({ lab }) {
  const n = outOfRangeCount(lab);
  const ok = n === 0;
  return (
    <View style={[styles.badge, { backgroundColor: ok ? colors.successSoft : colors.warningSoft }]}>
      <Ionicons name={ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={14} color={ok ? colors.success : colors.warning} />
      <Text style={[styles.badgeText, { color: ok ? colors.success : colors.warning }]}>
        {ok ? 'În limite normale' : `${n} ${n === 1 ? 'valoare' : 'valori'} în afara limitelor`}
      </Text>
    </View>
  );
}

/** Rând în lista de analize. */
export function LabListItem({ lab, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Analize: ${lab.title}`} style={({ pressed }) => [pressed && { opacity: 0.75 }]}>
      <Card style={styles.listRow}>
        <View style={styles.icon}>
          <Ionicons name="flask" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.listTitle}>{lab.title}</Text>
          <Text style={styles.meta}>
            {formatLabDate(lab.date)}
            {lab.labName ? ` · ${lab.labName}` : ''}
            {lab.file ? ' · PDF' : ''}
          </Text>
          {lab.results.length > 0 && <OutOfRangeBadge lab={lab} />}
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

/** Detaliul unui buletin – folosit și de medic, și de pacient. */
export function LabDetail({ lab, onExplain }) {
  const [opening, setOpening] = useState(false);
  const [fileError, setFileError] = useState('');

  async function openPdf() {
    setOpening(true);
    setFileError('');
    try {
      const url = await getLabFileUrl(lab);
      if (url) await Linking.openURL(url);
    } catch {
      setFileError('Nu am putut deschide fișierul.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: 6 }}>
        <Text style={styles.title}>{lab.title}</Text>
        <Text style={styles.meta}>
          {formatLabDate(lab.date)}
          {lab.labName ? ` · ${lab.labName}` : ''}
        </Text>
        <Text style={styles.meta}>Adăugat de {lab.addedByName}</Text>
        {lab.results.length > 0 && <OutOfRangeBadge lab={lab} />}
      </View>

      {lab.results.length > 0 && (
        <Card style={{ gap: 0, padding: 0 }}>
          <View style={[styles.tr, styles.th]}>
            <Text style={[styles.thText, { flex: 1.4 }]}>Analiză</Text>
            <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>Rezultat</Text>
            <Text style={[styles.thText, { flex: 0.9, textAlign: 'right' }]}>Referință</Text>
          </View>
          {lab.results.map((r, i) => {
            const f = flagOf(r);
            const fs = FLAG_STYLE[f] ?? FLAG_STYLE.normal;
            const out = f === 'high' || f === 'low';
            return (
              <View
                key={`${r.name}-${i}`}
                style={[styles.tr, i % 2 === 1 && { backgroundColor: '#F8FAFC' }]}
                accessible
                accessibilityLabel={`${r.name}: ${r.value ?? 'fără valoare'} ${r.unit}, ${f ? fs.label : ''}, referință ${rangeText(r)}`}
              >
                <Text style={[styles.td, { flex: 1.4, fontWeight: '600' }]}>{r.name}</Text>
                <View style={[styles.valueCell, { flex: 1 }]}>
                  {out && <Ionicons name={fs.icon} size={14} color={fs.color} />}
                  <Text style={[styles.value, { color: out ? fs.color : colors.text }]}>
                    {r.value ?? '—'} <Text style={styles.unit}>{r.unit}</Text>
                  </Text>
                </View>
                <Text style={[styles.td, styles.ref, { flex: 0.9 }]}>{rangeText(r)}</Text>
              </View>
            );
          })}
        </Card>
      )}

      {!!lab.note && (
        <Card tone="accent">
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            <Text style={styles.noteTitle}>Nota medicului</Text>
          </View>
          <Text style={styles.noteText}>{lab.note}</Text>
        </Card>
      )}

      {lab.file && (
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton title="Deschide buletinul (PDF)" variant="outline" onPress={openPdf} loading={opening} />
          {!!fileError && <Text style={{ color: colors.error, fontSize: font.small }}>{fileError}</Text>}
        </View>
      )}

      {onExplain && lab.results.length > 0 && (
        <PrimaryButton title="✨  Explică-mi analizele" onPress={onExplain} />
      )}

      <Text style={styles.disclaimer}>
        Valorile de referință sunt orientative și pot diferi între laboratoare. Interpretarea rezultatelor se face
        împreună cu medicul.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  listRow: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm },
  th: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  thText: { fontSize: font.small - 1, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  td: { fontSize: font.small + 1, color: colors.text },
  valueCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  value: { fontSize: font.body, fontWeight: '800', textAlign: 'right' },
  unit: { fontSize: font.small - 2, fontWeight: '500', color: colors.textMuted },
  ref: { textAlign: 'right', color: colors.textMuted, fontSize: font.small },
  noteTitle: { fontWeight: '800', color: colors.primary, fontSize: font.body },
  noteText: { fontSize: font.body, color: colors.text, lineHeight: 23 },
  disclaimer: { fontSize: font.small - 1, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
