// Pacient → Adaugă analize vechi: poză (OCR cu Gemini) sau manual → verificare → salvare.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import { extractLabFromImages, ocrErrorMessage, MAX_RESULTS } from '../../lib/labOcr';
import { prepareImage } from '../../lib/imagePrep';
import { addPatientLab, parseNum, flagOf } from '../../lib/labs';
import { canonicalName } from '../../lib/labTests';
import { dateKey } from '../../lib/medications';
import TopBar from '../../components/TopBar';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, spacing, radius, font } from '../../constants/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let seq = 0;
const toRow = (r = {}) => ({
  key: `r${seq++}`,
  name: r.name ?? '',
  value: r.value != null ? String(r.value) : r.text ?? '',
  unit: r.unit ?? '',
  min: r.min != null ? String(r.min) : '',
  max: r.max != null ? String(r.max) : '',
});

function SmallInput({ label, value, onChangeText, keyboardType, width, error }) {
  return (
    <View style={{ width, gap: 2 }}>
      <Text style={styles.smallLabel}>{label}</Text>
      <TextInput
        style={[styles.smallInput, error && { borderColor: colors.error }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

export default function AddLabPhoto() {
  const { user } = useAuth();
  const [step, setStep] = useState('choose'); // choose | reading | review
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [labName, setLabName] = useState('');
  const [date, setDate] = useState(dateKey());
  const [rows, setRows] = useState([]);
  const [fromPhoto, setFromPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [pages, setPages] = useState(0);
  const [progress, setProgress] = useState('');

  /** Alege poze: camera (o pagină) sau galeria (mai multe pagini deodată). addPage = adaugă la rezultatele existente. */
  async function pick(useCamera, addPage = false) {
    setError('');
    setFormError('');
    const options = {
      mediaTypes: ['images'],
      quality: 1, // micșorăm noi, controlat (imagePrep), păstrând textul lizibil
      base64: false,
      allowsEditing: false,
      allowsMultipleSelection: !useCamera,
      selectionLimit: 6,
    };
    if (useCamera && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Permite accesul la cameră din setările telefonului.');
    }
    const res = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets?.length) return;
    const prevStep = step;
    setStep('reading');
    setProgress('Pregătesc pozele…');
    let images;
    try {
      images = await Promise.all(res.assets.map(prepareImage));
    } catch {
      setStep(prevStep === 'review' ? 'review' : 'choose');
      return (addPage ? setFormError : setError)('Nu am putut citi imaginea. Încearcă altă poză.');
    }
    try {
      const out = await extractLabFromImages(images, (i, n) =>
        setProgress(n > 1 ? `Citesc pagina ${i} din ${n}…` : 'Citesc buletinul…')
      );
      if (out.results.length === 0) {
        setStep(addPage ? 'review' : 'choose');
        const msg = 'Nu am găsit valori de analize în poză. Încearcă o poză mai clară, cu pagina întreagă în cadru.';
        return addPage ? setFormError(msg) : setError(msg);
      }
      if (addPage) {
        // Adăugăm doar analizele care nu există deja în listă.
        setRows((cur) => {
          const have = new Set(cur.map((r) => r.name.trim().toLowerCase()));
          const extra = out.results.filter((r) => !have.has(r.name.toLowerCase())).map(toRow);
          return [...cur, ...extra].slice(0, MAX_RESULTS);
        });
        if (!labName && out.labName) setLabName(out.labName);
      } else {
        setLabName(out.labName);
        setDate(out.date ?? dateKey());
        setTitle(out.labName ? `Analize ${out.labName}` : 'Analize');
        setRows(out.results.map(toRow));
      }
      setPages((n) => (addPage ? n : 0) + images.length);
      if (out.failedPages) setFormError('O pagină nu a putut fi citită. Poți încerca din nou cu „Încă o pagină”.');
      setFromPhoto(true);
      setStep('review');
    } catch (e) {
      console.warn('[ocr]', e?.code, e?.message);
      setStep(addPage ? 'review' : prevStep === 'review' ? 'review' : 'choose');
      const msg = ocrErrorMessage(e);
      addPage ? setFormError(msg) : setError(msg);
    }
  }

  function manual() {
    setRows([toRow(), toRow()]);
    setTitle('Analize');
    setFromPhoto(false);
    setStep('review');
  }

  const update = (key, field) => (v) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, [field]: v } : r)));
  const remove = (key) => setRows((cur) => cur.filter((r) => r.key !== key));

  async function save() {
    setFormError('');
    if (title.trim().length < 2) return setFormError('Scrie un titlu.');
    if (!DATE_RE.test(date) || date > dateKey()) return setFormError('Data trebuie să fie AAAA-LL-ZZ și nu în viitor.');
    const results = rows
      .filter((r) => r.name.trim() && r.value.trim())
      .map((r) => {
        const value = parseNum(r.value);
        // Valoare nenumerică (ex. „Negativ”) → rezultat text.
        if (Number.isNaN(value) || value == null) {
          return { name: canonicalName(r.name), value: null, text: r.value.trim(), unit: r.unit.trim(), min: null, max: null };
        }
        return { name: canonicalName(r.name), value, unit: r.unit.trim(), min: parseNum(r.min), max: parseNum(r.max) };
      });
    if (results.length === 0) return setFormError('Completează cel puțin o analiză cu valoare.');
    if (results.some((r) => Number.isNaN(r.min) || Number.isNaN(r.max)))
      return setFormError('Limitele de referință trebuie să fie numere (sau goale).');

    setSaving(true);
    try {
      await addPatientLab(user, { title, labName, date, results });
      router.back();
    } catch {
      setFormError('Nu am putut salva. Verifică conexiunea și regulile Firestore.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar title="Adaugă analize" fallback="/labs" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {step === 'choose' && (
            <>
              <View style={styles.hero}>
                <View style={styles.heroIcon}>
                  <Ionicons name="scan" size={34} color={colors.primary} />
                </View>
                <Text style={styles.title}>Adaugă analize de la orice laborator</Text>
                <Text style={styles.text}>
                  Fotografiază buletinul (sau alege toate paginile din galerie), iar valorile sunt citite automat. Le verifici înainte de salvare și apar în
                  graficele tale de evoluție.
                </Text>
              </View>
              <PrimaryButton title="📷  Fă o poză buletinului" onPress={() => pick(true)} />
              <PrimaryButton title="Alege poze din galerie (toate paginile)" variant="outline" onPress={() => pick(false)} />
              <Pressable onPress={manual} style={styles.manualLink} accessibilityRole="button">
                <Text style={styles.link}>Sau introdu valorile manual</Text>
              </Pressable>
              {!!error && <Text style={styles.err}>{error}</Text>}
              <View style={styles.privacy}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                <Text style={styles.privacyText}>
                  Poza nu se salvează. Este trimisă la Google Gemini doar pentru citirea valorilor. Acoperă numele și CNP-ul
                  dacă vrei.
                </Text>
              </View>
            </>
          )}

          {step === 'reading' && (
            <View style={styles.reading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.title}>{progress || 'Citesc buletinul…'}</Text>
              <Text style={styles.text}>Durează 10–30 de secunde pe pagină.</Text>
            </View>
          )}

          {step === 'review' && (
            <>
              {fromPhoto && (
                <View style={styles.verify}>
                  <Ionicons name="eye-outline" size={20} color={colors.warning} />
                  <Text style={styles.verifyText}>
                    Am găsit {rows.length} {rows.length === 1 ? 'valoare' : 'valori'}
                    {pages > 1 ? ` din ${pages} pagini` : ''}. Verifică-le cu buletinul original înainte de salvare –
                    citirea automată poate greși.
                  </Text>
                </View>
              )}
              <TextField label="Titlu" icon="document-text-outline" value={title} onChangeText={setTitle} />
              <TextField label="Laborator" icon="business-outline" placeholder="ex. Laborator Timișoara" value={labName} onChangeText={setLabName} />
              <TextField label="Data recoltării (AAAA-LL-ZZ)" icon="calendar-outline" value={date} onChangeText={setDate} />

              <Text style={styles.section}>Rezultate</Text>
              {rows.map((r) => {
                const f = flagOf({ value: parseNum(r.value), min: parseNum(r.min), max: parseNum(r.max) });
                const out = f === 'high' || f === 'low';
                return (
                  <View key={r.key} style={[styles.rowCard, out && styles.rowOut]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <TextInput
                        style={styles.nameInput}
                        value={r.name}
                        onChangeText={update(r.key, 'name')}
                        placeholder="Analiză (ex. Glicemie)"
                        placeholderTextColor="#94A3B8"
                        accessibilityLabel="Denumire analiză"
                      />
                      <Pressable onPress={() => remove(r.key)} hitSlop={8} accessibilityLabel={`Șterge ${r.name || 'rândul'}`}>
                        <Ionicons name="close-circle" size={22} color="#94A3B8" />
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <SmallInput label="Rezultat" value={r.value} onChangeText={update(r.key, 'value')} width="28%" error={out} />
                      <SmallInput label="Unitate" value={r.unit} onChangeText={update(r.key, 'unit')} width="24%" />
                      <SmallInput label="Ref. min" value={r.min} onChangeText={update(r.key, 'min')} keyboardType="decimal-pad" width="20%" />
                      <SmallInput label="Ref. max" value={r.max} onChangeText={update(r.key, 'max')} keyboardType="decimal-pad" width="20%" />
                    </View>
                  </View>
                );
              })}
              {fromPhoto && (
                <View style={styles.morePages}>
                  <Text style={styles.morePagesTitle}>Buletinul are mai multe pagini?</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton title="📷 Încă o pagină" variant="outline" onPress={() => pick(true, true)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton title="Din galerie" variant="outline" onPress={() => pick(false, true)} />
                    </View>
                  </View>
                </View>
              )}

              <Pressable onPress={() => setRows((cur) => [...cur, toRow()])} style={styles.addRow} accessibilityRole="button">
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.link}>Adaugă o analiză</Text>
              </Pressable>

              {!!formError && <Text style={styles.err}>{formError}</Text>}
              <PrimaryButton title="Salvează analizele" onPress={save} loading={saving} />
              <PrimaryButton title="Renunță" variant="outline" onPress={() => setStep('choose')} disabled={saving} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.body + 3, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { fontSize: font.body - 1, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  manualLink: { alignSelf: 'center', minHeight: 40, justifyContent: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.small + 1 },
  err: { color: colors.error, fontSize: font.small + 1 },
  privacy: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  privacyText: { flex: 1, fontSize: font.small - 1, color: colors.textMuted, lineHeight: 18 },
  reading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  verify: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  verifyText: { flex: 1, fontSize: font.small, color: colors.warning, lineHeight: 19, fontWeight: '600' },
  section: { fontSize: font.body + 1, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  rowCard: { gap: spacing.sm, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1, borderColor: '#E2E8F0' },
  rowOut: { backgroundColor: colors.errorSoft, borderColor: '#FECACA' },
  nameInput: {
    flex: 1,
    minHeight: 42,
    fontSize: font.body,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    outlineStyle: 'none',
  },
  smallLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  smallInput: {
    minHeight: 40,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    fontSize: font.small + 1,
    color: colors.text,
    backgroundColor: '#fff',
  },
  morePages: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  morePagesTitle: { fontSize: font.small + 1, fontWeight: '700', color: colors.text },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
});
