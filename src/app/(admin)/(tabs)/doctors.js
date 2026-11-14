// Admin → Medici: directorul de medici, cu adăugare directă și dezactivare.
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { subscribeAllDoctors, setDoctorActive } from '../../../lib/admin';
import PrimaryButton from '../../../components/PrimaryButton';
import Chip from '../../../components/Chip';
import { Avatar, Card, EmptyState } from '../../../components/ui';
import { colors, spacing, radius, font } from '../../../constants/theme';

function DoctorRow({ doctor }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = doctor.verified;

  async function toggle() {
    setBusy(true);
    try {
      await setDoctorActive(doctor, !active);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Card style={!active && { opacity: 0.65 }}>
      <View style={styles.row}>
        <Avatar name={doctor.name} muted={!active} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.meta}>{doctor.specialty}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {doctor.hospital}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: active ? colors.successSoft : colors.surface }]}>
          <Text style={[styles.badgeText, { color: active ? colors.success : colors.textMuted }]}>{active ? 'Activ' : 'Dezactivat'}</Text>
        </View>
      </View>
      {confirming ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.confirmText}>
            {active
              ? `${doctor.name} nu va mai apărea în căutare și nu se va mai putea autentifica. Continui?`
              : `Reactivezi contul lui ${doctor.name}?`}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Anulează" variant="outline" onPress={() => setConfirming(false)} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton title={active ? 'Dezactivează' : 'Reactivează'} onPress={toggle} loading={busy} />
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setConfirming(true)} style={{ alignSelf: 'flex-start' }} accessibilityRole="button" accessibilityLabel={`${active ? 'Dezactivează' : 'Reactivează'} ${doctor.name}`}>
          <Text style={[styles.action, { color: active ? colors.error : colors.primary }]}>{active ? 'Dezactivează contul' : 'Reactivează contul'}</Text>
        </Pressable>
      )}
    </Card>
  );
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [filter, setFilter] = useState('active'); // 'active' | 'disabled'

  useEffect(() => subscribeAllDoctors(setDoctors), []);

  const activeCount = doctors.filter((d) => d.verified).length;
  const shown = useMemo(() => doctors.filter((d) => (filter === 'active' ? d.verified : !d.verified)), [doctors, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>Medici</Text>
          <Text style={styles.subtitle}>{activeCount} medici activi în director</Text>
        </View>

        <PrimaryButton title="+  Adaugă medic" onPress={() => router.push('/add-doctor')} />

        <View style={styles.chips}>
          <Chip label={`Activi (${activeCount})`} selected={filter === 'active'} onPress={() => setFilter('active')} />
          <Chip label={`Dezactivați (${doctors.length - activeCount})`} selected={filter === 'disabled'} onPress={() => setFilter('disabled')} />
        </View>

        {shown.length === 0 ? (
          <EmptyState icon="people-outline" title={filter === 'active' ? 'Niciun medic activ' : 'Niciun medic dezactivat'} />
        ) : (
          shown.map((d) => <DoctorRow key={d.uid} doctor={d} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md + 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted },
  chips: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: font.body + 1, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: font.small - 1, fontWeight: '700' },
  action: { fontWeight: '700', fontSize: font.small + 1 },
  confirmText: { fontSize: font.small + 1, color: colors.text, lineHeight: 20 },
});
