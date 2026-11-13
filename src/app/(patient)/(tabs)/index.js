import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import { subscribePatientLinks, respondToRequest, revokeAccess, toDate } from '../../../lib/careLinks';
import PrimaryButton from '../../../components/PrimaryButton';
import TodayMeds from '../../../components/TodayMeds';
import AppointmentCard from '../../../components/AppointmentCard';
import { subscribePatientAppointments, isPastSlot } from '../../../lib/appointments';
import { Avatar, GreetingHeader, SectionTitle, Card, StatusBadge, EmptyState } from '../../../components/ui';
import { colors, spacing, font } from '../../../constants/theme';

const firstName = (name = '') => name.trim().split(/\s+/)[0];
const formatDate = (v) => toDate(v)?.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) ?? '';

function RequestCard({ link }) {
  const [busy, setBusy] = useState(null); // 'accept' | 'decline'
  const [error, setError] = useState('');

  async function respond(accept) {
    setBusy(accept ? 'accept' : 'decline');
    setError('');
    try {
      await respondToRequest(link.id, accept);
    } catch {
      setError('Nu am putut salva răspunsul. Încearcă din nou.');
      setBusy(null);
    }
  }

  return (
    <Card tone="warning">
      <View style={styles.row}>
        <Avatar name={link.doctorName} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{link.doctorName}</Text>
          {!!link.doctorSpecialty && <Text style={styles.meta}>{link.doctorSpecialty}</Text>}
        </View>
      </View>
      <Text style={styles.requestText}>
        Cere acces la dosarul tău: tratament, analize și note medicale. Poți retrage accesul oricând.
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            title="Refuz"
            variant="outline"
            onPress={() => respond(false)}
            loading={busy === 'decline'}
            disabled={!!busy}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton title="Accept" onPress={() => respond(true)} loading={busy === 'accept'} disabled={!!busy} />
        </View>
      </View>
    </Card>
  );
}

function DoctorRow({ link }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function revoke() {
    setBusy(true);
    try {
      await revokeAccess(link.id);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Card>
      <View style={styles.row}>
        <Avatar name={link.doctorName} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{link.doctorName}</Text>
          <Text style={styles.meta}>
            {link.doctorSpecialty ? `${link.doctorSpecialty} · ` : ''}acces din {formatDate(link.respondedAt)}
          </Text>
        </View>
        {!confirming && (
          <Pressable
            onPress={() => router.push({ pathname: '/book', params: { doctorUid: link.doctorUid } })}
            hitSlop={8}
            style={styles.revokeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Programare la ${link.doctorName}`}
          >
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          </Pressable>
        )}
        {!confirming && (
          <Pressable
            onPress={() => setConfirming(true)}
            hitSlop={8}
            style={styles.revokeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Retrage accesul pentru ${link.doctorName}`}
          >
            <Text style={styles.revokeText}>Retrage</Text>
          </Pressable>
        )}
      </View>
      {confirming && (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            {link.doctorName} nu va mai putea vedea dosarul tău și nici adăuga informații noi. Continui?
          </Text>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Anulează" variant="outline" onPress={() => setConfirming(false)} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Retrage accesul" onPress={revoke} loading={busy} />
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

export default function PatientHome() {
  const { user, signOut } = useAuth();
  const [links, setLinks] = useState([]);
  const [appts, setAppts] = useState([]);

  useEffect(() => subscribePatientAppointments(user.uid, setAppts), [user.uid]);
  const nextAppt = appts.find((a) => a.status === 'booked' && !isPastSlot(a.date, a.time));

  // Cererile apar în timp real, imediat ce medicul le trimite.
  useEffect(() => subscribePatientLinks(user.uid, setLinks), [user.uid]);

  const pending = useMemo(() => links.filter((l) => l.status === 'pending'), [links]);
  const active = useMemo(() => links.filter((l) => l.status === 'active'), [links]);
  const history = useMemo(() => links.filter((l) => l.status === 'declined' || l.status === 'revoked'), [links]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <GreetingHeader
          greeting={`Bună ziua, ${firstName(user.name)}!`}
          subtitle="Cum te simți azi?"
          onSignOut={signOut}
        />

        {pending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.alertHead}>
              <Ionicons name="notifications" size={20} color={colors.warning} />
              <SectionTitle count={pending.length}>Cereri de acces</SectionTitle>
            </View>
            {pending.map((l) => (
              <RequestCard key={l.id} link={l} />
            ))}
          </View>
        )}

        {nextAppt && (
          <View style={styles.section}>
            <SectionTitle>Următoarea programare</SectionTitle>
            <AppointmentCard appt={nextAppt} perspective="patient" onPress={() => router.push('/appointments')} />
          </View>
        )}

        <TodayMeds patientUid={user.uid} />

        <View style={styles.section}>
          <SectionTitle count={active.length}>Medicii mei</SectionTitle>
          {active.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Niciun medic conectat"
              text="Când un medic îți trimite o cerere de acces, o vei vedea aici și vei decide tu dacă o accepți."
            />
          ) : (
            active.map((l) => <DoctorRow key={l.id} link={l} />)
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.section}>
            <SectionTitle>Istoric acces</SectionTitle>
            {history.map((l) => (
              <Card key={l.id} style={styles.row}>
                <Avatar name={l.doctorName} muted />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.name, { color: colors.textMuted }]}>{l.doctorName}</Text>
                  <StatusBadge status={l.status} />
                </View>
              </Card>
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
  section: { gap: spacing.sm + 4 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: font.body + 1, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  requestText: { fontSize: font.body, color: colors.text, lineHeight: 23 },
  error: { color: colors.error, fontSize: font.small },
  actions: { flexDirection: 'row', gap: spacing.sm },
  revokeBtn: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  revokeText: { color: colors.error, fontWeight: '700', fontSize: font.small + 1 },
  confirmBox: { gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  confirmText: { fontSize: font.small + 1, color: colors.text, lineHeight: 21 },
});
