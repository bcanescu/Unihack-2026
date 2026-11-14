/**
 * Profilul public al medicului și recenziile pacienților.
 *
 * doctors/{uid} (câmpuri publice editabile de medic):
 *   { hospitalRole, experienceYears, bio, education: [string], achievements: [string] }
 *   (name, specialty, hospital, verified rămân gestionate de administrator)
 *
 * reviews/{appointmentId}  ← ID = programarea, deci o singură recenzie pe consultație
 *   { doctorUid, patientUid, authorName: "Ion P.", rating: 1–5, comment, appointmentDate, reason, createdAt }
 */
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { demoStore } from './demoStore';
import { toDate } from './careLinks';

export const PUBLIC_FIELDS = ['hospitalRole', 'experienceYears', 'bio', 'education', 'achievements'];
export const MIN_COMMENT = 3;
export const MAX_COMMENT = 500;

// ── Profil public ────────────────────────────────────────────────────────────

export function subscribeDoctorPublic(uid, cb) {
  if (!isFirebaseConfigured) {
    const push = () => cb(demoStore.state.doctors[uid] ? { uid, ...demoStore.state.doctors[uid] } : null);
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    doc(db, 'doctors', uid),
    (snap) => cb(snap.exists() ? { uid, ...snap.data() } : null),
    () => cb(null)
  );
}

/** Medicul își actualizează profilul public (doar câmpurile permise). */
export async function updateDoctorPublic(uid, data) {
  const clean = {
    hospitalRole: String(data.hospitalRole ?? '').trim().slice(0, 120),
    experienceYears: data.experienceYears === '' || data.experienceYears == null ? null : Math.max(0, Math.min(60, Math.round(Number(data.experienceYears)))),
    bio: String(data.bio ?? '').trim().slice(0, 800),
    education: (data.education ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 10),
    achievements: (data.achievements ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 10),
  };
  if (!isFirebaseConfigured) {
    demoStore.state.doctors[uid] = { ...(demoStore.state.doctors[uid] ?? {}), ...clean };
    demoStore.emit();
    return;
  }
  await updateDoc(doc(db, 'doctors', uid), clean);
}

// ── Recenzii ─────────────────────────────────────────────────────────────────

/** „Ion Popescu” → „Ion P.” (nu afișăm numele complet al pacientului). */
export function authorNameFrom(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Pacient';
  if (parts.length === 1) return parts[0].slice(0, 30);
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`.slice(0, 30);
}

const newestFirst = (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0);

function demoReviews(filter) {
  return Object.entries(demoStore.state.reviews)
    .map(([id, r]) => ({ id, ...r }))
    .filter(filter)
    .sort(newestFirst);
}

/** Recenziile unui medic, cele mai noi primele. */
export function subscribeDoctorReviews(doctorUid, cb) {
  if (!isFirebaseConfigured) {
    const push = () => cb(demoReviews((r) => r.doctorUid === doctorUid));
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    query(collection(db, 'reviews'), where('doctorUid', '==', doctorUid)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst)),
    () => cb([])
  );
}

/** Recenziile scrise de un pacient (ca să știm ce programări au deja recenzie). */
export function subscribeMyReviews(patientUid, cb) {
  if (!isFirebaseConfigured) {
    const push = () => cb(demoReviews((r) => r.patientUid === patientUid));
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    query(collection(db, 'reviews'), where('patientUid', '==', patientUid)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}

/** Media notelor pentru mai mulți medici: { [doctorUid]: { avg, count } } */
export function subscribeRatings(doctorUids, cb) {
  const uids = [...new Set(doctorUids)].filter(Boolean).slice(0, 30);
  const summarize = (list) => {
    const out = {};
    list.forEach((r) => {
      const s = (out[r.doctorUid] = out[r.doctorUid] || { sum: 0, count: 0 });
      s.sum += r.rating;
      s.count += 1;
    });
    Object.values(out).forEach((s) => (s.avg = s.sum / s.count));
    return out;
  };
  if (uids.length === 0) {
    cb({});
    return () => {};
  }
  if (!isFirebaseConfigured) {
    const push = () => cb(summarize(demoReviews((r) => uids.includes(r.doctorUid))));
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    query(collection(db, 'reviews'), where('doctorUid', 'in', uids)),
    (snap) => cb(summarize(snap.docs.map((d) => d.data()))),
    () => cb({})
  );
}

export function ratingSummary(reviews) {
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach((r) => dist[r.rating - 1]++);
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : null;
  return { avg, count, dist };
}

/** O programare s-a încheiat dacă au trecut 30 de minute de la ora ei și nu a fost anulată. */
export function isAppointmentFinished(appt, now = new Date()) {
  if (appt.status !== 'booked') return false;
  const [y, m, d] = appt.date.split('-').map(Number);
  const [h, mi] = appt.time.split(':').map(Number);
  return now.getTime() > new Date(y, m - 1, d, h, mi).getTime() + 30 * 60000;
}

/** Pacientul trimite recenzia pentru o programare încheiată. */
export async function submitReview(patient, appt, rating, comment) {
  const data = {
    doctorUid: appt.doctorUid,
    patientUid: patient.uid,
    authorName: authorNameFrom(patient.name),
    rating,
    comment: comment.trim().slice(0, MAX_COMMENT),
    appointmentDate: appt.date,
    reason: appt.reason ?? '',
  };
  if (!isFirebaseConfigured) {
    if (demoStore.state.reviews[appt.id]) throw { code: 'already-reviewed' };
    demoStore.state.reviews[appt.id] = { ...data, createdAt: new Date() };
    demoStore.emit();
    return;
  }
  const ref = doc(db, 'reviews', appt.id);
  const existing = await getDoc(ref).catch(() => null);
  if (existing?.exists()) throw { code: 'already-reviewed' };
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
}

export const formatReviewDate = (v) =>
  toDate(v)?.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '';
