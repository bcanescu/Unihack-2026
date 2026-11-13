import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth } from '../../context/AuthContext';
import { LAB_PANELS, addLab, parseNum, rangeText, flagOf } from '../../lib/labs';
import { dateKey, addDays } from '../../lib/medications';
import { pdfUploadEnabled } from '../../lib/firebase';
import TopBar from '../../components/TopBar';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import Chip from '../../components/Chip';
import { colors, spacing, radius, font } from '../../constants/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let rowSeq = 0;
const makeRow = (t) => ({ key: `r${rowSeq++}`, value: '', ...t });

export default function AddLab() {
  const { patientId } = useLocalSearchParams();
  const { user } = useAuth();
  const today = dateKey();

  const [panels, setPanels] = useState([]);
  const [title, setTitle] = useState('');
  const [labName, setLabName] = useState('');
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [note, setNote] = useState('');
  const [pdf, setPdf] = useState(null);
  const [custom, setCustom] = useState({ name: '', unit: '', min: '', max: '' });
  const [showCustom, setShowCustom] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function togglePanel(panel) {
    const selected = panels.includes(panel.name);
    const nextPanels = selected ? panels.filter((p) => p !== panel.name) : [...panels, panel.name];
    setPanels(nextPanels);
    setTitle(nextPanels.join(' + '));
    setRows((cur) => {
      if (selected) {
        const names = panel.tests.map((t) => t.name);
        return cur.filter((r) => !names.includes(r.name) || r.value !== '');
      }
      const existing = new Set(cur.map((r) => r.name));
      return [...cur, ...panel.tests.filter((t) => !existing.has(t.name)).map(makeRow)];
    });
    setErrors((e) => ({ ...e, title: undefined, results: undefined }));
  }

  const setRowValue = (key, value) =>
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, value: value.replace(/[^\d.,]/g, '') } : r)));
  const removeRow = (key) => setRows((cur) => cur.filter((r) => r.key !== key));

  function addCustomRow() {
    const min = parseNum(custom.min);
    const max = parseNum(custom.max);
    if (custom.name.trim().length < 2 || Number.isNaN(min) || Number.isNaN(max)) {
      return setErrors((e) => ({ ...e, custom: 'Completează denumirea; limitele trebuie să fie numere (sau goale).' }));
    }
    setRows((cur) => [...cur, makeRow({ name: custom.name.trim(), unit: custom.unit.trim(), min, max })]);
    setCustom({ name: '', unit: '', min: '', max: '' });
    setShowCustom(false);
    setErrors((e) => ({ ...e, custom: undefined, results: undefined }));
  }

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      return setErrors((e) => ({ ...e, pdf: 'Fișierul depășește 10 MB.' }));
    }
    setPdf(asset);
    setErrors((e) => ({ ...e, pdf: undefined, results: undefined }));
  }

  async function save() {
    const found = {};
    if (title.trim().length < 2) found.title = 'Alege un tip de analize sau scrie un titlu.';
    if (!DATE_RE.test(date) || date > today) found.date = 'Data trebuie să fie AAAA-LL-ZZ și nu în viitor.';
    const results = rows
      .filter((r) => r.value !== '')
      .map(({ name, unit, min, max, value }) => ({ name, unit, min: min ?? null, max: max ?? null, value: parseNum(value) }));
    if (results.some((r) => Number.isNaN(r.value))) found.results = 'Unele valori nu sunt numere valide.';
    if (results.length === 0 && !pdf) found.results = 'Completează cel puțin o valoare sau atașează PDF-ul.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await addLab(user, patientId, { title, labName, date, results, note }, pdf);
      router.back();
    } catch {
      setErrors({ submit: 'Nu am putut salva analizele. Verifică conexiunea și accesul la pacient.' });
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar title="Adaugă analize" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.group}>
            <Text style={styles.label}>Tip analize</Text>
            <View style={styles.chips}>
              {LAB_PANELS.map((p) => (
                <Chip key={p.name} label={p.name} selected={panels.includes(p.name)} onPress={() => togglePanel(p)} />
              ))}
            </View>
          </View>

          <View>
            <TextField label="Titlu" icon="document-text-outline" placeholder="ex. Analize de control" value={title} onChangeText={setTitle} error={!!errors.title} />
            {!!errors.title && <Text style={styles.err}>{errors.title}</Text>}
          </View>

          <TextField label="Laborator (opțional)" icon="business-outline" placeholder="ex. Laborator Timișoara" value={labName} onChangeText={setLabName} />

          <View style={styles.group}>
            <TextField label="Data recoltării" icon="calendar-outline" placeholder="AAAA-LL-ZZ" value={date} onChangeText={setDate} error={!!errors.date} />
            <View style={styles.chips}>
              <Chip label="Azi" selected={date === today} onPress={() => setDate(today)} />
              <Chip label="Ieri" selected={date === addDays(today, -1)} onPress={() => setDate(addDays(today, -1))} />
            </View>
            {!!errors.date && <Text style={styles.err}>{errors.date}</Text>}
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>Rezultate</Text>
            {rows.length === 0 && <Text style={styles.hint}>Alege un tip de analize de mai sus sau adaugă un parametru.</Text>}
            {rows.map((r) => {
              const f = flagOf({ ...r, value: parseNum(r.value) });
              const out = f === 'high' || f === 'low';
              return (
                <View key={r.key} style={[styles.resultRow, out && styles.resultOut]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{r.name}</Text>
                    <Text style={styles.hint}>
                      Ref. {rangeText(r)} {r.unit}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.valueInput, out && { borderColor: colors.error, color: colors.error }]}
                    value={r.value}
                    onChangeText={(v) => setRowValue(r.key, v)}
                    placeholder="—"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Valoare ${r.name}`}
                  />
                  <Text style={styles.unitText}>{r.unit}</Text>
                  <Pressable onPress={() => removeRow(r.key)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Șterge ${r.name}`}>
                    <Ionicons name="close-circle" size={22} color="#94A3B8" />
                  </Pressable>
                </View>
              );
            })}

            {showCustom ? (
              <View style={styles.customBox}>
                <TextField label="Parametru" placeholder="ex. Feritină" value={custom.name} onChangeText={(v) => setCustom((c) => ({ ...c, name: v }))} />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <TextField label="Unitate" placeholder="ng/mL" value={custom.unit} onChangeText={(v) => setCustom((c) => ({ ...c, unit: v }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField label="Min" placeholder="opț." keyboardType="decimal-pad" value={custom.min} onChangeText={(v) => setCustom((c) => ({ ...c, min: v }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField label="Max" placeholder="opț." keyboardType="decimal-pad" value={custom.max} onChangeText={(v) => setCustom((c) => ({ ...c, max: v }))} />
                  </View>
                </View>
                {!!errors.custom && <Text style={styles.err}>{errors.custom}</Text>}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton title="Renunță" variant="outline" onPress={() => setShowCustom(false)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton title="Adaugă" onPress={addCustomRow} />
                  </View>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setShowCustom(true)} style={styles.addRowBtn} accessibilityRole="button">
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.link}>Adaugă alt parametru</Text>
              </Pressable>
            )}
            {!!errors.results && <Text style={styles.err}>{errors.results}</Text>}
          </View>

          <TextField
            label="Notă pentru pacient (opțional)"
            icon="chatbubble-ellipses-outline"
            placeholder="ex. Colesterol ușor crescut, reluăm în 3 luni."
            value={note}
            onChangeText={setNote}
            multiline
          />

          {pdfUploadEnabled ? (
            <View style={styles.group}>
              <Text style={styles.label}>Buletin PDF (opțional)</Text>
              {pdf ? (
                <View style={styles.pdfRow}>
                  <Ionicons name="document-attach" size={22} color={colors.primary} />
                  <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
                    {pdf.name}
                  </Text>
                  <Pressable onPress={() => setPdf(null)} hitSlop={8} accessibilityLabel="Elimină PDF">
                    <Ionicons name="close-circle" size={22} color="#94A3B8" />
                  </Pressable>
                </View>
              ) : (
                <PrimaryButton title="Atașează PDF" variant="outline" onPress={pickPdf} />
              )}
              {!!errors.pdf && <Text style={styles.err}>{errors.pdf}</Text>}
            </View>
          ) : (
            <Text style={styles.hint}>Atașarea PDF-ului necesită Firebase Storage (planul Blaze).</Text>
          )}

          {!!errors.submit && <Text style={styles.err}>{errors.submit}</Text>}
          <PrimaryButton title="Salvează analizele" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  group: { gap: spacing.sm + 2 },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { fontSize: font.small - 1, color: colors.textMuted },
  err: { color: colors.error, fontSize: font.small, marginTop: 4 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultOut: { backgroundColor: colors.errorSoft, borderColor: '#FECACA' },
  resultName: { fontSize: font.body - 1, fontWeight: '700', color: colors.text },
  valueInput: {
    width: 76,
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: 'right',
    paddingHorizontal: 10,
    fontSize: font.body,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: '#fff',
  },
  unitText: { width: 52, fontSize: font.small - 2, color: colors.textMuted },
  customBox: { gap: spacing.sm + 2, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.small + 1 },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
});
