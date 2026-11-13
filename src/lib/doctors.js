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

// Medici fictivi pentru modul demo. Spitalele sunt din Timișoara.
const DEMO_DOCTORS = [
  { uid: 'medic@demo.ro', name: 'Dr. Ana Ionescu', specialty: 'Cardiologie', hospital: 'Institutul de Boli Cardiovasculare Timișoara' },
  { uid: 'demo-doc-2', name: 'Dr. Mihai Popa', specialty: 'Cardiologie', hospital: 'Spitalul Clinic Județean de Urgență Timișoara' },
  { uid: 'demo-doc-3', name: 'Dr. Elena Radu', specialty: 'Medicină internă', hospital: 'Spitalul Clinic Județean de Urgență Timișoara' },
  { uid: 'demo-doc-4', name: 'Dr. Andrei Stan', specialty: 'Neurologie', hospital: 'Spitalul Clinic Județean de Urgență Timișoara' },
  { uid: 'demo-doc-5', name: 'Dr. Ioana Marin', specialty: 'Endocrinologie', hospital: 'Spitalul Clinic Municipal de Urgență Timișoara' },
  { uid: 'demo-doc-6', name: 'Dr. Cristian Dobre', specialty: 'Pediatrie', hospital: 'Spitalul Clinic de Urgență pentru Copii „Louis Țurcanu”' },
  { uid: 'demo-doc-7', name: 'Dr. Laura Vlad', specialty: 'Dermatologie', hospital: 'Spitalul Clinic Municipal de Urgență Timișoara' },
];

let cache = null;

/** Lista medicilor verificați: [{ uid, name, specialty, hospital }] */
export async function getDoctors() {
  if (!isFirebaseConfigured) return DEMO_DOCTORS;
  if (cache) return cache;
  const snap = await getDocs(query(collection(db, 'doctors'), where('verified', '==', true)));
  cache = snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  return cache;
}

export const uniqueSorted = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ro'));
