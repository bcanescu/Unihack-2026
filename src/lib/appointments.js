/**
 * Programări.
 *
 * appointments/{id}:
 *   { doctorUid, patientUid, doctorName, doctorSpecialty, hospital, patientName, date, time, reason,
 *     slotId, status: 'booked' | 'cancelled', cancelledBy, createdAt, cancelledAt }
 *
 * busySlots/{doctorUid_AAAA-LL-ZZ_HHMM}: { doctorUid, date, time, appointmentId }
 *   ← ID-ul fix al slotului garantează că două persoane nu pot rezerva aceeași oră.
 *     Conține doar ora ocupată, nimic despre pacient, deci poate fi citit de pacienții medicului.
 */
import {
  collection,
  doc,
  getDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { demoStore } from './demoStore';
import { dateKey, addDays } from './medications';

// Program implicit al medicilor (pentru hackathon): luni–vineri, 09:00–13:00, la 30 de minute.
export const SCHEDULE = { workDays: [1, 2, 3, 4, 5], start: '09:00', end: '13:00', slotMinutes: 30 };
export const SCHEDULE_TEXT = 'Luni–Vineri, 09:00–13:00';
export const REASONS = ['Consult', 'Control', 'Citire analize', 'Tratament'];

const pad = (n) => String(n).padStart(2, '0');
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export const slotId = (doctorUid, date, time) => `${doctorUid}_${date}_${time.replace(':', '')}`;

export const parseDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isWorkDay = (key) => SCHEDULE.workDays.includes(parseDay(key).getDay());

/** Sloturile unei zile (gol în weekend). */
export function slotsForDay(key) {
  if (!isWorkDay(key)) return [];
  const out = [];
  for (let m = toMin(SCHEDULE.start); m < toMin(SCHEDULE.end); m += SCHEDULE.slotMinutes) out.push(fromMin(m));
  return out;
}

/** Următoarele `count` zile, începând de azi. */
export const nextDays = (count = 14) => Array.from({ length: count }, (_, i) => addDays(dateKey(), i));

export const isPastSlot = (key, time, now = new Date()) =>
  key < dateKey(now) || (key === dateKey(now) && toMin(time) <= now.getHours() * 60 + now.getMinutes());

const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const formatDayLong = (key) =>
  capFirst(parseDay(key).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }));
export const formatDayShort = (key) => ({
  weekday: parseDay(key).toLocaleDateString('ro-RO', { weekday: 'short' }).replace('.', ''),
  day: parseDay(key).getDate(),
  month: parseDay(key).toLocaleDateString('ro-RO', { month: 'short' }).replace('.', ''),
});

export const byDateTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);

// ── API ──────────────────────────────────────────────────────

/** Orele ocupate ale unui medic într-o zi → Set de 'HH:MM'. */
export function subscribeBusy(doctorUid, key, cb) {
  if (!isFirebaseConfigured) {
    const push = () =>
      cb(
        new Set(
          Object.values(demoStore.state.busySlots)
            .filter((s) => s.doctorUid === doctorUid && s.date === key)
            .map((s) => s.time)
        )
      );
    push();
    return demoStore.subscribe(push);
  }
  const q = query(collection(db, 'busySlots'), where('doctorUid', '==', doctorUid), where('date', '==', key));
  return onSnapshot(
    q,
    (snap) => cb(new Set(snap.docs.map((d) => d.data().time))),
    () => cb(new Set())
  );
}

/** Pacientul face o programare. Aruncă { code: 'slot-taken' } dacă ora tocmai a fost ocupată. */
export async function bookAppointment(patient, doctor, key, time, reason) {
  const sid = slotId(doctor.doctorUid, key, time);
  const data = {
    doctorUid: doctor.doctorUid,
    patientUid: patient.uid,
    doctorName: doctor.doctorName,
    doctorSpecialty: doctor.doctorSpecialty ?? '',
    hospital: doctor.hospital ?? '',
    patientName: patient.name,
    date: key,
    time,
    reason,
    slotId: sid,
    status: 'booked',
  };

  if (!isFirebaseConfigured) {
    if (demoStore.state.busySlots[sid]) throw { code: 'slot-taken' };
    const id = `a${Date.now()}`;
    demoStore.state.appointments[id] = { ...data, createdAt: new Date() };
    demoStore.state.busySlots[sid] = { doctorUid: doctor.doctorUid, date: key, time, appointmentId: id };
    demoStore.emit();
    return;
  }

  const apptRef = doc(collection(db, 'appointments'));
  const batch = writeBatch(db);
  batch.set(apptRef, { ...data, createdAt: serverTimestamp() });
  batch.set(doc(db, 'busySlots', sid), { doctorUid: doctor.doctorUid, date: key, time, appointmentId: apptRef.id });
  try {
    await batch.commit();
  } catch (e) {
    console.warn('[programare] eroare Firestore:', e?.code, e?.message);
    if (e?.code === 'permission-denied') {
      // Refuzul poate însemna „slot ocupat” SAU „reguli greșite / nepublicate”. Verificăm care e cazul.
      const taken = await getDoc(doc(db, 'busySlots', sid))
        .then((s) => s.exists())
        .catch(() => false);
      throw { code: taken ? 'slot-taken' : 'rules-denied' };
    }
    throw e;
  }
}

/** Anulare (de către pacient sau medic): programarea rămâne în istoric, slotul se eliberează. */
export async function cancelAppointment(appt, by) {
  if (!isFirebaseConfigured) {
    Object.assign(demoStore.state.appointments[appt.id], { status: 'cancelled', cancelledBy: by, cancelledAt: new Date() });
    delete demoStore.state.busySlots[appt.slotId];
    demoStore.emit();
    return;
  }
  const batch = writeBatch(db);
  batch.update(doc(db, 'appointments', appt.id), { status: 'cancelled', cancelledBy: by, cancelledAt: serverTimestamp() });
  batch.delete(doc(db, 'busySlots', appt.slotId));
  await batch.commit();
}

function subscribeAppointments(field, uid, cb) {
  if (!isFirebaseConfigured) {
    const push = () =>
      cb(
        Object.entries(demoStore.state.appointments)
          .filter(([, a]) => a[field] === uid)
          .map(([id, a]) => ({ id, ...a }))
          .sort(byDateTime)
      );
    push();
    return demoStore.subscribe(push);
  }
  const q = query(collection(db, 'appointments'), where(field, '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byDateTime)),
    () => cb([])
  );
}

export const subscribePatientAppointments = (uid, cb) => subscribeAppointments('patientUid', uid, cb);
export const subscribeDoctorAppointments = (uid, cb) => subscribeAppointments('doctorUid', uid, cb);
