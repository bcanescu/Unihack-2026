import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { subscribePatientLinks } from '../../lib/careLinks';
import { getDoctors, uniqueSorted } from '../../lib/doctors';
import {
  subscribeBusy,
  bookAppointment,
  slotsForDay,
  nextDays,
  isWorkDay,
  isPastSlot,
  formatDayShort,
  formatDayLong,
  REASONS,
  SCHEDULE_TEXT,
} from '../../lib/appointments';
import TopBar from '../../components/TopBar';
import PrimaryButton from '../../components/PrimaryButton';
import Chip from '../../components/Chip';
import { Avatar, Card } from '../../components/ui';
import { colors, spacing, radius, font } from '../../constants/theme';

const ALL = 'Toate';

function DoctorOption({ doctor, selected, onPress, linked }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={doctor.doctorName}>
      <Card style={[styles.doctorRow, selected && styles.doctorSelected]}>
        <Avatar name={doctor.doctorName} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.doctorName}>{doctor.doctorName}</Text>
          <Text style={styles.meta}>{doctor.doctorSpecialty}</Text>
          {!!doctor.hospital && (
            <Text style={styles.hospital} numberOfLines={2}>
              <Ionicons name="business-outline" size={12} color={colors.textMuted} /> {doctor.hospital}
            </Text>
          )}
          {linked && <Text style={styles.linked}>Medicul tău</Text>}
        </View>
        <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected ? colors.primary : colors.border} />
      </Card>
    </Pressable>
  );
}

