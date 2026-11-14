// Medic → Profil → Editează profilul public (ce văd pacienții).
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { subscribeDoctorPublic, updateDoctorPublic } from '../../lib/doctorProfile';
import TopBar from '../../components/TopBar';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, spacing, radius, font } from '../../constants/theme';

function ListEditor({ label, icon, placeholder, items, onChange, max = 10 }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t || items.length >= max) return;
    onChange([...items, t]);
    setDraft('');
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      {items.map((it, i) => (
        <View key={`${it}-${i}`} style={styles.item}>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <Text style={styles.itemText}>{it}</Text>
          <Pressable onPress={() => onChange(items.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`Șterge: ${it}`}>
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </Pressable>
        </View>
      ))}
      {items.length < max && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            onSubmitEditing={add}
            accessibilityLabel={`Adaugă la ${label}`}
          />
          <Pressable onPress={add} style={[styles.addBtn, !draft.trim() && { opacity: 0.4 }]} disabled={!draft.trim()} accessibilityRole="button" accessibilityLabel={`Adaugă ${label}`}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function EditDoctorProfile() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [f, setF] = useState({ hospitalRole: '', experienceYears: '', bio: '', education: [], achievements: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () =>
      subscribeDoctorPublic(user.uid, (d) => {
        if (loaded) return;
        if (d) {
          setF({
            hospitalRole: d.hospitalRole ?? '',
            experienceYears: d.experienceYears != null ? String(d.experienceYears) : '',
            bio: d.bio ?? '',
            education: d.education ?? [],
            achievements: d.achievements ?? [],
          });
        }
        setLoaded(true);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.uid]
  );

  const set = (k) => (v) => setF((cur) => ({ ...cur, [k]: v }));

  async function save() {
    setError('');
    if (f.experienceYears !== '' && !/^\d{1,2}$/.test(f.experienceYears)) return setError('Anii de experiență: un număr între 0 și 60.');
    setSaving(true);
    try {
      await updateDoctorPublic(user.uid, f);
      router.back();
    } catch {
      setError('Nu am putut salva. Verifică regulile Firestore și conexiunea.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar title="Profil public" fallback="/profile" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Aceste informații apar pacienților când caută un medic sau își fac o programare. Numele, specializarea și spitalul
            sunt gestionate de administrator.
          </Text>

          <TextField label="Rol în spital" icon="ribbon-outline" placeholder="ex. Medic primar, șef de secție" value={f.hospitalRole} onChangeText={set('hospitalRole')} />
          <TextField
            label="Ani de experiență"
            icon="time-outline"
            placeholder="ex. 12"
            value={f.experienceYears}
            onChangeText={(v) => set('experienceYears')(v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
          />

          <View style={{ gap: 4 }}>
            <Text style={styles.label}>Despre mine</Text>
            <TextInput
              style={styles.bio}
              value={f.bio}
              onChangeText={(v) => set('bio')(v.slice(0, 800))}
              placeholder="Cu ce te ocupi, cum lucrezi cu pacienții, ce tratezi cel mai des…"
              placeholderTextColor="#94A3B8"
              multiline
              accessibilityLabel="Despre mine"
            />
            <Text style={styles.counter}>{f.bio.length}/800</Text>
          </View>

          <ListEditor label="Studii și formare" icon="school-outline" placeholder="ex. UMF Timișoara – Medicină generală" items={f.education} onChange={set('education')} />
          <ListEditor label="Realizări" icon="trophy-outline" placeholder="ex. Peste 2.000 de intervenții" items={f.achievements} onChange={set('achievements')} />

          {!!error && <Text style={styles.err}>{error}</Text>}
          <PrimaryButton title="Salvează profilul" onPress={save} loading={saving} disabled={!loaded} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md + 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  intro: { fontSize: font.small + 1, color: colors.textMuted, lineHeight: 20, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  bio: {
    minHeight: 120,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    fontSize: font.body,
    color: colors.text,
    textAlignVertical: 'top',
    outlineStyle: 'none',
  },
  counter: { alignSelf: 'flex-end', fontSize: font.small - 2, color: colors.textMuted },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.surface },
  itemText: { flex: 1, fontSize: font.small + 1, color: colors.text, lineHeight: 20 },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  addInput: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    fontSize: font.body - 1,
    color: colors.text,
    outlineStyle: 'none',
  },
  addBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  err: { color: colors.error, fontSize: font.small },
});
