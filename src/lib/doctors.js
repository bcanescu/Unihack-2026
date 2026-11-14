/**
 * Directorul public de medici – permite programarea la un medic fără legătură prealabilă.
 *
 * doctors/{uid}: { name, specialty, hospital, verified: true }
 *   - ID-ul documentului = UID-ul contului de medic din Authentication.
 *   - Se creează de administrator (consola Firebase), după verificarea parafei.
 *   - Conține doar date profesionale publice; poate fi citit de orice utilizator logat.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { demoStore } from './demoStore';

// Cache scurt (30 s), ca un medic aprobat de admin să apară repede în căutare.
let cache = null;
let cacheAt = 0;

/** Lista medicilor verificați: [{ uid, name, specialty, hospital }] */
export async function getDoctors() {
  if (!isFirebaseConfigured) {
    return Object.entries(demoStore.state.doctors)
      .filter(([, d]) => d.verified)
      .map(([uid, d]) => ({ uid, ...d }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }
  if (cache && Date.now() - cacheAt < 30000) return cache;
  const snap = await getDocs(query(collection(db, 'doctors'), where('verified', '==', true)));
  cache = snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  cacheAt = Date.now();
  return cache;
}

export const uniqueSorted = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ro'));
