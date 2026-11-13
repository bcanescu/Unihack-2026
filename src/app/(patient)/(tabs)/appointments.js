import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import { subscribePatientAppointments, cancelAppointment, isPastSlot } from '../../../lib/appointments';
import AppointmentCard from '../../../components/AppointmentCard';
import PrimaryButton from '../../../components/PrimaryButton';
import { SectionTitle, EmptyState } from '../../../components/ui';
import { colors, spacing, font } from '../../../constants/theme';

export default function PatientAppointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);

  useEffect(() => subscribePatientAppointments(user.uid, setAppts), [user.uid]);

  const upcoming = useMemo(() => appts.filter((a) => a.status === 'booked' && !isPastSlot(a.date, a.time)), [appts]);
  const history = useMemo(
    () => appts.filter((a) => !upcoming.includes(a)).reverse().slice(0, 10),
    [appts, upcoming]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>Programări</Text>
          <Text style={styles.subtitle}>Consultații la medicii tăi.</Text>
        </View>

        <PrimaryButton title="+  Programare nouă" onPress={() => router.push('/book')} />

        <View style={styles.section}>
          <SectionTitle count={upcoming.length}>Următoarele</SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState icon="calendar-outline" title="Nicio programare" text="Alege un medic, o zi și o oră liberă." />
          ) : (
            upcoming.map((a) => (
              <AppointmentCard key={a.id} appt={a} perspective="patient" onCancel={(x) => cancelAppointment(x, 'patient')} />
            ))
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.section}>
            <SectionTitle>Istoric</SectionTitle>
            {history.map((a) => (
              <AppointmentCard key={a.id} appt={a} perspective="patient" />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted },
  section: { gap: spacing.sm + 4 },
});
