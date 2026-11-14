// Medic → fișa pacientului → Raport aderență: când a luat pacientul fiecare doză.
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getPatientSummary } from '../../../../lib/careLinks';
import { subscribeMedications, subscribeIntakesSince, addDays, dateKey } from '../../../../lib/medications';
import { computeAdherence, adherencePercent, percentColor, fmtTime, LATE_MINUTES } from '../../../../lib/adherence';
import TopBar from '../../../../components/TopBar';
import Chip from '../../../../components/Chip';
import { Card, EmptyState, SectionTitle } from '../../../../components/ui';
import { colors, spacing, radius, font } from '../../../../constants/theme';

const PERIODS = [7, 14, 30];
const CELL = 20;

const STATUS = {
  ontime: { color: colors.success, label: 'Luat la timp' },
  late: { color: '#F59E0B', label: `Luat cu întârziere (> ${LATE_MINUTES} min)` },
  missed: { color: colors.error, label: 'Ratat' },
  pending: { color: '#CBD5E1', label: 'Urmează' },
};

const dayNum = (key) => Number(key.slice(8, 10));
const weekdayLetter = (key) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('ro-RO', { weekday: 'short' }).slice(0, 2);
const dayLabel = (key, today) =>
  key === today
    ? 'Azi'
    : key === addDays(today, -1)
      ? 'Ieri'
      : new Date(`${key}T12:00:00`).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });

function delayText(min) {
  if (min == null) return '';
  if (min <= 0) return 'la timp';
  if (min < 60) return `+${min} min`;
  return `+${Math.floor(min / 60)} h ${min % 60} min`;
}

