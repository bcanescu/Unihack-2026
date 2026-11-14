// Admin → Adaugă medic direct (contul e creat deja aprobat; medicul își setează parola din email).
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { createDoctorDirect } from '../../lib/admin';
import { authErrorMessage } from '../../lib/authErrors';
import { isFirebaseConfigured } from '../../lib/firebase';
import { SPECIALTIES, HOSPITALS, PARAFA_RE } from '../../constants/medical';
import TopBar from '../../components/TopBar';
import TextField from '../../components/TextField';
import SelectField from '../../components/SelectField';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, spacing, radius, font } from '../../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { lastName: '', firstName: '', email: '', specialty: '', hospital: '', parafa: '' };

export default function AddDoctor() {
  const { user } = useAuth();
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const set = (key) => (value) => {
    setF((cur) => ({ ...cur, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit() {
    const e = {};
    if (f.lastName.trim().length < 2) e.lastName = 'Scrie numele.';
    if (f.firstName.trim().length < 2) e.firstName = 'Scrie prenumele.';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Email invalid.';
    if (!f.specialty) e.specialty = 'Alege specializarea.';
    if (!f.hospital) e.hospital = 'Alege spitalul.';
    if (!PARAFA_RE.test(f.parafa.trim().toUpperCase())) e.parafa = 'Codul de parafă are 5–8 litere și cifre.';
    setErrors(e);
    setSubmitError('');
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await createDoctorDirect(user, f);
      setDone({ ...res, email: f.email.trim().toLowerCase(), name: `Dr. ${f.firstName.trim()} ${f.lastName.trim()}` });
    } catch (err) {
      setSubmitError(
        err?.code?.startsWith?.('auth/')
          ? authErrorMessage(err)
          : 'Contul nu a putut fi creat. Verifică regulile Firestore (rolul de admin) și conexiunea.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.center]}>
          <View style={styles.bigIcon}>
            <Ionicons name="checkmark" size={38} color={colors.success} />
          </View>
          <Text style={styles.title}>Medic adăugat</Text>
          <Text style={styles.text}>
            {done.name} apare acum în căutarea pacienților.{'\n'}
            {isFirebaseConfigured
              ? `Pe ${done.email} a fost trimis un email pentru setarea parolei.`
              : `Mod demo: se poate autentifica cu ${done.email} / ${done.demoPassword}.`}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md }}>
            <PrimaryButton title="Înapoi la medici" onPress={() => router.back()} />
            <PrimaryButton
              title="Adaugă alt medic"
              variant="outline"
              onPress={() => {
                setF(EMPTY);
                setDone(null);
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar title="Adaugă medic" fallback="/doctors" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>
            Contul se creează direct aprobat. Medicul primește pe email un link pentru a-și seta parola – nu trebuie să
            cunoști parola lui.
          </Text>

          <View>
            <TextField label="Nume" icon="person-outline" placeholder="Numele de familie" value={f.lastName} onChangeText={set('lastName')} autoCapitalize="words" error={!!errors.lastName} />
            {!!errors.lastName && <Text style={styles.err}>{errors.lastName}</Text>}
          </View>
          <View>
            <TextField label="Prenume" icon="person-outline" placeholder="Prenumele" value={f.firstName} onChangeText={set('firstName')} autoCapitalize="words" error={!!errors.firstName} />
            {!!errors.firstName && <Text style={styles.err}>{errors.firstName}</Text>}
          </View>
          <View>
            <TextField label="Email" icon="mail-outline" placeholder="nume@spital.ro" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={!!errors.email} />
            {!!errors.email && <Text style={styles.err}>{errors.email}</Text>}
          </View>
          <View>
            <SelectField label="Specializare" icon="medkit-outline" placeholder="Alege specializarea" value={f.specialty} options={SPECIALTIES} onChange={set('specialty')} error={!!errors.specialty} />
            {!!errors.specialty && <Text style={styles.err}>{errors.specialty}</Text>}
          </View>
          <View>
            <SelectField label="Spital" icon="business-outline" placeholder="Alege spitalul" value={f.hospital} options={HOSPITALS} onChange={set('hospital')} error={!!errors.hospital} />
            {!!errors.hospital && <Text style={styles.err}>{errors.hospital}</Text>}
          </View>
          <View>
            <TextField
              label="Cod unic de parafă"
              icon="create-outline"
              placeholder="ex. A12345"
              value={f.parafa}
              onChangeText={(v) => set('parafa')(v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))}
              autoCapitalize="characters"
              error={!!errors.parafa}
            />
            {!!errors.parafa && <Text style={styles.err}>{errors.parafa}</Text>}
          </View>

          {!!submitError && <Text style={styles.err}>{submitError}</Text>}
          <PrimaryButton title="Creează contul de medic" onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  bigIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.textMuted, textAlign: 'center', lineHeight: 23 },
  description: { fontSize: font.body - 1, color: colors.textMuted, lineHeight: 22, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  err: { color: colors.error, fontSize: font.small, marginTop: 6 },
});
