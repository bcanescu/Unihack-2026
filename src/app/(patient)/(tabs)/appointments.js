import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import { subscribePatientAppointments, cancelAppointment, confirmAttendance, isPastSlot, PREP } from '../../../lib/appointments';
import { cancelAppointmentReminders } from '../../../lib/reminders';
import { subscribeMyReviews, isAppointmentFinished } from '../../../lib/doctorProfile';
import { Stars } from '../../../components/Stars';
import AppointmentCard from '../../../components/AppointmentCard';
import PrimaryButton from '../../../components/PrimaryButton';
import { SectionTitle, EmptyState } from '../../../components/ui';
import { colors, spacing, font } from '../../../constants/theme';

export default function PatientAppointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [myReviews, setMyReviews] = useState([]);

  useEffect(() => subscribePatientAppointments(user.uid, setAppts), [user.uid]);
  useEffect(() => subscribeMyReviews(user.uid, setMyReviews), [user.uid]);
  const reviewByAppt = useMemo(() => Object.fromEntries(myReviews.map((r) => [r.id, r])), [myReviews]);

  // Dacă medicul a anulat o programare, oprim și reminderele de pe telefon.
  const cancelledKey = appts.filter((a) => a.status === 'cancelled').map((a) => a.id).join(',');
  useEffect(() => {
    if (!cancelledKey) return;
    cancelledKey.split(',').forEach((id) => cancelAppointmentReminders(id).catch(() => {}));
  }, [cancelledKey]);

  const cancel = async (a) => {
    await cancelAppointment(a, 'patient');
    await cancelAppointmentReminders(a.id).catch(() => {});
  };

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
              <View key={a.id} style={{ gap: 6 }}>
                <AppointmentCard appt={a} perspective="patient" onCancel={cancel} onConfirm={confirmAttendance} />
                {!!PREP[a.reason] && <Text style={styles.prep}>ℹ️ {PREP[a.reason]}</Text>}
              </View>
            ))
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.section}>
            <SectionTitle>Istoric</SectionTitle>
            {history.map((a) => {
              const review = reviewByAppt[a.id];
              const canReview = !review && isAppointmentFinished(a);
              return (
                <View key={a.id} style={{ gap: 6 }}>
                  <AppointmentCard appt={a} perspective="patient" />
                  {review ? (
                    <View style={styles.reviewed}>
                      <Text style={styles.reviewedLabel}>Recenzia ta:</Text>
                      <Stars value={review.rating} size={14} />
                    </View>
                  ) : canReview ? (
                    <PrimaryButton title="★  Lasă o recenzie" variant="outline" onPress={() => router.push(`/review/${a.id}`)} />
                  ) : null}
                  {a.status === 'booked' && (
                    <Pressable onPress={() => router.push(`/doctor/${a.doctorUid}`)} style={styles.profileLink} accessibilityRole="button">
                      <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                      <Text style={styles.profileLinkText}>Profilul medicului</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
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
  reviewed: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  reviewedLabel: { fontSize: font.small, color: colors.textMuted, fontWeight: '600' },
  profileLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, minHeight: 28 },
  profileLinkText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  prep: { fontSize: font.small, color: colors.warning, lineHeight: 19, paddingHorizontal: spacing.sm },
});
