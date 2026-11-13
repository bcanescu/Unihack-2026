import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { subscribeDoctorLinks, getPatientSummary, ageFrom, toDate } from '../../../lib/careLinks';
import PrimaryButton from '../../../components/PrimaryButton';
import { Avatar, SectionTitle, Card, StatusBadge, EmptyState } from '../../../components/ui';
import { colors, spacing, font } from '../../../constants/theme';

const byNewest = (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0);

export default function DoctorPatients() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [summaries, setSummaries] = useState({}); // patientUid → { name, birthDate }

  // Lista se actualizează în timp real: când pacientul acceptă, apare imediat aici.
  useEffect(() => subscribeDoctorLinks(user.uid, setLinks), [user.uid]);

  const active = useMemo(() => links.filter((l) => l.status === 'active').sort(byNewest), [links]);
  const pending = useMemo(() => links.filter((l) => l.status === 'pending').sort(byNewest), [links]);
  const closed = useMemo(
    () => links.filter((l) => l.status === 'declined' || l.status === 'revoked').sort(byNewest),
    [links]
  );

  // Datele pacientului se citesc DOAR pentru legăturile active (regulile Firestore impun asta).
  const activeKey = active.map((l) => l.patientUid).join(',');
  useEffect(() => {
    let cancelled = false;
    Promise.all(active.map((l) => getPatientSummary(l.patientUid).catch(() => null))).then((list) => {
      if (cancelled) return;
      const map = {};
      active.forEach((l, i) => (map[l.patientUid] = list[i]));
      setSummaries(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>Pacienți</Text>
          <Text style={styles.subtitle}>Pacienții care ți-au dat acces la dosarul lor.</Text>
        </View>

        <PrimaryButton title="+  Adaugă pacient" onPress={() => router.push('/add-patient')} />

        {pending.length > 0 && (
          <View style={styles.section}>
            <SectionTitle count={pending.length}>Cereri în așteptare</SectionTitle>
            {pending.map((l) => (
              <Card key={l.id} tone="warning" style={styles.row}>
                <View style={styles.pendingIcon}>
                  <Ionicons name="hourglass-outline" size={22} color={colors.warning} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.name}>{l.label}</Text>
                  <Text style={styles.meta}>Pacientul trebuie să accepte cererea din aplicație.</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <SectionTitle count={active.length}>Pacienții mei</SectionTitle>
          {active.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Niciun pacient încă"
              text="Adaugă un pacient după CNP. Îi vei vedea datele după ce acceptă cererea."
            />
          ) : (
            active.map((l) => {
              const p = summaries[l.patientUid];
              const age = ageFrom(p?.birthDate);
              return (
                <Pressable
                  key={l.id}
                  onPress={() => router.push(`/patient/${l.patientUid}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Deschide fișa pacientului ${p?.name ?? ''}`}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Card style={styles.row}>
                    <Avatar name={p?.name ?? '…'} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.name}>{p?.name ?? 'Se încarcă…'}</Text>
                      <Text style={styles.meta}>
                        {age != null ? `${age} ani` : ''}
                        {age != null ? ' · ' : ''}
                        {l.label}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>

        {closed.length > 0 && (
          <View style={styles.section}>
            <SectionTitle count={closed.length}>Fără acces</SectionTitle>
            {closed.map((l) => (
              <Card key={l.id} style={styles.row}>
                <Avatar name="?" muted />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.name, { color: colors.textMuted }]}>{l.label}</Text>
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
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted },
  section: { gap: spacing.sm + 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  pendingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: font.body + 1, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted, lineHeight: 19 },
});
