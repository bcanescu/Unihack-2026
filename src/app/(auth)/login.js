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
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Logo from '../../components/Logo';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { isFirebaseConfigured } from '../../lib/firebase';
import { authErrorMessage } from '../../lib/authErrors';
import { colors, spacing, radius, font } from '../../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setInfo('');
    if (!EMAIL_RE.test(email.trim())) return setError('Introdu o adresă de email validă.');
    if (!password) return setError('Introdu parola.');

    setLoading(true);
    try {
      await signIn(email, password);
      // Succes: _layout.js redirecționează automat după rol.
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      return setError('Scrie emailul mai sus, apoi apasă din nou „Ai uitat parola?”.');
    }
    try {
      await resetPassword(email);
    } finally {
      // Același mesaj indiferent dacă există contul (nu dezvăluim cine are cont).
      setInfo('Dacă există un cont cu acest email, vei primi un link de resetare.');
    }
  }

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo />
            <Text style={styles.title}>Bine ai revenit!</Text>
            <Text style={styles.subtitle}>
              Autentifică-te pentru a-ți vedea tratamentul, analizele și medicii.
            </Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Email"
              icon="mail-outline"
              placeholder="nume@exemplu.ro"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              error={!!error}
            />
            <TextField
              label="Parolă"
              icon="lock-closed-outline"
              placeholder="Parola ta"
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              error={!!error}
            />

            <Pressable onPress={handleForgotPassword} hitSlop={10} style={styles.forgot} accessibilityRole="link">
              <Text style={styles.link}>Ai uitat parola?</Text>
            </Pressable>

            {!!error && (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {!!info && <Text style={styles.infoText}>{info}</Text>}

            <PrimaryButton title="Autentificare" onPress={handleLogin} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Nu ai cont? </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={10} accessibilityRole="link">
                <Text style={styles.link}>Creează cont</Text>
              </Pressable>
            </Link>
          </View>

          {!isFirebaseConfigured && (
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Mod demo · fără Firebase</Text>
              <Text style={styles.demoText}>Alege un cont de test:</Text>
              <View style={styles.demoRow}>
                {DEMO_ACCOUNTS.map((a) => (
                  <Pressable key={a.email} onPress={() => fillDemo(a)} style={styles.demoChip} accessibilityRole="button">
                    <Ionicons
                      name={a.role === 'doctor' ? 'medkit-outline' : 'person-outline'}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.demoChipText}>{a.role === 'doctor' ? 'Medic' : 'Pacient'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: font.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  form: { gap: spacing.md },
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.xs },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.errorSoft,
  },
  errorText: { flex: 1, color: colors.error, fontSize: font.small + 1 },
  infoText: { color: colors.primary, fontSize: font.small + 1, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: colors.textMuted, fontSize: font.body },
  demoBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    gap: spacing.sm,
  },
  demoTitle: { fontWeight: '700', color: colors.primary, fontSize: font.small },
  demoText: { color: colors.textMuted, fontSize: font.small },
  demoRow: { flexDirection: 'row', gap: spacing.sm },
  demoChip: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoChipText: { color: colors.primary, fontWeight: '700', fontSize: font.small + 1 },
});
