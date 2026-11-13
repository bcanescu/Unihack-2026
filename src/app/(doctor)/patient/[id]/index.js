import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../../context/AuthContext';
import { getPatientSummary, getLink, ageFrom, requestAccess } from '../../../../lib/careLinks';
import {
  subscribeMedications,
  subscribeIntakes,
  stopMedication,
  dateKey,
  isActiveOn,
  intakeId,
} from '../../../../lib/medications';
import TopBar from '../../../../components/TopBar';
import { LabListItem } from '../../../../components/LabViews';
import { subscribeLabs } from '../../../../lib/labs';
import PrimaryButton from '../../../../components/PrimaryButton';
import { Avatar, SectionTitle, Card, EmptyState } from '../../../../components/ui';
import { colors, spacing, radius, font } from '../../../../constants/theme';

const formatDay = (key) =>
  key ? new Date(`${key}T12:00:00`).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : '';

function MedicationCard({ med, takenToday, canStop, onStop }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const total = med.times.length;
  const allTaken = takenToday >= total;

  async function stop() {
    setBusy(true);
    try {
      await onStop();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Card>
      <View style={styles.medHead}>
        <View style={styles.pill}>
          <Ionicons name="medical" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.medName}>{med.name}</Text>
          <Text style={styles.meta}>{med.dose}</Text>
        </View>
      </View>

      <View style={styles.timesRow}>
        {med.times.map((t) => (
          <View key={t} style={styles.timeChip}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={styles.timeText}>{t}</Text>
          </View>
        ))}
      </View>

      {!!med.instructions && <Text style={styles.instructions}>{med.instructions}</Text>}

      <View style={styles.footerRow}>
        <Text style={styles.meta}>
          {med.endDate ? `${formatDay(med.startDate)} – ${formatDay(med.endDate)}` : `din ${formatDay(med.startDate)} · continuu`}
        </Text>
        <View style={[styles.adherence, { backgroundColor: allTaken ? colors.successSoft : colors.warningSoft }]}>
          <Text style={[styles.adherenceText, { color: allTaken ? colors.success : colors.warning }]}>
            Azi: {takenToday}/{total} luate
          </Text>
        </View>
      </View>

      {canStop &&
        (confirming ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>Oprești tratamentul cu {med.name} de azi?</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Anulează" variant="outline" onPress={() => setConfirming(false)} disabled={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Oprește" onPress={stop} loading={busy} />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            style={styles.stopBtn}
            accessibilityRole="button"
            accessibilityLabel={`Oprește tratamentul cu ${med.name}`}
          >
            <Text style={styles.stopText}>Oprește tratamentul</Text>
          </Pressable>
        ))}
    </Card>
  );
}

