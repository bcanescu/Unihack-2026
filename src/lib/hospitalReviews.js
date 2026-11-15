/**
 * Evaluările spitalelor (condiții, curățenie, personal), lăsate de pacienți după o consultație.
 *
 * hospitalReviews/{appointmentId}  ← o evaluare pe consultație, doar de pacientul programării
 *   { hospital, patientUid, authorName, cleanliness, staff, facilities (1–5), issues: [string], comment, createdAt }
 */
import { collection, doc, getDoc, setDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { demoStore } from './demoStore';
import { toDate } from './careLinks';
import { authorNameFrom } from './doctorProfile';

export const CRITERIA = [
  { key: 'cleanliness', label: 'Curățenie', icon: 'sparkles-outline' },
  { key: 'staff', label: 'Personal', hint: 'asistente, recepție, infirmiere', icon: 'people-outline' },
  { key: 'facilities', label: 'Condiții', hint: 'săli de așteptare, dotări, confort', icon: 'business-outline' },
];

export const ISSUES = [
  'Așteptare lungă',
  'Toalete murdare',
  'Lipsă săpun / hârtie',
  'Personal nepoliticos',
  'Greu de găsit cabinetul',
  'Lipsă locuri de așteptare',
  'Prea cald / prea frig',
  'Parcare dificilă',
];

export const MAX_HOSPITAL_COMMENT = 300;

const newestFirst = (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0);

/** Evaluările unui spital, cele mai noi primele. */
export function subscribeHospitalReviews(hospital, cb) {
  if (!hospital) {
    cb([]);
    return () => {};
  }
  if (!isFirebaseConfigured) {
    const push = () =>
      cb(
        Object.entries(demoStore.state.hospitalReviews)
          .map(([id, r]) => ({ id, ...r }))
          .filter((r) => r.hospital === hospital)
          .sort(newestFirst)
      );
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    query(collection(db, 'hospitalReviews'), where('hospital', '==', hospital)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst)),
    () => cb([])
  );
}

/** Medii pe criterii + problemele raportate cel mai des. */
export function hospitalSummary(reviews) {
  const count = reviews.length;
  const avg = {};
  CRITERIA.forEach(({ key }) => {
    avg[key] = count ? reviews.reduce((s, r) => s + (r[key] || 0), 0) / count : null;
  });
  const overall = count ? CRITERIA.reduce((s, { key }) => s + avg[key], 0) / CRITERIA.length : null;
  const issueCounts = {};
  reviews.forEach((r) => (r.issues || []).forEach((i) => (issueCounts[i] = (issueCounts[i] || 0) + 1)));
  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([issue, n]) => ({ issue, n }));
  return { count, avg, overall, topIssues };
}

/** Pacientul trimite evaluarea spitalului pentru o consultație încheiată. */
export async function submitHospitalReview(patient, appt, ratings, issues, comment) {
  const data = {
    hospital: appt.hospital,
    patientUid: patient.uid,
    authorName: authorNameFrom(patient.name),
    cleanliness: ratings.cleanliness,
    staff: ratings.staff,
    facilities: ratings.facilities,
    issues: issues.slice(0, ISSUES.length),
    comment: comment.trim().slice(0, MAX_HOSPITAL_COMMENT),
  };
  if (!isFirebaseConfigured) {
    demoStore.state.hospitalReviews[appt.id] = { ...data, createdAt: new Date() };
    demoStore.emit();
    return;
  }
  const ref = doc(db, 'hospitalReviews', appt.id);
  const existing = await getDoc(ref).catch(() => null);
  if (existing?.exists()) return; // deja evaluat – nu blocăm recenzia medicului
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
}
