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
  if (!on && remindersSupported) await Notifications.cancelAllScheduledNotificationsAsync();
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
  await Notifications.cancelAllScheduledNotificationsAsync();

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
        data: { screen: 'today' },
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