export default function BookAppointment() {
  const { doctorUid: preselected } = useLocalSearchParams();
  const { user } = useAuth();

  const [directory, setDirectory] = useState(null); // null = se încarcă
  const [linkedUids, setLinkedUids] = useState(new Set());
  const [linkedDocs, setLinkedDocs] = useState([]);
  const [mode, setMode] = useState(null); // 'mine' | 'search'
  const [hospital, setHospital] = useState(ALL);
  const [specialty, setSpecialty] = useState(ALL);
  const [doctorUid, setDoctorUid] = useState(preselected ?? null);

  const days = useMemo(() => nextDays(14), []);
  const [day, setDay] = useState(() => days.find(isWorkDay));
  const [busy, setBusy] = useState(new Set());
  const [time, setTime] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    getDoctors()
      .then(setDirectory)
      .catch(() => setDirectory([]));
  }, []);

  useEffect(
    () =>
      subscribePatientLinks(user.uid, (links) => {
        const active = links.filter((l) => l.status === 'active');
        setLinkedUids(new Set(active.map((l) => l.doctorUid)));
        setLinkedDocs(active);
        setMode((m) => {
          if (m) return m;
          if (preselected) return active.some((l) => l.doctorUid === preselected) ? 'mine' : 'search';
          return active.length > 0 ? 'mine' : 'search';
        });
      }),
    [user.uid, preselected]
  );

  // Normalizăm: { doctorUid, doctorName, doctorSpecialty, hospital }
  const allDoctors = useMemo(() => {
    const map = new Map();
    (directory ?? []).forEach((d) =>
      map.set(d.uid, { doctorUid: d.uid, doctorName: d.name, doctorSpecialty: d.specialty, hospital: d.hospital })
    );
    linkedDocs.forEach((l) => {
      if (!map.has(l.doctorUid))
        map.set(l.doctorUid, { doctorUid: l.doctorUid, doctorName: l.doctorName, doctorSpecialty: l.doctorSpecialty, hospital: '' });
    });
    return map;
  }, [directory, linkedDocs]);

  const myDoctors = [...linkedUids].map((uid) => allDoctors.get(uid)).filter(Boolean);
  const listed = [...allDoctors.values()].filter((d) => (directory ?? []).some((x) => x.uid === d.doctorUid));
  const hospitals = uniqueSorted(listed.map((d) => d.hospital));
  const specialties = uniqueSorted(listed.filter((d) => hospital === ALL || d.hospital === hospital).map((d) => d.doctorSpecialty));
  const filtered = listed.filter(
    (d) => (hospital === ALL || d.hospital === hospital) && (specialty === ALL || d.doctorSpecialty === specialty)
  );

  const doctor = doctorUid ? allDoctors.get(doctorUid) : null;
  const isLinked = doctor && linkedUids.has(doctor.doctorUid);

  useEffect(() => {
    setTime(null);
    if (!doctorUid || !day) return;
    return subscribeBusy(doctorUid, day, setBusy);
  }, [doctorUid, day]);

  function chooseHospital(h) {
    setHospital(h);
    setSpecialty(ALL);
  }

  const slots = day ? slotsForDay(day) : [];
  const freeCount = slots.filter((t) => !busy.has(t) && !isPastSlot(day, t)).length;

  async function confirm() {
    setSaving(true);
    setError('');
    try {
      await bookAppointment(user, doctor, day, time, reason);
      setDone(true);
    } catch (e) {
      setError(
        e?.code === 'slot-taken'
          ? 'Ora tocmai a fost ocupată de altcineva. Alege altă oră.'
          : e?.code === 'rules-denied'
            ? 'Programarea a fost refuzată de server (permisiuni). Verifică dacă ultima versiune a firestore.rules este publicată.'
            : 'Programarea nu a putut fi salvată. Încearcă din nou.'
      );
      setTime(null);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.center]}>
          <View style={styles.bigIcon}>
            <Ionicons name="calendar" size={34} color={colors.success} />
          </View>
          <Text style={styles.title}>Programare confirmată</Text>
          <Text style={styles.text}>
            {doctor?.doctorName} · {formatDayLong(day)}, ora {time}
          </Text>
          {!!doctor?.hospital && <Text style={styles.text}>{doctor.hospital}</Text>}
          <View style={{ alignSelf: 'stretch', marginTop: spacing.md }}>
            <PrimaryButton title="Vezi programările mele" onPress={() => router.replace('/appointments')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="Programare nouă" fallback="/appointments" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* 1. Medicul */}
        <View style={styles.group}>
          <Text style={styles.label}>1. Alege medicul</Text>
          <View style={styles.segment}>
            {[
              ['mine', `Medicii mei (${myDoctors.length})`],
              ['search', 'Caută medic'],
            ].map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setMode(key)}
                style={[styles.segmentBtn, mode === key && styles.segmentOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === key }}
              >
                <Text style={[styles.segmentText, mode === key && { color: '#fff' }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {mode === 'mine' &&
            (myDoctors.length === 0 ? (
              <Text style={styles.meta}>Nu ai încă medici conectați. Folosește „Caută medic”.</Text>
            ) : (
              myDoctors.map((d) => (
                <DoctorOption key={d.doctorUid} doctor={d} linked selected={d.doctorUid === doctorUid} onPress={() => setDoctorUid(d.doctorUid)} />
              ))
            ))}

          {mode === 'search' &&
            (directory === null ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.subLabel}>Spital</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                  {[ALL, ...hospitals].map((h) => (
                    <Chip key={h} label={h} selected={hospital === h} onPress={() => chooseHospital(h)} />
                  ))}
                </ScrollView>
                <Text style={styles.subLabel}>Specializare</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                  {[ALL, ...specialties].map((s) => (
                    <Chip key={s} label={s} selected={specialty === s} onPress={() => setSpecialty(s)} />
                  ))}
                </ScrollView>
                <Text style={styles.meta}>
                  {filtered.length} {filtered.length === 1 ? 'medic' : 'medici'}
                </Text>
                {filtered.map((d) => (
                  <DoctorOption
                    key={d.doctorUid}
                    doctor={d}
                    linked={linkedUids.has(d.doctorUid)}
                    selected={d.doctorUid === doctorUid}
                    onPress={() => setDoctorUid(d.doctorUid)}
                  />
                ))}
              </>
            ))}
        </View>

        {doctor && (
          <>
            {!isLinked && (
              <View style={styles.privacy}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={styles.privacyText}>
                  {doctor.doctorName} va vedea doar numele tău și motivul programării. Dosarul medical rămâne privat
                  până accepți o cerere de acces.
                </Text>
              </View>
            )}

            {/* 2. Ziua */}
            <View style={styles.group}>
              <Text style={styles.label}>2. Ziua · <Text style={styles.metaInline}>{SCHEDULE_TEXT}</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {days.map((k) => {
                  const f = formatDayShort(k);
                  const work = isWorkDay(k);
                  const selected = k === day;
                  return (
                    <Pressable
                      key={k}
                      disabled={!work}
                      onPress={() => setDay(k)}
                      style={[styles.dayChip, selected && styles.dayChipOn, !work && { opacity: 0.35 }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: !work }}
                      accessibilityLabel={formatDayLong(k)}
                    >
                      <Text style={[styles.dayWeek, selected && { color: '#fff' }]}>{f.weekday}</Text>
                      <Text style={[styles.dayNum, selected && { color: '#fff' }]}>{f.day}</Text>
                      <Text style={[styles.dayMonth, selected && { color: '#fff' }]}>{f.month}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Ora */}
            <View style={styles.group}>
              <Text style={styles.label}>
                3. Ora · <Text style={styles.metaInline}>{freeCount} libere</Text>
              </Text>
              {slots.length === 0 ? (
                <Text style={styles.meta}>Medicul nu are program în această zi.</Text>
              ) : (
                <View style={styles.slots}>
                  {slots.map((t) => {
                    const taken = busy.has(t);
                    const past = isPastSlot(day, t);
                    const disabled = taken || past;
                    const selected = t === time;
                    return (
                      <Pressable
                        key={t}
                        disabled={disabled}
                        onPress={() => setTime(t)}
                        style={[styles.slot, selected && styles.slotOn, disabled && styles.slotOff]}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled }}
                        accessibilityLabel={`Ora ${t}${taken ? ', ocupat' : past ? ', trecut' : ''}`}
                      >
                        <Text style={[styles.slotText, selected && { color: '#fff' }, disabled && styles.slotTextOff]}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 4. Motiv */}
            <View style={styles.group}>
              <Text style={styles.label}>4. Motiv</Text>
              <View style={styles.chipsRow}>
                {REASONS.map((r) => (
                  <Chip key={r} label={r} selected={r === reason} onPress={() => setReason(r)} />
                ))}
              </View>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <PrimaryButton
              title={time ? `Fă programarea · ${formatDayShort(day).day} ${formatDayShort(day).month}, ${time}` : 'Alege o oră'}
              onPress={confirm}
              loading={saving}
              disabled={!time}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  bigIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
  group: { gap: spacing.sm + 2 },
  label: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  subLabel: { fontSize: font.small, fontWeight: '700', color: colors.textMuted, marginTop: spacing.xs },
  meta: { fontSize: font.small, color: colors.textMuted },
  metaInline: { fontSize: font.small, color: colors.textMuted, fontWeight: '500' },
  hospital: { fontSize: font.small - 1, color: colors.textMuted, lineHeight: 17 },
  linked: { fontSize: font.small - 2, fontWeight: '700', color: colors.success, marginTop: 2 },
  hScroll: { gap: spacing.sm, paddingRight: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4 },
  segmentBtn: { flex: 1, minHeight: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.primary },
  segmentText: { fontSize: font.small + 1, fontWeight: '700', color: colors.text },
  doctorRow: { flexDirection: 'row', alignItems: 'center' },
  doctorSelected: { borderColor: colors.primary, borderWidth: 2 },
  doctorName: { fontSize: font.body + 1, fontWeight: '700', color: colors.text },
  privacy: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  privacyText: { flex: 1, fontSize: font.small, color: colors.text, lineHeight: 19 },
  dayChip: { width: 62, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeek: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'capitalize' },
  dayNum: { fontSize: 22, fontWeight: '800', color: colors.text },
  dayMonth: { fontSize: 12, color: colors.textMuted },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '23%',
    minWidth: 72,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOn: { backgroundColor: colors.primary },
  slotOff: { borderColor: colors.surface, backgroundColor: colors.surface },
  slotText: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  slotTextOff: { color: '#94A3B8', textDecorationLine: 'line-through' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.error, fontSize: font.small + 1 },
});
