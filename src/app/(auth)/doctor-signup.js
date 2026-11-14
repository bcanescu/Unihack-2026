// Formularul de acces pentru medici (pornit de la FormularAdministrator.js al colegului).
// Medicul îl completează, iar contul rămâne „în verificare” până îl aprobă un administrator.
import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth } from '../../context/AuthContext';
import { authErrorMessage } from '../../lib/authErrors';
import { pdfUploadEnabled } from '../../lib/firebase';
import { SPECIALTIES, HOSPITALS, PARAFA_RE } from '../../constants/medical';
import TopBar from '../../components/TopBar';
import TextField from '../../components/TextField';
import SelectField from '../../components/SelectField';
import PrimaryButton from '../../components/PrimaryButton';
import Checkbox from '../../components/Checkbox';
import { colors, spacing, radius, font } from '../../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f) {
  const e = {};
  if (f.lastName.trim().length < 2) e.lastName = 'Scrie numele de familie.';
  if (f.firstName.trim().length < 2) e.firstName = 'Scrie prenumele.';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Adresa de email nu este validă.';
  if (f.password.length < 8 || !/\d/.test(f.password) || !/[a-zA-Z]/.test(f.password))
    e.password = 'Minimum 8 caractere, cu litere și cifre.';
  if (f.confirm !== f.password) e.confirm = 'Parolele nu coincid.';
  if (!f.specialty) e.specialty = 'Alege specializarea.';
  if (!f.hospital) e.hospital = 'Alege spitalul.';
  if (!PARAFA_RE.test(f.parafa.trim().toUpperCase())) e.parafa = 'Codul de parafă are 5–8 litere și cifre.';
  if (!f.consent) e.consent = 'Este nevoie de acordul tău.';
  return e;
}

const Err = ({ text }) => (text ? <Text style={styles.err}>{text}</Text> : null);

export default function DoctorSignup() {
  const { signUpDoctor } = useAuth();
  const [f, setF] = useState({
    lastName: '',
    firstName: '',
    email: '',
    password: '',
    confirm: '',
    specialty: '',
    hospital: '',
    parafa: '',
    consent: false,
  });
  const [pdf, setPdf] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key) => (value) => {
    setF((cur) => ({ ...cur, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) return setErrors((e) => ({ ...e, pdf: 'Fișierul depășește 10 MB.' }));
    setPdf(asset);
  }

  async function submit() {
    setSubmitError('');
    const found = validate(f);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await signUpDoctor(f, pdf);
      setSent(true);
    } catch (e) {
      setSubmitError(authErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.center]}>
          <View style={styles.bigIcon}>
            <Ionicons name="hourglass-outline" size={34} color={colors.warning} />
          </View>
          <Text style={styles.title}>Cerere trimisă</Text>
          <Text style={styles.text}>
            Un administrator Medly verifică codul de parafă. După aprobare te poți autentifica cu emailul{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>{f.email.trim().toLowerCase()}</Text>.
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: spacing.md }}>
            <PrimaryButton title="Înapoi la autentificare" onPress={() => router.replace('/login')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar title="Înscriere medic" fallback="/register" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>
            Completează formularul pentru a obține acces pe platforma Medly. Contul devine activ după ce un
            administrator verifică codul de parafă.
          </Text>

          <View>
            <TextField label="Nume" icon="person-outline" placeholder="Numele de familie" value={f.lastName} onChangeText={set('lastName')} autoCapitalize="words" error={!!errors.lastName} />
            <Err text={errors.lastName} />
          </View>
          <View>
            <TextField label="Prenume" icon="person-outline" placeholder="Prenumele" value={f.firstName} onChangeText={set('firstName')} autoCapitalize="words" error={!!errors.firstName} />
            <Err text={errors.firstName} />
          </View>
          <View>
            <TextField label="Email" icon="mail-outline" placeholder="nume@spital.ro" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={!!errors.email} />
            <Err text={errors.email} />
          </View>

          <View>
            <SelectField label="Specializare" icon="medkit-outline" placeholder="Alege specializarea" value={f.specialty} options={SPECIALTIES} onChange={set('specialty')} error={!!errors.specialty} />
            <Err text={errors.specialty} />
          </View>
          <View>
            <SelectField label="Spitalul de proveniență" icon="business-outline" placeholder="Alege spitalul" value={f.hospital} options={HOSPITALS} onChange={set('hospital')} error={!!errors.hospital} />
            <Err text={errors.hospital} />
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
            <Err text={errors.parafa} />
          </View>

          {pdfUploadEnabled && (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Aviz de liberă practică (PDF, opțional)</Text>
              {pdf ? (
                <View style={styles.pdfRow}>
                  <Ionicons name="document-attach" size={22} color={colors.primary} />
                  <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{pdf.name}</Text>
                  <Pressable onPress={() => setPdf(null)} hitSlop={8} accessibilityLabel="Elimină PDF">
                    <Ionicons name="close-circle" size={22} color="#94A3B8" />
                  </Pressable>
                </View>
              ) : (
                <PrimaryButton title="Încarcă PDF" variant="outline" onPress={pickPdf} />
              )}
              <Err text={errors.pdf} />
            </View>
          )}

          <View>
            <TextField label="Parolă" icon="lock-closed-outline" placeholder="Minimum 8 caractere" value={f.password} onChangeText={set('password')} secure autoComplete="new-password" error={!!errors.password} />
            <Err text={errors.password} />
          </View>
          <View>
            <TextField label="Confirmă parola" icon="lock-closed-outline" placeholder="Scrie parola din nou" value={f.confirm} onChangeText={set('confirm')} secure autoComplete="new-password" error={!!errors.confirm} />
            <Err text={errors.confirm} />
          </View>

          <View>
            <Checkbox checked={f.consent} onChange={set('consent')} error={!!errors.consent}>
              Confirm că datele sunt corecte și sunt de acord ca un administrator Medly să verifice codul de parafă.
            </Checkbox>
            <Err text={errors.consent} />
          </View>

          {!!submitError && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          <PrimaryButton title="Trimite cererea" onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  bigIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.warningSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.textMuted, textAlign: 'center', lineHeight: 23 },
  description: { fontSize: font.body - 1, color: colors.textMuted, lineHeight: 22 },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  err: { color: colors.error, fontSize: font.small, marginTop: 6 },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.errorSoft },
  errorText: { flex: 1, color: colors.error, fontSize: font.small + 1 },
});
