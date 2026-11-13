/**
 * Tratamentul pacientului și jurnalul de doze luate.
 *
 * patients/{pid}/medications/{medId}:
 *   { name, dose, times: ['08:00','20:00'], instructions, startDate: 'AAAA-LL-ZZ', endDate: 'AAAA-LL-ZZ' | null,
 *     active, addedBy, addedByName, createdAt, stoppedAt }
 *
 * patients/{pid}/intakes/{data_medId_ora}:     ← creat când pacientul bifează „Luat”, șters la debifare
 *   { medId, date: 'AAAA-LL-ZZ', time: 'HH:MM', takenAt }
 *
 * Notă: e un plan de tratament informativ, NU o rețetă. Rețetele compensate se emit în SIPE (CNAS).
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { demoStore } from './demoStore';

const pad = (n) => String(n).padStart(2, '0');

/** Data locală ca 'AAAA-LL-ZZ'. */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

export const isActiveOn = (med, key) =>
  med.active !== false && med.startDate <= key && (!med.endDate || med.endDate >= key);

export const intakeId = (key, medId, time) => `${key}_${medId}_${time.replace(':', '')}`;

/** Dozele din ziua dată, sortate după oră: [{ key, med, time }] */
export function dosesForDay(meds, key) {
  return meds
    .filter((m) => isActiveOn(m, key))
    .flatMap((med) => med.times.map((time) => ({ key: intakeId(key, med.id, time), med, time })))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** „Întârziat” = ora a trecut de peste o oră și doza nu e bifată. */
export function isLate(time, now = new Date()) {
  const [h, m] = time.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m + 60;
}

// ── Demo helpers ─────────────────────────────────────────────
function demoBucket(name, pid) {
  if (!demoStore.state[name][pid]) demoStore.state[name][pid] = {};
  return demoStore.state[name][pid];
}
function demoSubscribe(name, pid, filter, cb) {
  const push = () =>
    cb(
      Object.entries(demoBucket(name, pid))
        .map(([id, v]) => ({ id, ...v }))
        .filter(filter)
    );
  push();
  return demoStore.subscribe(push);
}

// ── API ──────────────────────────────────────────────────────

/** Ascultă în timp real toate medicamentele pacientului. onError e apelat dacă accesul e refuzat. */
export function subscribeMedications(pid, cb, onError) {
  if (!isFirebaseConfigured) return demoSubscribe('medications', pid, () => true, cb);
  return onSnapshot(
    collection(db, 'patients', pid, 'medications'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => (onError ? onError(e) : cb([]))
  );
}

/** Medicul adaugă un medicament. durationDays = null → tratament continuu. */
export async function addMedication(doctor, pid, { name, dose, times, instructions, durationDays }) {
  const startDate = dateKey();
  const data = {
    name: name.trim(),
    dose: dose.trim(),
    times: [...times].sort(),
    instructions: instructions.trim(),
    startDate,
    endDate: durationDays ? addDays(startDate, durationDays - 1) : null,
    active: true,
    addedBy: doctor.uid,
    addedByName: doctor.name,
  };

  if (!isFirebaseConfigured) {
    const id = `m${Date.now()}`;
    demoBucket('medications', pid)[id] = { ...data, createdAt: new Date() };
    demoStore.emit();
    return;
  }
  await addDoc(collection(db, 'patients', pid, 'medications'), { ...data, createdAt: serverTimestamp() });
}

/** Medicul oprește un tratament (nu se șterge – rămâne în istoric). */
export async function stopMedication(pid, medId) {
  const change = { active: false, endDate: dateKey() };
  if (!isFirebaseConfigured) {
    Object.assign(demoBucket('medications', pid)[medId], change, { stoppedAt: new Date() });
    demoStore.emit();
    return;
  }
  await updateDoc(doc(db, 'patients', pid, 'medications', medId), { ...change, stoppedAt: serverTimestamp() });
}

/** Ascultă dozele bifate într-o zi. */
export function subscribeIntakes(pid, key, cb) {
  if (!isFirebaseConfigured) return demoSubscribe('intakes', pid, (i) => i.date === key, cb);
  const q = query(collection(db, 'patients', pid, 'intakes'), where('date', '==', key));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}

/** Pacientul bifează / debifează o doză. */
export async function setIntake(pid, { key, med, time }, taken, day = dateKey()) {
  if (!isFirebaseConfigured) {
    const bucket = demoBucket('intakes', pid);
    if (taken) bucket[key] = { medId: med.id, date: day, time, takenAt: new Date() };
    else delete bucket[key];
    demoStore.emit();
    return;
  }
  const ref = doc(db, 'patients', pid, 'intakes', key);
  if (taken) await setDoc(ref, { medId: med.id, date: day, time, takenAt: serverTimestamp() });
  else await deleteDoc(ref);
}
