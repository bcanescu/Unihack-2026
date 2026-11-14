// Pacient → Recenzie după o consultație încheiată: 1–5 stele + câteva cuvinte.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { subscribePatientAppointments, formatDayLong } from '../../../lib/appointments';
import { submitReview, isAppointmentFinished, authorNameFrom, MIN_COMMENT, MAX_COMMENT } from '../../../lib/doctorProfile';
import TopBar from '../../../components/TopBar';
import PrimaryButton from '../../../components/PrimaryButton';
import { StarPicker } from '../../../components/Stars';
import { CRITERIA, ISSUES, MAX_HOSPITAL_COMMENT, submitHospitalReview } from '../../../lib/hospitalReviews';
import { Avatar, EmptyState } from '../../../components/ui';
import { colors, spacing, radius, font } from '../../../constants/theme';

const QUICK = ['Explică pe înțeles', 'Atent și răbdător', 'Punctual', 'A așteptat mult', 'Recomand'];

export default function ReviewScreen() {
  const { apptId } = useLocalSearchParams();
  const { user } = useAuth();
  const [appt, setAppt] = useState(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  // Evaluarea spitalului (opțională)
  const [hRatings, setHRatings] = useState({ cleanliness: 0, staff: 0, facilities: 0 });
  const [issues, setIssues] = useState([]);
  const [hComment, setHComment] = useState('');
  const hStarted = Object.values(hRatings).some(Boolean) || issues.length > 0 || hComment.trim().length > 0;
  const toggleIssue = (i) => setIssues((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  useEffect(
    () => subscribePatientAppointments(user.uid, (list) => setAppt((cur) => (cur === undefined || cur ? list.find((a) => a.id === apptId) ?? null : cur))),
    [user.uid, apptId]
  );

  async function submit() {
    setError('');
    if (!rating) return setError('Alege o notă de la 1 la 5 stele.');
    if (comment.trim().length < MIN_COMMENT) return setError('Scrie în câteva cuvinte de ce ai dat această notă.');
    if (hStarted && Object.values(hRatings).some((v) => !v))
      return setError('Pentru evaluarea spitalului, dă o notă la toate cele trei criterii (sau lasă secțiunea goală).');
    setSaving(true);
    try {
      await submitReview(user, appt, rating, comment);
      if (hStarted && appt.hospital) {
        await submitHospitalReview(user, appt, hRatings, issues, hComment).catch((e) =>
          console.warn('[recenzie spital]', e?.code, e?.message)
        );
      }
      setDone(true);
    } catch (e) {
      setError(e?.code === 'already-reviewed' ? 'Ai lăsat deja o recenzie pentru această consultație.' : 'Nu am putut trimite recenzia. Încearcă din nou.');
      setSaving(false);
    }
  }

  if (appt === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="Recenzie" fallback="/appointments" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  if (!appt || !isAppointmentFinished(appt)) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="Recenzie" fallback="/appointments" />
        <View style={styles.container}>
          <EmptyState icon="time-outline" title="Recenzia nu este disponibilă" text="Poți lăsa o recenzie după ce consultația a avut loc." />
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.center]}>
          <View style={styles.bigIcon}>
            <Ionicons name="heart" size={34} color={colors.success} />
          </View>
          <Text style={styles.title}>Mulțumim!</Text>
          <Text style={styles.text}>Recenzia ta îi ajută pe ceilalți pacienți să aleagă medicul și spitalul potrivit.</Text>
          <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md }}>
            <PrimaryButton title="Vezi profilul medicului" onPress={() => router.replace(`/doctor/${appt.doctorUid}`)} />
            <PrimaryButton title="Înapoi la programări" variant="outline" onPress={() => router.replace('/appointments')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar title="Recenzie" fallback="/appointments" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.doctor}>
            <Avatar name={appt.doctorName} />
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>{appt.doctorName}</Text>
              <Text style={styles.meta}>
                {appt.reason} · {formatDayLong(appt.date)}, {appt.time}
              </Text>
            </View>
          </View>

          <Text style={styles.question}>Cum a fost consultația?</Text>
          <StarPicker
            value={rating}
            onChange={(v) => {
              setRating(v);
              setError('');
            }}
          />

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>De ce ai dat această notă?</Text>
            <View style={styles.quick}>
              {QUICK.map((q) => (
                <Text
                  key={q}
                  onPress={() => setComment((c) => (c.includes(q) ? c : c ? `${c.trim()}${/[.!]$/.test(c.trim()) ? '' : '.'} ${q}.` : `${q}.`))}
                  style={styles.quickChip}
                  accessibilityRole="button"
                >
                  + {q}
                </Text>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={(t) => {
                setComment(t.slice(0, MAX_COMMENT));
                setError('');
              }}
              placeholder="ex. M-a ascultat cu atenție și mi-a explicat clar tratamentul."
              placeholderTextColor="#94A3B8"
              multiline
              accessibilityLabel="Comentariu recenzie"
            />
            <Text style={styles.counter}>{comment.length}/{MAX_COMMENT}</Text>
          </View>

          {!!appt.hospital && (
            <View style={styles.hospitalBox}>
              <View style={{ gap: 2 }}>
                <Text style={styles.hospitalTitle}>Cum a fost la spital? (opțional)</Text>
                <Text style={styles.meta}>{appt.hospital}</Text>
              </View>
              {CRITERIA.map((c) => (
                <View key={c.key} style={styles.criterion}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.criterionLabel}>{c.label}</Text>
                    {!!c.hint && <Text style={styles.criterionHint}>{c.hint}</Text>}
                  </View>
                  <StarPicker
                    value={hRatings[c.key]}
                    onChange={(v) => {
                      setHRatings((cur) => ({ ...cur, [c.key]: v }));
                      setError('');
                    }}
                    size={28}
                    showLabel={false}
                    label={c.label}
                  />
                </View>
              ))}
              <Text style={styles.label}>Ai observat probleme?</Text>
              <View style={styles.quick}>
                {ISSUES.map((i) => {
                  const on = issues.includes(i);
                  return (
                    <Text
                      key={i}
                      onPress={() => toggleIssue(i)}
                      style={[styles.issueChip, on && styles.issueChipOn]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      {on ? '✓ ' : ''}
                      {i}
                    </Text>
                  );
                })}
              </View>
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                value={hComment}
                onChangeText={(t) => setHComment(t.slice(0, MAX_HOSPITAL_COMMENT))}
                placeholder="Alte observații despre spital (opțional)"
                placeholderTextColor="#94A3B8"
                multiline
                accessibilityLabel="Comentariu despre spital"
              />
            </View>
          )}

          <View style={styles.note}>
            <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
            <Text style={styles.noteText}>
              Recenzia va fi publică, semnată „{authorNameFrom(user.name)}”, și marcată „consultație verificată”. Nu scrie date
              medicale personale.
            </Text>
          </View>

          {!!error && <Text style={styles.err}>{error}</Text>}
          <PrimaryButton title="Trimite recenzia" onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  bigIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.textMuted, textAlign: 'center', lineHeight: 23 },
  doctor: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  doctorName: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  question: { fontSize: font.body + 3, fontWeight: '800', color: colors.text, textAlign: 'center' },
  label: { fontSize: font.small + 1, fontWeight: '700', color: colors.text },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#B5EDE6',
    color: colors.primary,
    fontWeight: '700',
    fontSize: font.small,
    overflow: 'hidden',
  },
  input: {
    minHeight: 110,
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
  hospitalBox: { gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FAFBFC' },
  hospitalTitle: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  criterion: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  criterionLabel: { fontSize: font.body - 1, fontWeight: '700', color: colors.text },
  criterionHint: { fontSize: font.small - 2, color: colors.textMuted },
  issueChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.text,
    fontWeight: '600',
    fontSize: font.small,
    overflow: 'hidden',
  },
  issueChipOn: { borderColor: colors.warning, backgroundColor: colors.warningSoft, color: colors.warning },
  note: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  noteText: { flex: 1, fontSize: font.small - 1, color: colors.textMuted, lineHeight: 18 },
  err: { color: colors.error, fontSize: font.small + 1 },
});