function MedGrid({ entry, days, today }) {
  const times = entry.med.times;
  // Căsuțe mai mari pe 7 zile, mai mici pe 14/30 (la 30 se derulează orizontal).
  const size = days.length <= 7 ? 30 : days.length <= 14 ? 17 : 18;
  const p = adherencePercent(entry.stats);
  return (
    <Card>
      <View style={styles.medHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.medName}>{entry.med.name}</Text>
          <Text style={styles.meta}>
            {entry.med.dose} · {times.join(', ')}
            {entry.med.active === false ? ' · oprit' : ''}
          </Text>
        </View>
        <Text style={[styles.medPercent, { color: percentColor(p, colors) }]}>{p == null ? '—' : `${p}%`}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* antet: zilele */}
          <View style={styles.gridRow}>
            <View style={styles.timeCol} />
            {days.map((d) => (
              <View key={d} style={[styles.dayHead, { width: size }]}>
                <Text style={[styles.dayHeadText, d === today && styles.todayText]}>{weekdayLetter(d)}</Text>
                <Text style={[styles.dayHeadNum, d === today && styles.todayText]}>{dayNum(d)}</Text>
              </View>
            ))}
          </View>
          {/* câte un rând pe oră de administrare */}
          {times.map((t) => (
            <View key={t} style={styles.gridRow}>
              <View style={styles.timeCol}>
                <Text style={styles.timeText}>{t}</Text>
              </View>
              {days.map((d) => {
                const cell = (entry.cells[d] || []).find((c) => c.time === t);
                const st = cell ? STATUS[cell.status] : null;
                return (
                  <View
                    key={d}
                    style={[styles.cell, { width: size, height: size }, st ? { backgroundColor: st.color } : styles.cellNone]}
                    accessible
                    accessibilityLabel={`${dayLabel(d, today)} ${t}: ${
                      cell ? `${st.label}${cell.takenAt ? ` la ${fmtTime(cell.takenAt)}` : ''}` : 'neprogramat'
                    }`}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.meta}>
        {entry.stats.ontime} la timp · {entry.stats.late} întârziate · {entry.stats.missed} ratate
      </Text>
    </Card>
  );
}

export default function AdherenceReport() {
  const { id: patientUid } = useLocalSearchParams();
  const [period, setPeriod] = useState(7);
  const [patient, setPatient] = useState(null);
  const [meds, setMeds] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [noAccess, setNoAccess] = useState(false);
  const today = dateKey();
  const from = addDays(today, -(PERIODS[PERIODS.length - 1] - 1));

  useEffect(() => {
    getPatientSummary(patientUid).then(setPatient).catch(() => setNoAccess(true));
  }, [patientUid]);
  useEffect(() => subscribeMedications(patientUid, setMeds, () => setNoAccess(true)), [patientUid]);
  useEffect(() => subscribeIntakesSince(patientUid, from, setIntakes, () => setNoAccess(true)), [patientUid, from]);

  const report = useMemo(() => computeAdherence(meds, intakes, period), [meds, intakes, period]);
  const p = adherencePercent(report.total);
  const due = report.total.ontime + report.total.late + report.total.missed;

  if (noAccess) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="Raport aderență" />
        <View style={styles.container}>
          <EmptyState icon="lock-closed-outline" title="Nu ai acces la acest pacient" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="Raport aderență" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.patient}>{patient?.name ?? 'Se încarcă…'}</Text>

        <View style={styles.chips}>
          {PERIODS.map((d) => (
            <Chip key={d} label={`Ultimele ${d} zile`} selected={period === d} onPress={() => setPeriod(d)} />
          ))}
        </View>

        {report.perMed.length === 0 ? (
          <EmptyState icon="medkit-outline" title="Niciun tratament în această perioadă" text="Adaugă un medicament din fișa pacientului." />
        ) : (
          <>
            <Card tone="accent" style={styles.summary}>
              <View style={{ alignItems: 'center', minWidth: 90 }}>
                <Text style={[styles.bigPercent, { color: percentColor(p, colors) }]}>{p == null ? '—' : `${p}%`}</Text>
                <Text style={styles.meta}>aderență</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.summaryLine}>
                  <Text style={{ fontWeight: '800' }}>{report.total.ontime + report.total.late}</Text> din {due} doze luate
                </Text>
                <Text style={[styles.summaryLine, { color: '#B45309' }]}>{report.total.late} cu întârziere</Text>
                <Text style={[styles.summaryLine, { color: colors.error }]}>{report.total.missed} ratate</Text>
              </View>
            </Card>

            <View style={styles.legend}>
              {Object.entries(STATUS).map(([k, s]) => (
                <View key={k} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
                  <Text style={styles.legendText}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <SectionTitle>Pe medicamente</SectionTitle>
              {report.perMed.map((e) => (
                <MedGrid key={e.med.id} entry={e} days={report.days} today={today} />
              ))}
            </View>

            <View style={styles.section}>
              <SectionTitle>Jurnal doze</SectionTitle>
              {report.log.length === 0 ? (
                <Text style={styles.meta}>Nicio doză scadentă încă în această perioadă.</Text>
              ) : (
                <Card style={{ gap: 0, padding: 0 }}>
                  {report.log.slice(0, 40).map((l, i) => {
                    const s = STATUS[l.status];
                    return (
                      <View key={`${l.day}-${l.time}-${l.med.id}`} style={[styles.logRow, i > 0 && styles.logBorder]}>
                        <Ionicons
                          name={l.status === 'missed' ? 'close-circle' : l.status === 'late' ? 'time' : 'checkmark-circle'}
                          size={20}
                          color={s.color}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.logMain}>
                            {l.med.name} <Text style={styles.meta}>· programat {l.time}</Text>
                          </Text>
                          <Text style={[styles.logSub, { color: l.status === 'ontime' ? colors.textMuted : s.color }]}>
                            {l.status === 'missed'
                              ? 'Ratat – nebifat'
                              : `Luat la ${fmtTime(l.takenAt)} (${delayText(l.delayMin)})`}
                          </Text>
                        </View>
                        <Text style={styles.logDay}>{dayLabel(l.day, today)}</Text>
                      </View>
                    );
                  })}
                </Card>
              )}
            </View>

            <Text style={styles.note}>
              Raportul se bazează pe dozele bifate de pacient în aplicație („Ce iau azi”). O doză nebifată poate însemna și
              că pacientul a uitat să o bifeze.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md + 2, maxWidth: 640, width: '100%', alignSelf: 'center' },
  patient: { fontSize: font.body + 3, fontWeight: '800', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bigPercent: { fontSize: 40, fontWeight: '900' },
  summaryLine: { fontSize: font.body - 1, color: colors.text },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: font.small - 1, color: colors.textMuted },
  section: { gap: spacing.sm + 4 },
  medHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  medName: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  medPercent: { fontSize: font.title - 4, fontWeight: '900' },
  meta: { fontSize: font.small - 1, color: colors.textMuted },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  timeCol: { width: 40 },
  timeText: { fontSize: font.small - 2, fontWeight: '700', color: colors.textMuted },
  dayHead: { width: CELL, alignItems: 'center' },
  dayHeadText: { fontSize: 9, color: '#94A3B8', textTransform: 'capitalize' },
  dayHeadNum: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  todayText: { color: colors.primary },
  cell: { width: CELL, height: CELL, borderRadius: 5 },
  cellNone: { borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingHorizontal: spacing.md, paddingVertical: 10 },
  logBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  logMain: { fontSize: font.small + 1, fontWeight: '700', color: colors.text },
  logSub: { fontSize: font.small - 1, marginTop: 1 },
  logDay: { fontSize: font.small - 1, color: colors.textMuted, fontWeight: '600' },
  note: { fontSize: font.small - 2, color: colors.textMuted, lineHeight: 17, textAlign: 'center' },
});
