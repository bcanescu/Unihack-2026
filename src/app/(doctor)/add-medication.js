import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { addMedication } from '../../lib/medications';
import TopBar from '../../components/TopBar';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import Chip from '../../components/Chip';
import { colors, spacing, radius, font } from '../../constants/theme';

const TIME_PRESETS = [
  { label: 'Dimineața', time: '08:00', icon: 'sunny-outline' },
  { label: 'Prânz', time: '14:00', icon: 'restaurant-outline' },
  { label: 'Seara', time: '20:00', icon: 'moon-outline' },
  { label: 'Noaptea', time: '22:00', icon: 'bed-outline' },
];

const DURATIONS = [
  { label: '5 zile', days: 5 },
  { label: '7 zile', days: 7 },
  { label: '14 zile', days: 14 },
  { label: '30 zile', days: 30 },
  { label: 'Continuu', days: null },
];

const INSTRUCTION_PRESETS = ['După masă', 'Înainte de masă', 'Pe stomacul gol', 'Cu multă apă'];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function AddMedication() {
  const { patientId } = useLocalSearchParams();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState(['08:00']);
  const [customTime, setCustomTime] = useState('');
  const [duration, setDuration] = useState(7);
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const toggleTime = (t) => {
    setTimes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].sort()));
    setErrors((e) => ({ ...e, times: undefined }));
  };

  function addCustomTime() {
    const t = customTime.trim();
    if (!TIME_RE.test(t)) return setErrors((e) => ({ ...e, customTime: 'Scrie ora ca HH:MM, ex. 11:30' }));
    if (!times.includes(t)) setTimes((cur) => [...cur, t].sort());
    setCustomTime('');
    setErrors((e) => ({ ...e, customTime: undefined, times: undefined }));
  }

  function toggleInstruction(text) {
    setInstructions((cur) => {
      const parts = cur.split(',').map((s) => s.trim()).filter(Boolean);
      const next = parts.includes(text) ? parts.filter((p) => p !== text) : [...parts, text];
      return next.join(', ');
    });
  }

  async function save() {
    const found = {};
    if (name.trim().length < 2) found.name = 'Scrie denumirea medicamentului.';
    if (dose.trim().length < 1) found.dose = 'Scrie doza (ex. 1 comprimat 500 mg).';
    if (times.length === 0) found.times = 'Alege cel puțin o oră de administrare.';
    if (times.length > 6) found.times = 'Maximum 6 administrări pe zi.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await addMedication(user, patientId, { name, dose, times, instructions, durationDays: duration });
      router.back();
    } catch {
      setErrors({ submit: 'Nu am putut salva. Verifică dacă mai ai acces la pacient.' });
      setSaving(false);
    }
  }

  const customTimes = times.filter((t) => !TIME_PRESETS.some((p) => p.time === t));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar title="Adaugă medicament" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View>
            <TextField
              label="Denumire"
              icon="medical-outline"
              placeholder="ex. Amoxicilină"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setErrors((e) => ({ ...e, name: undefined }));
              }}
              error={!!errors.name}
            />
            {!!errors.name && <Text style={styles.err}>{errors.name}</Text>}
          </View>

          <View>
            <TextField
              label="Doză"
              icon="flask-outline"
              placeholder="ex. 1 comprimat 500 mg"
              value={dose}
              onChangeText={(v) => {
                setDose(v);
                setErrors((e) => ({ ...e, dose: undefined }));
              }}
              error={!!errors.dose}
            />
            {!!errors.dose && <Text style={styles.err}>{errors.dose}</Text>}
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>Când se ia</Text>
            <View style={styles.chips}>
              {TIME_PRESETS.map((p) => (
                <Chip
                  key={p.time}
                  icon={p.icon}
                  label={`${p.label} · ${p.time}`}
                  selected={times.includes(p.time)}
                  onPress={() => toggleTime(p.time)}
                />
              ))}
              {customTimes.map((t) => (
                <Chip key={t} label={t} selected onPress={() => toggleTime(t)} />
              ))}
            </View>
            <View style={styles.customRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Altă oră"
                  icon="time-outline"
                  placeholder="HH:MM"
                  value={customTime}
                  onChangeText={(v) => setCustomTime(v.replace(/[^\d:]/g, '').slice(0, 5))}
                  keyboardType="numbers-and-punctuation"
                  onSubmitEditing={addCustomTime}
                  error={!!errors.customTime}
                />
              </View>
              <View style={{ width: 110, justifyContent: 'flex-end' }}>
                <PrimaryButton title="Adaugă" variant="outline" onPress={addCustomTime} />
              </View>
            </View>
            {!!(errors.customTime || errors.times) && <Text style={styles.err}>{errors.customTime || errors.times}</Text>}
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>Durată</Text>
            <View style={styles.chips}>
              {DURATIONS.map((d) => (
                <Chip key={d.label} label={d.label} selected={duration === d.days} onPress={() => setDuration(d.days)} />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <TextField
              label="Instrucțiuni (opțional)"
              icon="information-circle-outline"
              placeholder="ex. după masă"
              value={instructions}
              onChangeText={setInstructions}
            />
            <View style={styles.chips}>
              {INSTRUCTION_PRESETS.map((t) => (
                <Chip key={t} label={t} selected={instructions.includes(t)} onPress={() => toggleInstruction(t)} />
              ))}
            </View>
          </View>

          <View style={styles.summary}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
            <Text style={styles.summaryText}>
              Pacientul va vedea medicamentul în „Ce iau azi”, de {times.length} {times.length === 1 ? 'dată' : 'ori'} pe
              zi, {duration ? `timp de ${duration} zile` : 'fără dată de final'}.
            </Text>
          </View>

          {!!errors.submit && <Text style={styles.err}>{errors.submit}</Text>}

          <PrimaryButton title="Salvează medicamentul" onPress={save} loading={saving} />
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
  customRow: { flexDirection: 'row', gap: spacing.sm },
  err: { color: colors.error, fontSize: font.small, marginTop: 6 },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  summaryText: { flex: 1, fontSize: font.small + 1, color: colors.text, lineHeight: 20 },
});
