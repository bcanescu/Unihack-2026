/**
 * Analize medicale.
 *
 * patients/{pid}/labs/{labId}:
 *   { title, labName, date: 'AAAA-LL-ZZ', results: [{ name, value, unit, min, max }],
 *     note, file: { path, name } | null, addedBy, addedByName, createdAt }
 *
 * Valorile structurate permit evidențierea automată a celor din afara limitelor.
 * PDF-ul buletinului e opțional (Firebase Storage → planul Blaze).
 */
import { collection, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './firebase';
import { demoStore } from './demoStore';
import { dateKey } from './medications';

// Valori de referință ORIENTATIVE (adulți). Diferă între laboratoare – medicul le poate edita.
export const LAB_PANELS = [
  {
    name: 'Hemoleucogramă',
    tests: [
      { name: 'Hemoglobină', unit: 'g/dL', min: 12, max: 16 },
      { name: 'Hematocrit', unit: '%', min: 36, max: 46 },
      { name: 'Leucocite', unit: '10³/µL', min: 4, max: 10 },
      { name: 'Trombocite', unit: '10³/µL', min: 150, max: 400 },
    ],
  },
  {
    name: 'Glicemie',
    tests: [
      { name: 'Glicemie a jeun', unit: 'mg/dL', min: 70, max: 100 },
      { name: 'HbA1c', unit: '%', min: 4, max: 5.6 },
    ],
  },
  {
    name: 'Profil lipidic',
    tests: [
      { name: 'Colesterol total', unit: 'mg/dL', min: null, max: 200 },
      { name: 'LDL colesterol', unit: 'mg/dL', min: null, max: 100 },
      { name: 'HDL colesterol', unit: 'mg/dL', min: 40, max: null },
      { name: 'Trigliceride', unit: 'mg/dL', min: null, max: 150 },
    ],
  },
  {
    name: 'Funcție renală',
    tests: [
      { name: 'Creatinină', unit: 'mg/dL', min: 0.6, max: 1.2 },
      { name: 'Uree', unit: 'mg/dL', min: 15, max: 45 },
    ],
  },
  {
    name: 'Funcție hepatică',
    tests: [
      { name: 'ALT (TGP)', unit: 'U/L', min: null, max: 40 },
      { name: 'AST (TGO)', unit: 'U/L', min: null, max: 40 },
    ],
  },
];

/** 'low' | 'high' | 'normal' | null (fără valoare) */
export function flagOf(r) {
  if (r.value == null || Number.isNaN(r.value)) return null;
  if (r.min != null && r.value < r.min) return 'low';
  if (r.max != null && r.value > r.max) return 'high';
  return 'normal';
}

export const outOfRangeCount = (lab) => lab.results.filter((r) => ['low', 'high'].includes(flagOf(r))).length;

export function rangeText(r) {
  if (r.min != null && r.max != null) return `${r.min}–${r.max}`;
  if (r.max != null) return `< ${r.max}`;
  if (r.min != null) return `> ${r.min}`;
  return '—';
}

export const formatLabDate = (key) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

/** Parsează un număr scris cu virgulă sau punct. Returnează null dacă e gol / invalid. */
export function parseNum(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

// ── API ──────────────────────────────────────────────────────

function demoLabs(pid) {
  if (!demoStore.state.labs[pid]) demoStore.state.labs[pid] = {};
  return demoStore.state.labs[pid];
}

const newestFirst = (a, b) => b.date.localeCompare(a.date);

export function subscribeLabs(pid, cb, onError) {
  if (!isFirebaseConfigured) {
    const push = () =>
      cb(
        Object.entries(demoLabs(pid))
          .map(([id, l]) => ({ id, ...l }))
          .sort(newestFirst)
      );
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    collection(db, 'patients', pid, 'labs'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst)),
    (e) => (onError ? onError(e) : cb([]))
  );
}

export async function getLab(pid, labId) {
  if (!isFirebaseConfigured) {
    const l = demoLabs(pid)[labId];
    return l ? { id: labId, ...l } : null;
  }
  const snap = await getDoc(doc(db, 'patients', pid, 'labs', labId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Medicul salvează un buletin. pdfAsset = rezultatul din DocumentPicker (opțional). */
export async function addLab(doctor, pid, { title, labName, date, results, note }, pdfAsset) {
  const base = {
    title: title.trim(),
    labName: labName.trim(),
    date: date || dateKey(),
    results,
    note: note.trim(),
    addedBy: doctor.uid,
    addedByName: doctor.name,
  };

  if (!isFirebaseConfigured) {
    const id = `l${Date.now()}`;
    demoLabs(pid)[id] = {
      ...base,
      file: pdfAsset ? { path: pdfAsset.uri, name: pdfAsset.name, demoUri: pdfAsset.uri } : null,
      createdAt: new Date(),
    };
    demoStore.emit();
    return id;
  }

  const labRef = doc(collection(db, 'patients', pid, 'labs'));
  let file = null;
  if (pdfAsset) {
    const path = `patients/${pid}/labs/${labRef.id}.pdf`;
    const blob = await (await fetch(pdfAsset.uri)).blob();
    await uploadBytes(ref(storage, path), blob, { contentType: 'application/pdf' });
    file = { path, name: pdfAsset.name ?? 'buletin.pdf' };
  }
  await setDoc(labRef, { ...base, file, createdAt: serverTimestamp() });
  return labRef.id;
}

/**
 * Pacientul își adaugă singur analize vechi (de la orice laborator), prin poză + OCR sau manual.
 * Sunt marcate `source: 'patient'` – medicul vede că nu au fost introduse de un medic.
 */
export async function addPatientLab(patient, { title, labName, date, results }) {
  const data = {
    title: title.trim(),
    labName: labName.trim(),
    date,
    results,
    note: '',
    file: null,
    source: 'patient',
    addedBy: patient.uid,
    addedByName: patient.name,
  };
  if (!isFirebaseConfigured) {
    const id = `l${Date.now()}${Math.floor(Math.random() * 1000)}`;
    demoLabs(patient.uid)[id] = { ...data, createdAt: new Date() };
    demoStore.emit();
    return id;
  }
  const labRef = doc(collection(db, 'patients', patient.uid, 'labs'));
  await setDoc(labRef, { ...data, createdAt: serverTimestamp() });
  return labRef.id;
}

// Istoric de exemplu (laboratoare fictive) – ca graficele de evoluție să aibă ce arăta la prezentare.
export const SAMPLE_HISTORY = [
  {
    title: 'Analize de rutină',
    labName: 'Laborator Central Timișoara',
    date: '2024-11-20',
    results: [
      { name: 'Glicemie a jeun', value: 98, unit: 'mg/dL', min: 70, max: 100 },
      { name: 'HbA1c', value: 5.5, unit: '%', min: 4, max: 5.6 },
      { name: 'Colesterol total', value: 241, unit: 'mg/dL', min: null, max: 200 },
      { name: 'LDL colesterol', value: 158, unit: 'mg/dL', min: null, max: 100 },
    ],
  },
  {
    title: 'Control',
    labName: 'Clinica Medicală Vest',
    date: '2025-05-14',
    results: [
      { name: 'Glicemie a jeun', value: 104, unit: 'mg/dL', min: 70, max: 100 },
      { name: 'HbA1c', value: 5.7, unit: '%', min: 4, max: 5.6 },
      { name: 'Colesterol total', value: 232, unit: 'mg/dL', min: null, max: 200 },
      { name: 'LDL colesterol', value: 149, unit: 'mg/dL', min: null, max: 100 },
    ],
  },
  {
    title: 'Analize anuale',
    labName: 'Policlinica Nord',
    date: '2025-11-03',
    results: [
      { name: 'Glicemie a jeun', value: 112, unit: 'mg/dL', min: 70, max: 100 },
      { name: 'HbA1c', value: 5.9, unit: '%', min: 4, max: 5.6 },
      { name: 'Colesterol total', value: 221, unit: 'mg/dL', min: null, max: 200 },
      { name: 'LDL colesterol', value: 141, unit: 'mg/dL', min: null, max: 100 },
    ],
  },
  {
    title: 'Control după tratament',
    labName: 'Laborator Central Timișoara',
    date: '2026-05-21',
    results: [
      { name: 'Glicemie a jeun', value: 109, unit: 'mg/dL', min: 70, max: 100 },
      { name: 'HbA1c', value: 5.8, unit: '%', min: 4, max: 5.6 },
      { name: 'Colesterol total', value: 205, unit: 'mg/dL', min: null, max: 200 },
      { name: 'LDL colesterol', value: 128, unit: 'mg/dL', min: null, max: 100 },
    ],
  },
];

export async function addSampleHistory(patient) {
  for (const lab of SAMPLE_HISTORY) {
    await addPatientLab(patient, { ...lab, labName: `${lab.labName} (exemplu)` });
  }
}

/** URL-ul PDF-ului se cere doar la deschidere – Storage verifică accesul în acel moment. */
export async function getLabFileUrl(lab) {
  if (!lab.file) return null;
  if (lab.file.demoUri) return lab.file.demoUri;
  return getDownloadURL(ref(storage, lab.file.path));
}
