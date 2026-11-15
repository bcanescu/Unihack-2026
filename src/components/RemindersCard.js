import { useEffect, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  remindersSupported,
  getRemindersEnabled,
  setRemindersEnabled,
  requestNotificationPermission,
  openNotificationSettings,
  inExpoGo,
  syncReminders,
  sendTestReminder,
} from '../lib/reminders';
import { colors, spacing, radius, font } from '../constants/theme';

/** Comutator „Remindere” + sincronizare automată cu tratamentul primit. */
export default function RemindersCard({ meds }) {
  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getRemindersEnabled().then(setEnabled);
  }, []);

  // De fiecare dată când medicul schimbă tratamentul, reminderele se reprogramează.
  const medsKey = JSON.stringify(meds.map((m) => [m.id, m.times, m.active, m.endDate]));
  useEffect(() => {
    if (!enabled) return;
    syncReminders(meds)
      .then(setCount)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, medsKey]);

  const [needsSettings, setNeedsSettings] = useState(false);
  const appName = inExpoGo ? 'Expo Go' : 'Medly';

  async function askPermission() {
    const r = await requestNotificationPermission();
    setNeedsSettings(!r.ok && r.canAskAgain === false);
    if (!r.ok) {
      setMsg(
        r.error
          ? `Notificările nu au putut fi activate: ${r.error}`
          : r.canAskAgain === false
            ? `Notificările sunt blocate pentru ${appName}. Deschide setările și activează-le, apoi încearcă din nou.`
            : `Ai refuzat notificările. Apasă din nou și alege „Permite”.`,
      );
    }
    return r.ok;
  }

  async function toggle(next) {
    setMsg('');
    if (next && !(await askPermission())) return;
    await setRemindersEnabled(next);
    setEnabled(next);
    if (!next) setCount(0);
    if (next) setMsg('Remindere activate.');
  }

  async function test() {
    setMsg('');
    if (!(await askPermission())) return;
    try {
      await sendTestReminder(5);
      setMsg('Reminder de test trimis – apare în 5 secunde (poți ieși din aplicație).');
    } catch (e) {
      setMsg(`Reminderul de test nu a putut fi programat: ${e?.message || e}`);
    }
  }

  if (!remindersSupported) {
    return (
      <View style={styles.card}>
        <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        <Text style={[styles.text, { flex: 1 }]}>Reminderele funcționează în aplicația de pe telefon.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={styles.row}>
        <Ionicons name={enabled ? 'notifications' : 'notifications-off-outline'} size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Remindere</Text>
          <Text style={styles.text}>
            {enabled
              ? count > 0
                ? `Activ – ${count} ${count === 1 ? 'reminder zilnic' : 'remindere zilnice'}`
                : 'Activ – niciun medicament programat'
              : 'Primește o notificare la ora fiecărui medicament'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel="Remindere pentru medicamente"
        />
      </View>
      {enabled && (
        <Pressable onPress={test} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <Text style={styles.link}>Trimite un reminder de test</Text>
        </Pressable>
      )}
      {!enabled && (
        <Pressable onPress={test} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <Text style={styles.link}>Testează notificările</Text>
        </Pressable>
      )}
      {!!msg && <Text style={styles.msg}>{msg}</Text>}
      {needsSettings && (
        <Pressable onPress={openNotificationSettings} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <Text style={styles.link}>Deschide setările telefonului</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  title: { fontSize: font.body, fontWeight: '800', color: colors.text },
  text: { fontSize: font.small, color: colors.textMuted, lineHeight: 19 },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.small + 1, marginLeft: 34 },
  msg: { fontSize: font.small, color: colors.primary, marginLeft: 34 },
});