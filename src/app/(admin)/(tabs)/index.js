// Admin → Cereri: medicii care s-au înscris și așteaptă verificarea parafei.
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { subscribeApplications, approveApplication, rejectApplication, getApplicationFileUrl } from '../../../lib/admin';
import PrimaryButton from '../../../components/PrimaryButton';
import Chip from '../../../components/Chip';
import { Avatar, Card, SectionTitle, EmptyState, GreetingHeader } from '../../../components/ui';
import { colors, spacing, radius, font } from '../../../constants/theme';

const REJECT_REASONS = ['Cod de parafă invalid', 'Date incomplete', 'Specializare neconfirmată', 'Altul'];

const fmt = (v) => {
  const d = v?.toDate ? v.toDate() : v ? new Date(v) : null;
  return d ? d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
};

function Field({ icon, label, value, mono }) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.mono]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function ApplicationCard({ app, admin }) {
  const [mode, setMode] = useState(null); // null | 'reject'
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  async function run(kind) {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'approve') await approveApplication(app, admin);
      else await rejectApplication(app, reason, admin);
    } catch {
      setError('Operația nu a reușit. Verifică regulile Firestore și conexiunea.');
      setBusy(null);
    }
  }

  async function openPdf() {
    const url = await getApplicationFileUrl(app).catch(() => null);
    if (url) Linking.openURL(url);
  }

  return (
    <Card>
      <View style={styles.head}>
        <Avatar name={app.name} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{app.name}</Text>
          <Text style={styles.meta}>Trimisă {fmt(app.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.fields}>
        <Field icon="create-outline" label="Parafă" value={app.parafa} mono />
        <Field icon="medkit-outline" label="Specializare" value={app.specialty} />
        <Field icon="business-outline" label="Spital" value={app.hospital} />
        <Field icon="mail-outline" label="Email" value={app.email} />
      </View>

      {app.file && (
        <Pressable onPress={openPdf} style={styles.pdfLink} accessibilityRole="link">
          <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText}>Deschide avizul (PDF)</Text>
        </Pressable>
      )}

      <View style={styles.tip}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={styles.tipText}>Verifică parafa și numele în Registrul Colegiului Medicilor înainte de aprobare.</Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {mode === 'reject' ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Motivul respingerii</Text>
          <View style={styles.chips}>
            {REJECT_REASONS.map((r) => (
              <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Înapoi" variant="outline" onPress={() => setMode(null)} disabled={!!busy} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Confirmă respingerea" onPress={() => run('reject')} loading={busy === 'reject'} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Respinge" variant="outline" onPress={() => setMode('reject')} disabled={!!busy} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Aprobă" onPress={() => run('approve')} loading={busy === 'approve'} disabled={!!busy} />
          </View>
        </View>
      )}
    </Card>
  );
}

export default function AdminRequests() {
  const { user, signOut } = useAuth();
  const [apps, setApps] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => subscribeApplications(setApps), []);

  const pending = useMemo(() => apps.filter((a) => a.status === 'pending'), [apps]);
  const history = useMemo(() => apps.filter((a) => a.status !== 'pending'), [apps]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <GreetingHeader greeting="Administrare" subtitle={user.name} onSignOut={signOut} />

        <View style={styles.section}>
          <SectionTitle count={pending.length}>Cereri de înscriere</SectionTitle>
          {pending.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" title="Nicio cerere în așteptare" text="Medicii care completează formularul de înscriere apar aici." />
          ) : (
            pending.map((a) => <ApplicationCard key={a.uid} app={a} admin={user} />)
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.section}>
            <Pressable onPress={() => setShowHistory((s) => !s)} style={styles.historyHead} accessibilityRole="button" accessibilityState={{ expanded: showHistory }}>
              <SectionTitle count={history.length}>Istoric</SectionTitle>
              <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
            </Pressable>
            {showHistory &&
              history.map((a) => (
                <Card key={a.uid} style={styles.historyRow}>
                  <Avatar name={a.name} muted />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.historyName}>{a.name}</Text>
                    <Text style={styles.meta}>
                      {a.specialty} · {a.source === 'admin' ? 'adăugat de admin' : a.status === 'approved' ? 'aprobat' : `respins: ${a.reason}`}
                    </Text>
                  </View>
                  <Ionicons
                    name={a.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
                    size={22}
                    color={a.status === 'approved' ? colors.success : colors.error}
                  />
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
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  fields: { gap: 8, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#F8FAFC' },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldLabel: { width: 92, fontSize: font.small, color: colors.textMuted },
  fieldValue: { flex: 1, fontSize: font.small + 1, fontWeight: '600', color: colors.text },
  mono: { fontFamily: 'monospace', letterSpacing: 1, color: colors.primary },
  pdfLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: font.small + 1 },
  tip: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: font.small - 1, color: colors.textMuted, lineHeight: 18 },
  label: { fontSize: font.small, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  error: { color: colors.error, fontSize: font.small },
  historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyName: { fontSize: font.body, fontWeight: '700', color: colors.text },
});
