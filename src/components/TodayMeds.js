import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { subscribeMedications, subscribeIntakes, setIntake, dosesForDay, dateKey, isLate } from '../lib/medications';
import { Card, EmptyState, SectionTitle } from './ui';
import RemindersCard from './RemindersCard';
import { colors, spacing, radius, font } from '../constants/theme';

function DoseRow({ dose, taken, onToggle }) {
  const late = !taken && isLate(dose.time);
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: taken }}
      accessibilityLabel={`${dose.med.name}, ora ${dose.time}${taken ? ', luat' : ''}`}
      style={({ pressed }) => [pressed && { opacity: 0.75 }]}
    >
      <Card style={[styles.row, taken && styles.rowTaken, late && styles.rowLate]}>
        <Text style={[styles.time, taken && { color: colors.textMuted }]}>{dose.time}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.name, taken && styles.nameTaken]}>{dose.med.name}</Text>
          <Text style={styles.meta}>
            {dose.med.dose}
            {dose.med.instructions ? ` · ${dose.med.instructions}` : ''}
          </Text>
          {late && <Text style={styles.lateText}>Întârziat</Text>}
        </View>
        <View style={[styles.check, taken && styles.checkOn]}>
          {taken ? (
            <Ionicons name="checkmark" size={22} color="#fff" />
          ) : (
            <Text style={styles.checkLabel}>Luat</Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

/** Secțiunea „Ce iau azi” de pe ecranul pacientului. */
export default function TodayMeds({ patientUid }) {
  const [meds, setMeds] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [error, setError] = useState('');
  const today = dateKey();

  useEffect(() => subscribeMedications(patientUid, setMeds), [patientUid]);
  useEffect(() => subscribeIntakes(patientUid, today, setIntakes), [patientUid, today]);

  const doses = useMemo(() => dosesForDay(meds, today), [meds, today]);
  const taken = useMemo(() => new Set(intakes.map((i) => i.id)), [intakes]);
  const done = doses.filter((d) => taken.has(d.key)).length;

  async function toggle(dose) {
    setError('');
    try {
      await setIntake(patientUid, dose, !taken.has(dose.key), today);
    } catch {
      setError('Nu am putut salva. Verifică conexiunea.');
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <SectionTitle>Ce iau azi</SectionTitle>
        {doses.length > 0 && (
          <Text style={styles.counter}>
            {done} din {doses.length}
          </Text>
        )}
      </View>

      {doses.length > 0 && (
        <View style={styles.progressTrack} accessibilityLabel={`${done} din ${doses.length} doze luate`}>
          <View style={[styles.progressFill, { width: `${(done / doses.length) * 100}%` }]} />
        </View>
      )}

      {doses.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="Niciun medicament pentru azi"
          text="Tratamentul adăugat de medicii tăi va apărea aici, cu orele la care trebuie luat."
        />
      ) : (
        doses.map((d) => <DoseRow key={d.key} dose={d} taken={taken.has(d.key)} onToggle={() => toggle(d)} />)
      )}

      {done > 0 && done === doses.length && (
        <View style={styles.allDone}>
          <Ionicons name="happy-outline" size={20} color={colors.success} />
          <Text style={styles.allDoneText}>Bravo! Ai luat toate medicamentele de azi.</Text>
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {meds.length > 0 && <RemindersCard meds={meds} />}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm + 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: font.small + 1, fontWeight: '700', color: colors.primary },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTaken: { backgroundColor: '#F8FAFC' },
  rowLate: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  time: { width: 58, fontSize: font.body + 2, fontWeight: '800', color: colors.primary },
  name: { fontSize: font.body + 1, fontWeight: '700', color: colors.text },
  nameTaken: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { fontSize: font.small, color: colors.textMuted, lineHeight: 19 },
  lateText: { fontSize: font.small - 1, fontWeight: '700', color: colors.warning },
  check: {
    minWidth: 56,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  checkLabel: { color: colors.primary, fontWeight: '800', fontSize: font.small + 1 },
  allDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  allDoneText: { flex: 1, color: colors.success, fontWeight: '700', fontSize: font.small + 1 },
  error: { color: colors.error, fontSize: font.small },
});
