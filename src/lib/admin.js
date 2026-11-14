/**
 * Funcții pentru administrator: aprobarea medicilor și gestionarea directorului de medici.
 *
 * doctorApplications/{uid}: { firstName, lastName, name, email, specialty, hospital, parafa, file,
 *                             status: 'pending'|'approved'|'rejected', reason, source, createdAt,
 *                             reviewedAt, reviewedBy }
 * La aprobare se scriu automat, cu câmpurile corecte:
 *   users/{uid}   → status: 'verified'
 *   doctors/{uid} → { name, specialty, hospital, verified: true }   (apare în căutarea pacienților)
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { collection, doc, onSnapshot, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { db, storage, firebaseConfig, isFirebaseConfigured } from './firebase';
import { demoStore } from './demoStore';

const byNewest = (a, b) => {
  const t = (x) => (x?.toDate ? x.toDate() : new Date(x ?? 0)).getTime();
  return t(b.createdAt) - t(a.createdAt);
};

/** Cererile de înscriere (toate statusurile), cele mai noi primele. */
export function subscribeApplications(cb) {
  if (!isFirebaseConfigured) {
    const push = () =>
      cb(
        Object.entries(demoStore.state.applications)
          .map(([uid, a]) => ({ uid, ...a }))
          .sort(byNewest)
      );
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    collection(db, 'doctorApplications'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort(byNewest)),
    () => cb([])
  );
}

/** Toți medicii din director (activi și dezactivați). */
export function subscribeAllDoctors(cb) {
  if (!isFirebaseConfigured) {
    const push = () =>
      cb(
        Object.entries(demoStore.state.doctors)
          .map(([uid, d]) => ({ uid, ...d }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
      );
    push();
    return demoStore.subscribe(push);
  }
  return onSnapshot(
    collection(db, 'doctors'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name, 'ro'))),
    () => cb([])
  );
}

export async function approveApplication(app, admin) {
  const profile = { name: app.name, specialty: app.specialty, hospital: app.hospital };

  if (!isFirebaseConfigured) {
    Object.assign(demoStore.state.applications[app.uid], { status: 'approved', reviewedAt: new Date(), reviewedBy: admin.uid });
    if (demoStore.state.accounts[app.uid]) demoStore.state.accounts[app.uid].status = 'verified';
    demoStore.state.doctors[app.uid] = { ...profile, verified: true };
    demoStore.emit();
    return;
  }
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', app.uid), { status: 'verified', ...profile });
  batch.set(doc(db, 'doctors', app.uid), { ...profile, verified: true });
  batch.update(doc(db, 'doctorApplications', app.uid), {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: admin.uid,
  });
  await batch.commit();
}

export async function rejectApplication(app, reason, admin) {
  if (!isFirebaseConfigured) {
    Object.assign(demoStore.state.applications[app.uid], { status: 'rejected', reason, reviewedAt: new Date(), reviewedBy: admin.uid });
    if (demoStore.state.accounts[app.uid]) demoStore.state.accounts[app.uid].status = 'rejected';
    demoStore.emit();
    return;
  }
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', app.uid), { status: 'rejected' });
  batch.update(doc(db, 'doctorApplications', app.uid), {
    status: 'rejected',
    reason,
    reviewedAt: serverTimestamp(),
    reviewedBy: admin.uid,
  });
  await batch.commit();
}

/** Dezactivează / reactivează un medic: dispare din căutare și nu se mai poate autentifica. */
export async function setDoctorActive(doctor, active) {
  if (!isFirebaseConfigured) {
    demoStore.state.doctors[doctor.uid].verified = active;
    if (demoStore.state.accounts[doctor.uid]) demoStore.state.accounts[doctor.uid].status = active ? 'verified' : 'disabled';
    demoStore.emit();
    return;
  }
  const batch = writeBatch(db);
  batch.update(doc(db, 'doctors', doctor.uid), { verified: active });
  batch.update(doc(db, 'users', doctor.uid), { status: active ? 'verified' : 'disabled' });
  await batch.commit();
}

// Parolă temporară aleatoare – medicul nu o folosește; își setează propria parolă din emailul de resetare.
function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%';
  let out = '';
  for (let i = 0; i < 20; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Adminul creează direct un cont de medic, deja aprobat.
 * Contul se creează printr-o a DOUA instanță Firebase, fără persistență: astfel adminul nu e delogat
 * (createUserWithEmailAndPassword autentifică automat contul nou în instanța în care rulează).
 * Medicul primește pe email un link pentru a-și seta parola.
 */
export async function createDoctorDirect(admin, { firstName, lastName, email, specialty, hospital, parafa }) {
  const cleanEmail = email.trim().toLowerCase();
  const name = `Dr. ${firstName.trim()} ${lastName.trim()}`;
  const profile = { name, specialty, hospital };
  const application = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    name,
    email: cleanEmail,
    specialty,
    hospital,
    parafa: parafa.trim().toUpperCase(),
    file: null,
    status: 'approved',
    source: 'admin',
  };

  if (!isFirebaseConfigured) {
    if (demoStore.state.accounts[cleanEmail]) throw { code: 'auth/email-already-in-use' };
    demoStore.state.accounts[cleanEmail] = { password: 'demo1234', role: 'doctor', status: 'verified', ...profile };
    demoStore.state.doctors[cleanEmail] = { ...profile, verified: true };
    demoStore.state.applications[cleanEmail] = { ...application, createdAt: new Date(), reviewedAt: new Date(), reviewedBy: admin.uid };
    demoStore.emit();
    return { uid: cleanEmail, demoPassword: 'demo1234' };
  }

  const secondary = getApps().some((a) => a.name === 'admin-secondary')
    ? getApp('admin-secondary')
    : initializeApp(firebaseConfig, 'admin-secondary');
  let secondaryAuth;
  try {
    secondaryAuth = initializeAuth(secondary, { persistence: inMemoryPersistence });
  } catch {
    secondaryAuth = getAuth(secondary);
  }

  const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, randomPassword());
  const uid = cred.user.uid;
  await signOut(secondaryAuth);

  // Documentele le scrie adminul (instanța principală), conform regulilor.
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), { role: 'doctor', status: 'verified', ...profile, createdAt: serverTimestamp() });
  batch.set(doc(db, 'doctors', uid), { ...profile, verified: true });
  batch.set(doc(db, 'doctorApplications', uid), {
    ...application,
    createdAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
    reviewedBy: admin.uid,
  });
  await batch.commit();

  // Emailul de setare a parolei vine de la Firebase (șablonul „Password reset”).
  await sendPasswordResetEmail(secondaryAuth, cleanEmail);
  return { uid };
}

export async function getApplicationFileUrl(app) {
  if (!app.file) return null;
  if (app.file.demoUri) return app.file.demoUri;
  return getDownloadURL(ref(storage, app.file.path));
}