export default function PatientFile() {
  const { id: patientUid, name: nameFromAppt } = useLocalSearchParams();
  const { user } = useAuth();
  const [link, setLink] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [patient, setPatient] = useState(null);
  const [label, setLabel] = useState('');
  const [meds, setMeds] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [labs, setLabs] = useState([]);
  const [noAccess, setNoAccess] = useState(false);
  const today = dateKey();

  useEffect(() => {
    getLink(user.uid, patientUid)
      .then((l) => {
        setLink(l);
        if (l?.status !== 'active') return setNoAccess(true);
        setLabel(l.label);
        return getPatientSummary(patientUid).then(setPatient);
      })
      .catch(() => setNoAccess(true));
  }, [user.uid, patientUid]);

  // Tratamentul și dozele bifate azi – în timp real.
  useEffect(() => subscribeMedications(patientUid, setMeds, () => setNoAccess(true)), [patientUid]);
  useEffect(() => subscribeIntakes(patientUid, today, setIntakes), [patientUid, today]);
  useEffect(() => subscribeLabs(patientUid, setLabs), [patientUid]);

  const current = useMemo(
    () => meds.filter((m) => isActiveOn(m, today) || (m.active !== false && m.startDate > today)),
    [meds, today]
  );
  const past = useMemo(() => meds.filter((m) => !current.includes(m)), [meds, current]);
  const takenIds = useMemo(() => new Set(intakes.map((i) => i.id)), [intakes]);
  const takenCount = (med) => med.times.filter((t) => takenIds.has(intakeId(today, med.id, t))).length;

  if (noAccess) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="Fișa pacientului" />
        <View style={styles.container}>
          <EmptyState
            icon="lock-closed-outline"
            title={nameFromAppt ? `Nu ai acces la dosarul lui ${nameFromAppt}` : 'Nu ai acces la acest pacient'}
            text={
              link?.status === 'pending'
                ? 'Cererea de acces a fost trimisă. Vei vedea dosarul după ce pacientul o acceptă.'
                : 'Pacientul are o programare la tine, dar dosarul medical rămâne privat până acceptă o cerere de acces.'
            }
          />
          {link?.status !== 'pending' && (
            <PrimaryButton
              title="Trimite cerere de acces la dosar"
              loading={requesting}
              onPress={async () => {
                setRequesting(true);
                try {
                  const label = nameFromAppt ? `${nameFromAppt} · din programare` : 'Pacient din programare';
                  await requestAccess(user, patientUid, label, link);
                  setLink({ ...(link ?? {}), status: 'pending' });
                } finally {
                  setRequesting(false);
                }
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const age = ageFrom(patient?.birthDate);

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="Fișa pacientului" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card tone="accent" style={styles.patientHead}>
          <Avatar name={patient?.name ?? '…'} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.patientName}>{patient?.name ?? 'Se încarcă…'}</Text>
            <Text style={styles.meta}>
              {[age != null && `${age} ani`, patient?.sex === 'F' ? 'F' : patient?.sex === 'M' ? 'M' : null, label]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <SectionTitle count={current.length}>Tratament curent</SectionTitle>
          </View>
          <PrimaryButton
            title="+  Adaugă medicament"
            onPress={() => router.push({ pathname: '/add-medication', params: { patientId: patientUid } })}
          />
          {current.length === 0 ? (
            <EmptyState
              icon="medkit-outline"
              title="Niciun tratament activ"
              text="Medicamentele adăugate aici apar imediat în aplicația pacientului, cu remindere pe ore."
            />
          ) : (
            current.map((m) => (
              <MedicationCard
                key={m.id}
                med={m}
                takenToday={takenCount(m)}
                canStop={m.addedBy === user.uid}
                onStop={() => stopMedication(patientUid, m.id)}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle count={labs.length}>Analize</SectionTitle>
          <PrimaryButton
            title="+  Adaugă analize"
            variant="outline"
            onPress={() => router.push({ pathname: '/add-lab', params: { patientId: patientUid } })}
          />
          {labs.map((l) => (
            <LabListItem key={l.id} lab={l} onPress={() => router.push(`/patient/${patientUid}/lab/${l.id}`)} />
          ))}
        </View>

        {past.length > 0 && (
          <View style={styles.section}>
            <SectionTitle count={past.length}>Tratamente încheiate</SectionTitle>
            {past.map((m) => (
              <Card key={m.id} style={styles.pastRow}>
                <Ionicons name="checkmark-done-outline" size={20} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medName, { color: colors.textMuted, fontSize: font.body }]}>{m.name}</Text>
                  <Text style={styles.meta}>
                    {m.dose} · până la {formatDay(m.endDate)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          Planul de tratament din Medly este informativ și nu înlocuiește rețeta electronică emisă în sistemul CNAS.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  patientHead: { flexDirection: 'row', alignItems: 'center' },
  patientName: { fontSize: font.body + 3, fontWeight: '800', color: colors.text },
  section: { gap: spacing.sm + 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: font.small, color: colors.textMuted },
  medHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medName: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  timeText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  instructions: { fontSize: font.small + 1, color: colors.text, lineHeight: 20 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  adherence: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  adherenceText: { fontSize: font.small - 1, fontWeight: '700' },
  stopBtn: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  stopText: { color: colors.error, fontWeight: '700', fontSize: font.small + 1 },
  confirm: { gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  confirmText: { fontSize: font.small + 1, color: colors.text },
  pastRow: { flexDirection: 'row', alignItems: 'center' },
  disclaimer: { fontSize: font.small - 1, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
