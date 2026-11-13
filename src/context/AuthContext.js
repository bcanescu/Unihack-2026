import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut as fbSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { validateCnp, hashCnp } from '../lib/cnp';

const AuthContext = createContext(null);

// Conturi folosite doar în modul demo (fără Firebase configurat).
export const DEMO_ACCOUNTS = [
  { email: 'pacient@demo.ro', password: 'demo1234', role: 'patient', name: 'Ion Popescu' },
  { email: 'medic@demo.ro', password: 'demo1234', role: 'doctor', name: 'Dr. Ana Ionescu' },
];

/**
 * Rolul NU se deduce din email. Se citește din documentul users/{uid}
 * (câmpul `role`: "patient" | "doctor"), pe care regulile Firestore
 * nu permit utilizatorului să și-l schimbe singur.
 */
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { uid, role: data.role, name: data.name, status: data.status };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);    // { uid, email, role, name }
  const [loading, setLoading] = useState(true);
  // În timpul înregistrării, contul există în Auth înainte să existe profilul în Firestore.
  // Fără acest flag, listener-ul de mai jos ar vedea „cont fără rol” și l-ar deloga.
  const registeringRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (registeringRef.current) return;
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await loadProfile(fbUser.uid);
        // Medicii neverificați nu intră în aplicație.
        if (!profile?.role || (profile.role === 'doctor' && profile.status !== 'verified')) {
          await fbSignOut(auth);
          setUser(null);
        } else {
          setUser({ email: fbUser.email, ...profile });
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  async function signIn(email, password) {
    const cleanEmail = email.trim().toLowerCase();

    if (!isFirebaseConfigured) {
      const demo = DEMO_ACCOUNTS.find((a) => a.email === cleanEmail && a.password === password);
      if (!demo) throw { code: 'auth/invalid-credential' };
      setUser({ uid: demo.email, email: demo.email, role: demo.role, name: demo.name });
      return;
    }

    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    // Verificăm rolul aici ca să putem afișa un mesaj clar pe ecranul de login.
    const profile = await loadProfile(cred.user.uid);
    if (!profile?.role) {
      await fbSignOut(auth);
      throw { code: 'app/no-role' };
    }
    if (profile.role === 'doctor' && profile.status !== 'verified') {
      await fbSignOut(auth);
      throw { code: 'app/doctor-pending' };
    }
    // onAuthStateChanged setează utilizatorul, iar _layout face redirecționarea.
  }

  /**
   * Înregistrare pacient. Scrie atomic (un singur batch):
   *  - users/{uid}       { role: 'patient', name }
   *  - patients/{uid}    { name, cnpHash, birthDate, sex }   ← fără CNP în clar
   *  - cnpIndex/{hash}   { patientUid }                      ← medicul îl găsește după CNP
   * Dacă CNP-ul e deja folosit, regulile Firestore refuză batch-ul și ștergem contul creat.
   */
  async function signUp({ name, email, cnp, password }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cnpInfo = validateCnp(cnp);
    if (!cnpInfo.valid) throw { code: 'app/invalid-cnp', message: cnpInfo.error };

    if (!isFirebaseConfigured) {
      setUser({ uid: cleanEmail, email: cleanEmail, role: 'patient', name: cleanName });
      return;
    }

    registeringRef.current = true;
    let created = null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      created = cred.user;
      const uid = created.uid;
      const cnpHash = await hashCnp(cnp);

      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), { role: 'patient', name: cleanName, createdAt: serverTimestamp() });
      batch.set(doc(db, 'patients', uid), {
        name: cleanName,
        cnpHash,
        birthDate: cnpInfo.birthDate,
        sex: cnpInfo.sex,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'cnpIndex', cnpHash), { patientUid: uid });
      await batch.commit();

      setUser({ uid, email: cleanEmail, role: 'patient', name: cleanName });
    } catch (e) {
      if (created && e?.code === 'permission-denied') {
        // Cel mai probabil CNP-ul are deja un cont. Ștergem contul Auth rămas fără profil.
        await deleteUser(created).catch(() => {});
        throw { code: 'app/cnp-taken' };
      }
      if (created) await deleteUser(created).catch(() => {});
      throw e;
    } finally {
      registeringRef.current = false;
    }
  }

  async function signOut() {
    if (isFirebaseConfigured) await fbSignOut(auth);
    setUser(null);
  }

  async function resetPassword(email) {
    if (!isFirebaseConfigured) return; // în demo nu trimitem nimic
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>');
  return ctx;
}
