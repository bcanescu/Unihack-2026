import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { subscribeDoctorAppointments, cancelAppointment, formatDayLong, SCHEDULE_TEXT } from '../../../lib/appointments';
import { subscribeDoctorLinks } from '../../../lib/careLinks';
import { dateKey } from '../../../lib/medications';
import AppointmentCard from '../../../components/AppointmentCard';
import PrimaryButton from '../../../components/PrimaryButton';
import { GreetingHeader, SectionTitle, EmptyState, Card } from '../../../components/ui';
import { colors, spacing, radius, font } from '../../../constants/theme';

export default function DoctorToday() {
  const { user, signOut } = useAuth();
  const [appts, setAppts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const today = dateKey();

  useEffect(() => subscribeDoctorAppointments(user.uid, setAppts), [user.uid]);
  useEffect(
    () => subscribeDoctorLinks(user.uid, (links) => setPendingCount(links.filter((l) => l.status === 'pending').length)),
    [user.uid]
  );

  const booked = useMemo(() => appts.filter((a) => a.status === 'booked'), [appts]);
  const todays = booked.filter((a) => a.date === today);
  // Pe ecranul „Azi” arătăm următoarele 3 zile cu programări; restul în tabul „Programări”.
  const futureDays = [...new Set(booked.filter((a) => a.date > today).map((a) => a.date))].slice(0, 3);
  const upcoming = booked.filter((a) => futureDays.includes(a.date));
  const moreCount = booked.filter((a) => a.date > today).length - upcoming.length;

  // Grupăm programările viitoare pe zile.
  const byDay = upcoming.reduce((acc, a) => {
    (acc[a.date] = acc[a.date] || []).push(a);
    return acc;
  }, {});

  const openPatient = (a) => router.push({ pathname: `/patient/${a.patientUid}`, params: { name: a.patientName } });
  const cancel = (a) => cancelAppointment(a, 'doctor');
  const firstName = user.name.replace(/^Dr\.?\s*/i, '').split(/\s+/)[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <GreetingHeader greeting={`Bună ziua, Dr. ${firstName}!`} subtitle={user.specialty || 'Medic'} onSignOut={signOut} />

        <View style={styles.summary}>
          <Ionicons name="calendar" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>
              {todays.length === 0
                ? 'Nicio programare astăzi'
                : `Astăzi aveți ${todays.length} ${todays.length === 1 ? 'programare' : 'programări'}`}
            </Text>
            <Text style={styles.summarySub}>
              {formatDayLong(today)} · {SCHEDULE_TEXT}
            </Text>
          </View>
        </View>

        {pendingCount > 0 && (
          <Card tone="warning" style={styles.pendingRow}>
            <Ionicons name="hourglass-outline" size={20} color={colors.warning} />
            <Text style={styles.pendingText}>
              {pendingCount} {pendingCount === 1 ? 'cerere de acces așteaptă' : 'cereri de acces așteaptă'} răspunsul
              pacientului
            </Text>
          </Card>
        )}

        <View style={styles.section}>
          <SectionTitle count={todays.length}>Azi</SectionTitle>
          {todays.length === 0 ? (
            <EmptyState icon="cafe-outline" title="Program liber" text="Pacienții se pot programa din aplicație în orele tale de program." />
          ) : (
            todays.map((a) => (
              <AppointmentCard key={a.id} appt={a} perspective="doctor" showDate={false} onPress={() => openPatient(a)} onCancel={cancel} />
            ))
          )}
        </View>

        {upcoming.length > 0 && (
          <View style={styles.section}>
            <SectionTitle>Următoarele zile</SectionTitle>
            {Object.entries(byDay).map(([day, list]) => (
              <View key={day} style={{ gap: spacing.sm }}>
                <Text style={styles.dayLabel}>{formatDayLong(day)}</Text>
                {list.map((a) => (
                  <AppointmentCard key={a.id} appt={a} perspective="doctor" showDate={false} onPress={() => openPatient(a)} onCancel={cancel} />
                ))}
              </View>
            ))}
            <PrimaryButton
              title={moreCount > 0 ? `Vezi toate programările (+${moreCount})` : 'Vezi calendarul programărilor'}
              variant="outline"
              onPress={() => router.push('/schedule')}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  summaryTitle: { color: '#fff', fontSize: font.body + 2, fontWeight: '800' },
  summarySub: { color: '#CCFBF1', fontSize: font.small, marginTop: 2 },
  pendingRow: { flexDirection: 'row', alignItems: 'center' },
  pendingText: { flex: 1, color: colors.warning, fontWeight: '600', fontSize: font.small + 1 },
  section: { gap: spacing.sm + 4 },
  dayLabel: { fontSize: font.small + 1, fontWeight: '700', color: colors.textMuted },
});
