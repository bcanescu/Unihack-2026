/**
 * Remindere locale pentru medicație (funcționează și în Expo Go – nu folosesc push de pe server).
 * Strategie simplă: la fiecare schimbare a tratamentului, anulăm toate reminderele și le reprogramăm,
 * câte unul zilnic pentru fiecare oră în care pacientul are de luat ceva.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey, isActiveOn } from './medications';

export const remindersSupported = Platform.OS !== 'web';

const PREF_KEY = 'medly:reminders';
const CHANNEL_ID = 'medicatie';

if (remindersSupported) {
  // Afișează notificarea și când aplicația e deschisă.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Anulează doar reminderele de MEDICAȚIE (cele de programări rămân). */
async function cancelMedicationReminders() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.content?.data?.kind === 'med') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }
}

export async function getRemindersEnabled() {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) === 'on';
  } catch {
    return false;
  }
}

export async function setRemindersEnabled(on) {
  try {
    await AsyncStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {}
  if (!on && remindersSupported) await cancelMedicationReminders();
}

/** Cere permisiunea pentru notificări. Returnează true dacă e acordată. */
export async function ensurePermission() {
  if (!remindersSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Medicație',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Reprogramează reminderele pe baza tratamentului curent. */
export async function syncReminders(meds) {
  if (!remindersSupported) return 0;
  await cancelMedicationReminders();

  const today = dateKey();
  const byTime = {};
  meds
    .filter((m) => isActiveOn(m, today) || (m.active !== false && m.startDate > today))
    .forEach((m) => m.times.forEach((t) => {
      if (!byTime[t]) byTime[t] = [];
      byTime[t].push(`${m.name} (${m.dose})`);
    }));

  const times = Object.keys(byTime).sort();
  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 Ora ${time} – medicamentele tale`,
        body: byTime[time].join(', '),
        data: { kind: 'med', url: '/' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  }
  return times.length;
}

/** Notificare de test peste câteva secunde – utilă la prezentare. */
export async function sendTestReminder(seconds = 5) {
  if (!remindersSupported) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: '💊 E ora medicamentelor', body: 'Acesta este un reminder de test de la Medly.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: CHANNEL_ID,
    },
  });
}

// ── Remindere pentru programări ──────────────────────────────────────────────
// Notificări locale (merg și în Expo Go): cu o zi înainte la 18:00 și cu 2 ore înainte.
// ID-urile notificărilor se păstrează local, ca să le putem anula dacă programarea se anulează.
const APPT_KEY = 'medly:apptReminders';

async function readApptMap() {
  try {
    return JSON.parse((await AsyncStorage.getItem(APPT_KEY)) || '{}');
  } catch {
    return {};
  }
}
async function writeApptMap(map) {
  try {
    await AsyncStorage.setItem(APPT_KEY, JSON.stringify(map));
  } catch {}
}

const atLocal = (dateKey, time) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
};

/**
 * Programează reminderele pentru o programare. prep = instrucțiunile de pregătire (opțional).
 * Returnează lista momentelor programate (pentru mesajul de confirmare din aplicație).
 */
export async function scheduleAppointmentReminders(appt, prep) {
  const when = atLocal(appt.date, appt.time);
  const dayBefore = new Date(when);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(18, 0, 0, 0);
  const twoHours = new Date(when.getTime() - 2 * 60 * 60 * 1000);
  const now = Date.now() + 60 * 1000;

  const plan = [
    {
      at: dayBefore,
      label: 'cu o zi înainte, la 18:00',
      title: `📅 Mâine la ${appt.time}: ${appt.doctorName}`,
      body: `${appt.reason}. Confirmă prezența cu un tap.${prep ? `\n${prep}` : ''}`,
    },
    {
      at: twoHours,
      label: 'cu 2 ore înainte',
      title: `⏰ Peste 2 ore: ${appt.doctorName}`,
      body: `${appt.reason} la ${appt.time}${appt.hospital ? ` · ${appt.hospital}` : ''}.${prep ? `\n${prep}` : ''}`,
    },
  ].filter((p) => p.at.getTime() > now);

  if (!remindersSupported || plan.length === 0) return plan.map((p) => p.label);
  const ok = await ensurePermission().catch(() => false);
  if (!ok) return [];

  const ids = [];
  for (const p of plan) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body, data: { url: '/appointments' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL_ID },
      })
    );
  }
  const map = await readApptMap();
  map[appt.id] = ids;
  await writeApptMap(map);
  return plan.map((p) => p.label);
}

/** Anulează reminderele unei programări (anulată de pacient sau de medic). */
export async function cancelAppointmentReminders(apptId) {
  const map = await readApptMap();
  const ids = map[apptId];
  if (!ids) return;
  if (remindersSupported) {
    for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  delete map[apptId];
  await writeApptMap(map);
}
