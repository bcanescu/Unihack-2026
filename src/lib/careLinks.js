/**
 * Legătura medic ↔ pacient (cererea de acces și consimțământul).
 *
 * careLinks/{doctorUid_patientUid}:
 *   { doctorUid, patientUid, doctorName, doctorSpecialty, label, status, createdAt, respondedAt }
 *
 * status: 'pending'  → medicul a trimis cererea
 *         'active'   → pacientul a acceptat (abia acum medicul vede datele)
 *         'declined' → pacientul a refuzat
 *         'revoked'  → pacientul a retras accesul
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { hashCnp } from './cnp';
import { demoStore } from './demoStore';

export const linkId = (doctorUid, patientUid) => `${doctorUid}_${patientUid}`;

// „CNP •••• 0021” – singura informație despre pacient pe care medicul o vede înainte de acord.
export const cnpLabel = (cnp) => `CNP •••• ${String(cnp).slice(-4)}`;

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

export function ageFrom(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/** Caută contul unui pacient după CNP. Returnează patientUid sau null. */
export async function findPatientByCnp(cnp) {
  if (!isFirebaseConfigured) return demoStore.state.cnpToUid[cnp.trim()] ?? null;
  const hash = await hashCnp(cnp);
  const snap = await getDoc(doc(db, 'cnpIndex', hash));
  return snap.exists() ? snap.data().patientUid : null;
}

/** Legătura existentă dintre medic și pacient, dacă există. */
export async function getLink(doctorUid, patientUid) {
  const id = linkId(doctorUid, patientUid);
  if (!isFirebaseConfigured) {
    const l = demoStore.state.links[id];
    return l ? { id, ...l } : null;
  }
  const snap = await getDoc(doc(db, 'careLinks', id));
  return snap.exists() ? { id, ...snap.data() } : null;
}

/** Medicul trimite (sau retrimite, după refuz/revocare) cererea de acces. */
export function sendRequest(doctor, patientUid, cnp, existing) {
  return requestAccess(doctor, patientUid, cnpLabel(cnp), existing);
}

/** Cerere de acces cu o etichetă liberă (ex. numele din programare). */
export async function requestAccess(doctor, patientUid, label, existing) {
  const id = linkId(doctor.uid, patientUid);

  if (!isFirebaseConfigured) {
    demoStore.state.links[id] = {
      ...(demoStore.state.links[id] ?? {}),
      doctorUid: doctor.uid,
      patientUid,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty ?? '',
      label,
      status: 'pending',
      createdAt: new Date(),
      respondedAt: null,
    };
    demoStore.emit();
    return;
  }

  if (existing) {
    await updateDoc(doc(db, 'careLinks', id), {
      status: 'pending',
      label,
      createdAt: serverTimestamp(),
      respondedAt: null,
    });
  } else {
    await setDoc(doc(db, 'careLinks', id), {
      doctorUid: doctor.uid,
      patientUid,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty ?? '',
      label,
      status: 'pending',
      createdAt: serverTimestamp(),
      respondedAt: null,
    });
  }
}

function subscribeWhere(field, uid, callback) {
  if (!isFirebaseConfigured) {
    const push = () =>
      callback(
        Object.entries(demoStore.state.links)
          .filter(([, l]) => l[field] === uid)
          .map(([id, l]) => ({ id, ...l }))
      );
    push();
    return demoStore.subscribe(push);
  }
  const q = query(collection(db, 'careLinks'), where(field, '==', uid));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback([])
  );
}

/** Ascultă în timp real legăturile unui medic / ale unui pacient. Returnează funcția de dezabonare. */
export const subscribeDoctorLinks = (doctorUid, cb) => subscribeWhere('doctorUid', doctorUid, cb);
export const subscribePatientLinks = (patientUid, cb) => subscribeWhere('patientUid', patientUid, cb);

async function setStatus(id, status) {
  if (!isFirebaseConfigured) {
    Object.assign(demoStore.state.links[id], { status, respondedAt: new Date() });
    demoStore.emit();
    return;
  }
  await updateDoc(doc(db, 'careLinks', id), { status, respondedAt: serverTimestamp() });
}

/** Pacientul acceptă sau refuză o cerere. */
export const respondToRequest = (id, accept) => setStatus(id, accept ? 'active' : 'declined');

/** Pacientul retrage accesul unui medic. */
export const revokeAccess = (id) => setStatus(id, 'revoked');

/** Datele de bază ale pacientului – medicul le poate citi doar cu legătură activă. */
export async function getPatientSummary(patientUid) {
  if (!isFirebaseConfigured) return demoStore.state.patients[patientUid] ?? null;
  const snap = await getDoc(doc(db, 'patients', patientUid));
  if (!snap.exists()) return null;
  const { name, birthDate, sex } = snap.data();
  return { name, birthDate, sex };
}
