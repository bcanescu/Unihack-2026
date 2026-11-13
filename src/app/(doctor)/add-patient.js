import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { validateCnp } from '../../lib/cnp';
import { findPatientByCnp, getLink, sendRequest, cnpLabel } from '../../lib/careLinks';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import { Card } from '../../components/ui';
import { colors, spacing, radius, font } from '../../constants/theme';

/**
 * Fluxul: CNP → căutare → confirmare → cerere trimisă.
 * Medicul NU vede numele sau alte date ale pacientului înainte ca acesta să accepte.
 */
export default function AddPatient() {
  const { user } = useAuth();
  const [cnp, setCnp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // step: 'input' | 'found' | 'not-found' | 'already-active' | 'already-pending' | 'sent'
  const [step, setStep] = useState('input');
  const [match, setMatch] = useState(null); // { patientUid, existing }

  function goBack() {
    router.canGoBack() ? router.back() : router.replace('/');
  }

  function reset() {
    setCnp('');
    setMatch(null);
    setError('');
    setStep('input');
  }

  async function handleSearch() {
    setError('');
    const check = validateCnp(cnp);
    if (!check.valid) return setError(check.error);

    setBusy(true);
    try {
      const patientUid = await findPatientByCnp(cnp);
      if (!patientUid) return setStep('not-found');
      const existing = await getLink(user.uid, patientUid);
      setMatch({ patientUid, existing });
      if (existing?.status === 'active') setStep('already-active');
      else if (existing?.status === 'pending') setStep('already-pending');
      else setStep('found');
    } catch {
      setError('Căutarea nu a reușit. Verifică conexiunea și încearcă din nou.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    setBusy(true);
    setError('');
    try {
      await sendRequest(user, match.patientUid, cnp, match.existing);
      setStep('sent');
    } catch {
      setError('Cererea nu a putut fi trimisă. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Înapoi">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.topTitle}>Adaugă pacient</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {step === 'sent' ? (
            <View style={styles.center}>
              <View style={[styles.bigIcon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="paper-plane" size={34} color={colors.success} />
              </View>
              <Text style={styles.title}>Cerere trimisă</Text>
              <Text style={styles.text}>
                Pacientul ({cnpLabel(cnp)}) a primit cererea în aplicație. Îi vei vedea datele în lista ta imediat
                ce o acceptă.
              </Text>
              <View style={{ gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.md }}>
                <PrimaryButton title="Înapoi la pacienți" onPress={goBack} />
                <PrimaryButton title="Adaugă alt pacient" variant="outline" onPress={reset} />
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.text}>
                Introdu CNP-ul pacientului. Pacientul va primi o cerere de acces și va decide dacă o acceptă.
              </Text>

              <View>
                <TextField
                  label="CNP pacient"
                  icon="card-outline"
                  placeholder="13 cifre"
                  value={cnp}
                  onChangeText={(v) => {
                    setCnp(v.replace(/\D/g, '').slice(0, 13));
                    if (step !== 'input') setStep('input');
                    setError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={13}
                  autoComplete="off"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  error={!!error}
                  editable={!busy}
                />
                {!!error && <Text style={styles.fieldError}>{error}</Text>}
              </View>

              {step === 'input' && (
                <PrimaryButton title="Caută pacient" onPress={handleSearch} loading={busy} disabled={cnp.length !== 13} />
              )}

              {step === 'not-found' && (
                <Card tone="warning">
                  <View style={styles.cardHead}>
                    <Ionicons name="person-add-outline" size={22} color={colors.warning} />
                    <Text style={[styles.cardTitle, { color: colors.warning }]}>Nu există încă un cont</Text>
                  </View>
                  <Text style={styles.cardText}>
                    Nu am găsit niciun cont Medly pentru {cnpLabel(cnp)}. Roagă pacientul să-și instaleze aplicația
                    și să-și creeze cont, apoi încearcă din nou.
                  </Text>
                  <PrimaryButton title="Încearcă alt CNP" variant="outline" onPress={reset} />
                </Card>
              )}

              {step === 'found' && (
                <Card tone="accent">
                  <View style={styles.cardHead}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    <Text style={styles.cardTitle}>Cont găsit · {cnpLabel(cnp)}</Text>
                  </View>
                  <Text style={styles.cardText}>
                    {match?.existing
                      ? 'Acest pacient a refuzat sau a retras anterior accesul. Poți trimite o nouă cerere.'
                      : 'Datele pacientului vor deveni vizibile doar după ce acceptă cererea.'}
                  </Text>
                  <PrimaryButton title="Trimite cererea de acces" onPress={handleSend} loading={busy} />
                </Card>
              )}

              {step === 'already-pending' && (
                <Card tone="warning">
                  <View style={styles.cardHead}>
                    <Ionicons name="time-outline" size={22} color={colors.warning} />
                    <Text style={[styles.cardTitle, { color: colors.warning }]}>Cerere deja trimisă</Text>
                  </View>
                  <Text style={styles.cardText}>Așteaptă ca pacientul să răspundă din aplicație.</Text>
                  <PrimaryButton title="Înapoi la pacienți" variant="outline" onPress={goBack} />
                </Card>
              )}

              {step === 'already-active' && (
                <Card tone="accent">
                  <View style={styles.cardHead}>
                    <Ionicons name="people" size={22} color={colors.primary} />
                    <Text style={styles.cardTitle}>Pacientul este deja în lista ta</Text>
                  </View>
                  <PrimaryButton title="Înapoi la pacienți" variant="outline" onPress={goBack} />
                </Card>
              )}

              <View style={styles.privacy}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                <Text style={styles.privacyText}>
                  CNP-ul nu este salvat. Căutarea se face după o amprentă criptografică (hash).
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: font.body + 2, fontWeight: '800', color: colors.text },
  container: { padding: spacing.lg, gap: spacing.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  text: { fontSize: font.body, color: colors.textMuted, lineHeight: 23 },
  fieldError: { color: colors.error, fontSize: font.small, marginTop: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: font.body + 1, fontWeight: '800', color: colors.primary },
  cardText: { fontSize: font.small + 1, color: colors.text, lineHeight: 21 },
  privacy: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingHorizontal: spacing.xs },
  privacyText: { flex: 1, fontSize: font.small - 1, color: colors.textMuted, lineHeight: 18 },
  center: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  bigIcon: { width: 80, height: 80, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
});
