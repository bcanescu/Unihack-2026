// Pacient → Asistent: chatbot de informare despre sănătate (Gemini prin Firebase AI Logic).
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { askAssistant, detectEmergency, labExplainPrompt, assistantErrorMessage, MAX_INPUT } from '../../../lib/healthAssistant';
import { getLab, formatLabDate } from '../../../lib/labs';
import PrimaryButton from '../../../components/PrimaryButton';
import { colors, spacing, radius, font } from '../../../constants/theme';

const SUGGESTIONS = [
  'Ce înseamnă colesterolul LDL crescut?',
  'Cum iau corect un antibiotic?',
  'Ce pot face pentru o tensiune mai bună?',
  'Cum mă pregătesc pentru analizele de sânge?',
];

function EmergencyBanner({ onClose }) {
  return (
    <View style={styles.emergency} accessibilityRole="alert">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="warning" size={22} color="#fff" />
        <Text style={styles.emergencyTitle}>Poate fi o urgență medicală</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Închide avertismentul">
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>
      <Text style={styles.emergencyText}>Nu aștepta răspunsul asistentului. Sună acum la 112.</Text>
      <Pressable
        onPress={() => Linking.openURL('tel:112')}
        style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Sună la 112"
      >
        <Ionicons name="call" size={20} color={colors.error} />
        <Text style={styles.callText}>Sună la 112</Text>
      </Pressable>
    </View>
  );
}

/** Text simplu: păstrăm rândurile și scoatem marcajele **bold** venite de la model. */
const clean = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ');

function Bubble({ msg, isLastAssistant }) {
  const mine = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, mine ? { justifyContent: 'flex-end' } : null]}>
      {!mine && (
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
        </View>
      )}
      <View style={{ maxWidth: '82%', gap: 6 }}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleBot, msg.error && styles.bubbleError]}>
          <Text style={[styles.bubbleText, mine && { color: '#fff' }, msg.error && { color: colors.error }]} selectable>
            {mine ? msg.display ?? msg.text : clean(msg.text)}
          </Text>
        </View>
        {isLastAssistant && !msg.error && !/^Sună imediat la 112/i.test(msg.text.trim()) && (
          <Pressable onPress={() => router.push('/book')} style={styles.bookLink} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.bookText}>Programează o consultație</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const { labId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]); // { role, text, display?, error? }
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [pendingLab, setPendingLab] = useState(null); // buletin care așteaptă acordul pacientului
  const scrollRef = useRef(null);

  // Venit din „Explică-mi analizele”: încărcăm buletinul și cerem acordul înainte de trimitere.
  useEffect(() => {
    if (!labId) return;
    getLab(user.uid, labId)
      .then((lab) => lab && setPendingLab(lab))
      .catch(() => {});
    router.setParams({ labId: undefined });
  }, [labId, user.uid]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages, busy, pendingLab, emergency]);

  async function send(text, display) {
    const q = text.trim();
    if (!q || busy) return;
    if (detectEmergency(q)) setEmergency(true); // imediat, înainte de răspunsul modelului

    const history = messages.filter((m) => !m.error);
    setMessages((cur) => [...cur, { role: 'user', text: q, display }]);
    setInput('');
    setBusy(true);
    try {
      const answer = await askAssistant(history, q);
      setMessages((cur) => [...cur, { role: 'assistant', text: answer }]);
    } catch (e) {
      console.warn('[asistent]', e?.code, e?.message);
      setMessages((cur) => [...cur, { role: 'assistant', text: assistantErrorMessage(e), error: true }]);
    } finally {
      setBusy(false);
    }
  }

  function explainLab() {
    const lab = pendingLab;
    setPendingLab(null);
    send(labExplainPrompt(lab), `Explică-mi analizele „${lab.title}” din ${formatLabDate(lab.date)}`);
  }

  function reset() {
    setMessages([]);
    setEmergency(false);
    setPendingLab(null);
  }

  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf('assistant');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Asistent</Text>
            <Text style={styles.subtitle}>Informații generale – nu înlocuiesc consultul medical</Text>
          </View>
          {messages.length > 0 && (
            <Pressable onPress={reset} hitSlop={8} style={styles.newBtn} accessibilityRole="button" accessibilityLabel="Conversație nouă">
              <Ionicons name="add" size={22} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {messages.length === 0 && !pendingLab && (
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <Ionicons name="sparkles" size={28} color={colors.primary} />
              </View>
              <Text style={styles.introTitle}>Bună, {user.name.split(/\s+/)[0]}! Cu ce te pot ajuta?</Text>
              <Text style={styles.introText}>
                Întreabă-mă despre analize, tratamente sau un stil de viață sănătos. Nu pun diagnostice și nu modific
                tratamente – pentru asta vorbește cu medicul tău.
              </Text>
              <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} onPress={() => send(s)} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                    <Text style={styles.suggestionText}>{s}</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.privacy}>
                <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} /> Conversația nu se salvează. Nu
                scrie date personale (CNP, adresă). Întrebările sunt procesate de Google Gemini.
              </Text>
            </View>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} msg={m} isLastAssistant={i === lastAssistantIdx && !busy} />
          ))}

          {busy && (
            <View style={styles.bubbleRow}>
              <View style={styles.botAvatar}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, styles.typing]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.typingText}>Asistentul scrie…</Text>
              </View>
            </View>
          )}

          {pendingLab && (
            <View style={styles.consent}>
              <Text style={styles.consentTitle}>Explici analizele „{pendingLab.title}”?</Text>
              <Text style={styles.consentText}>
                Asistentului i se trimit doar valorile și limitele de referință din acest buletin – fără numele sau CNP-ul
                tău. Datele sunt procesate de Google Gemini.
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="Nu" variant="outline" onPress={() => setPendingLab(null)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="Da, explică" onPress={explainLab} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {emergency && <EmergencyBanner onClose={() => setEmergency(false)} />}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(t) => setInput(t.slice(0, MAX_INPUT))}
            placeholder="Scrie o întrebare…"
            placeholderTextColor="#94A3B8"
            multiline
            accessibilityLabel="Întrebare pentru asistent"
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || busy}
            style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Trimite"
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.small - 1, color: colors.textMuted, marginTop: 2 },
  newBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center', flexGrow: 1 },
  intro: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  introIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: font.body + 3, fontWeight: '800', color: colors.text, textAlign: 'center' },
  introText: { fontSize: font.body - 1, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#B5EDE6',
    backgroundColor: colors.background,
  },
  suggestionText: { flex: 1, fontSize: font.body - 1, color: colors.text, fontWeight: '600' },
  privacy: { fontSize: font.small - 2, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  botAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleBot: { backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  bubbleError: { backgroundColor: colors.errorSoft },
  bubbleText: { fontSize: font.body, color: colors.text, lineHeight: 23 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typingText: { fontSize: font.small, color: colors.textMuted },
  bookLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingLeft: 4 },
  bookText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  consent: { gap: spacing.sm + 2, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accentSoft },
  consentTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  consentText: { fontSize: font.small, color: colors.text, lineHeight: 19 },
  emergency: { margin: spacing.md, marginBottom: 0, padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.error },
  emergencyTitle: { flex: 1, color: '#fff', fontWeight: '800', fontSize: font.body },
  emergencyText: { color: '#fff', fontSize: font.small + 1 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
  },
  callText: { color: colors.error, fontWeight: '800', fontSize: font.body + 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 23,
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: font.body,
    color: colors.text,
    outlineStyle: 'none',
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
