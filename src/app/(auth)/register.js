import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import Checkbox from '../../components/Checkbox';
import { useAuth } from '../../context/AuthContext';
import { validateCnp } from '../../lib/cnp';
import { authErrorMessage } from '../../lib/authErrors';
import { colors, spacing, radius, font } from '../../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email, cnp, password, confirm, consent }) {
  const errors = {};
  if (name.trim().length < 3) errors.name = 'Scrie numele complet.';
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Adresa de email nu este validă.';
  const cnpCheck = validateCnp(cnp);
  if (!cnpCheck.valid) errors.cnp = cnpCheck.error;
  if (password.length < 8) errors.password = 'Parola trebuie să aibă cel puțin 8 caractere.';
  else if (!/\d/.test(password) || !/[a-zA-Z]/.test(password))
    errors.password = 'Parola trebuie să conțină litere și cifre.';
  if (confirm !== password) errors.confirm = 'Parolele nu coincid.';
  if (!consent) errors.consent = 'Este nevoie de acordul tău pentru a crea contul.';
  return errors;
}

function FieldError({ text }) {
  if (!text) return null;
  return <Text style={styles.fieldError}>{text}</Text>;
}

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', cnp: '', password: '', confirm: '', consent: false });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDoctorInfo, setShowDoctorInfo] = useState(false);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function handleSubmit() {
    setSubmitError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await signUp(form);
      // Succes: _layout.js redirecționează automat către ecranele de pacient.
    } catch (e) {
      setSubmitError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Înapoi"
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Creează cont de pacient</Text>
            <Text style={styles.subtitle}>
              Vei putea vedea tratamentul și analizele primite de la medicii tăi.
            </Text>
          </View>

          <View style={styles.form}>
            <View>
              <TextField
                label="Nume complet"
                icon="person-outline"
                placeholder="ex. Ion Popescu"
                value={form.name}
                onChangeText={set('name')}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                error={!!errors.name}
              />
              <FieldError text={errors.name} />
            </View>

            <View>
              <TextField
                label="Email"
                icon="mail-outline"
                placeholder="nume@exemplu.ro"
                value={form.email}
                onChangeText={set('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={!!errors.email}
              />
              <FieldError text={errors.email} />
            </View>

            <View>
              <TextField
                label="CNP"
                icon="card-outline"
                placeholder="13 cifre"
                value={form.cnp}
                onChangeText={(v) => set('cnp')(v.replace(/\D/g, '').slice(0, 13))}
                keyboardType="number-pad"
                maxLength={13}
                autoComplete="off"
                error={!!errors.cnp}
              />
              {errors.cnp ? (
                <FieldError text={errors.cnp} />
              ) : (
                <Text style={styles.hint}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} /> Nu salvăm CNP-ul
                  în clar. Îl folosește doar medicul tău ca să-ți trimită o cerere de acces, pe care o aprobi tu.
                </Text>
              )}
            </View>

            <View>
              <TextField
                label="Parolă"
                icon="lock-closed-outline"
                placeholder="Minimum 8 caractere"
                value={form.password}
                onChangeText={set('password')}
                secure
                autoComplete="new-password"
                textContentType="newPassword"
                error={!!errors.password}
              />
              <FieldError text={errors.password} />
            </View>

            <View>
              <TextField
                label="Confirmă parola"
                icon="lock-closed-outline"
                placeholder="Scrie parola din nou"
                value={form.confirm}
                onChangeText={set('confirm')}
                secure
                autoComplete="new-password"
                textContentType="newPassword"
                error={!!errors.confirm}
              />
              <FieldError text={errors.confirm} />
            </View>

            <View>
              <Checkbox checked={form.consent} onChange={set('consent')} error={!!errors.consent}>
                Sunt de acord cu <Text style={styles.inlineLink}>Termenii</Text> și cu prelucrarea datelor
                mele medicale conform <Text style={styles.inlineLink}>Politicii de confidențialitate</Text>.
                Pot retrage acordul oricând.
              </Checkbox>
              <FieldError text={errors.consent} />
            </View>

            {!!submitError && (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            )}

            <PrimaryButton title="Creează cont" onPress={handleSubmit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ai deja cont? </Text>
            <Pressable onPress={() => router.replace('/login')} hitSlop={10} accessibilityRole="link">
              <Text style={styles.link}>Autentificare</Text>
            </Pressable>
          </View>

          <View style={styles.doctorBox}>
            <Pressable
              onPress={() => setShowDoctorInfo((s) => !s)}
              style={styles.doctorHeader}
              accessibilityRole="button"
              accessibilityState={{ expanded: showDoctorInfo }}
            >
              <Ionicons name="medkit-outline" size={20} color={colors.primary} />
              <Text style={styles.doctorTitle}>Sunteți medic?</Text>
              <Ionicons name={showDoctorInfo ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
            </Pressable>
            {showDoctorInfo && (
              <Text style={styles.doctorText}>
                Conturile de medic se activează doar după verificarea codului de parafă și a avizului de
                liberă practică. Scrieți-ne la medici@medly.ro cu aceste date și vă creăm contul.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  container: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: spacing.sm },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, lineHeight: 22 },
  form: { gap: spacing.md },
  fieldError: { color: colors.error, fontSize: font.small, marginTop: 6 },
  hint: { color: colors.textMuted, fontSize: font.small, marginTop: 6, lineHeight: 19 },
  inlineLink: { color: colors.primary, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.errorSoft,
  },
  errorText: { flex: 1, color: colors.error, fontSize: font.small + 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: colors.textMuted, fontSize: font.body },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  doctorBox: { borderRadius: radius.lg, backgroundColor: colors.accentSoft, padding: spacing.md, gap: spacing.sm },
  doctorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  doctorTitle: { flex: 1, fontWeight: '700', color: colors.primary, fontSize: font.body },
  doctorText: { color: colors.textMuted, fontSize: font.small + 1, lineHeight: 21 },
});
