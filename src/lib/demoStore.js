// Bază de date în memorie pentru modul demo (fără Firebase).
// Datele se pierd la reîncărcarea aplicației. Folosită doar când .env lipsește.

const state = {
  patients: {
    'pacient@demo.ro': { name: 'Ion Popescu', birthDate: '1997-05-23', sex: 'M' },
  },
  cnpToUid: { '1970523350012': 'pacient@demo.ro' }, // în demo păstrăm CNP-ul local, doar în memorie
  links: {},
  medications: {}, // patientUid → { medId → medicament }
  intakes: {},     // patientUid → { intakeId → doză bifată }
  labs: {},        // patientUid → { labId → buletin de analize }
  // appointmentId → programare. Pornim cu o consultație încheiată ieri, ca să se poată lăsa o recenzie în demo.
  appointments: {
    'demo-a-past': {
      doctorUid: 'medic@demo.ro',
      patientUid: 'pacient@demo.ro',
      doctorName: 'Dr. Ana Ionescu',
      doctorSpecialty: 'Cardiologie',
      hospital: 'Institutul de Boli Cardiovasculare Timișoara',
      patientName: 'Ion Popescu',
      date: (() => {
        const d = new Date(Date.now() - 86400000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      time: '10:00',
      reason: 'Consult',
      slotId: 'demo-past-slot',
      status: 'booked',
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  },
  busySlots: {},   // slotId → { doctorUid, date, time, appointmentId }
  // Directorul public de medici (doctors/{uid} în Firebase). Medici fictivi, spitale reale din Timișoara.
  doctors: {
    'medic@demo.ro': {
      name: 'Dr. Ana Ionescu',
      specialty: 'Cardiologie',
      hospital: 'Institutul de Boli Cardiovasculare Timișoara',
      verified: true,
      hospitalRole: 'Medic primar cardiolog, coordonator Compartiment Insuficiență Cardiacă',
      experienceYears: 14,
      bio: 'Mă ocup de prevenția și tratamentul bolilor cardiovasculare, cu accent pe hipertensiune și insuficiență cardiacă. Îmi place să explic pe înțeles fiecare analiză și fiecare tratament.',
      education: [
        'Universitatea de Medicină și Farmacie „Victor Babeș” Timișoara – Medicină generală',
        'Rezidențiat Cardiologie – Institutul de Boli Cardiovasculare Timișoara',
        'Competență în ecocardiografie',
      ],
      achievements: ['Peste 3.000 de ecocardiografii efectuate', 'Lector la conferințe naționale de cardiologie'],
    },
    'demo-doc-2': { name: 'Dr. Mihai Popa', specialty: 'Cardiologie', hospital: 'Spitalul Clinic Județean de Urgență Timișoara', verified: true },
    'demo-doc-3': { name: 'Dr. Elena Radu', specialty: 'Medicină internă', hospital: 'Spitalul Clinic Județean de Urgență Timișoara', verified: true },
    'demo-doc-4': {
      name: 'Dr. Andrei Stan',
      specialty: 'Neurologie',
      hospital: 'Spitalul Clinic Județean de Urgență Timișoara',
      verified: true,
      hospitalRole: 'Medic specialist neurolog',
      experienceYears: 7,
      bio: 'Consultații pentru cefalee, amețeli și afecțiuni ale sistemului nervos periferic.',
      education: ['UMF „Victor Babeș” Timișoara – Medicină generală', 'Rezidențiat Neurologie'],
      achievements: [],
    },
    'demo-doc-5': { name: 'Dr. Ioana Marin', specialty: 'Endocrinologie', hospital: 'Spitalul Clinic Municipal de Urgență Timișoara', verified: true },
    'demo-doc-6': { name: 'Dr. Cristian Dobre', specialty: 'Pediatrie', hospital: 'Spitalul Clinic de Urgență pentru Copii „Louis Țurcanu”', verified: true },
    'demo-doc-7': { name: 'Dr. Laura Vlad', specialty: 'Dermatologie', hospital: 'Spitalul Clinic Municipal de Urgență Timișoara', verified: true },
  },
  applications: {}, // uid → cerere de înscriere medic (doctorApplications/{uid})
  // Recenzii (reviews/{appointmentId}) – exemple fictive pentru modul demo.
  reviews: {
    'demo-r1': { doctorUid: 'medic@demo.ro', patientUid: 'demo-p1', authorName: 'Maria D.', rating: 5, comment: 'Foarte răbdătoare, mi-a explicat fiecare analiză și am plecat liniștită.', appointmentDate: '2026-10-02', reason: 'Consult', createdAt: new Date('2026-10-02T14:00:00') },
    'demo-r2': { doctorUid: 'medic@demo.ro', patientUid: 'demo-p2', authorName: 'Gheorghe T.', rating: 4, comment: 'Profesionistă și atentă. Am așteptat puțin peste ora programării.', appointmentDate: '2026-10-21', reason: 'Control', createdAt: new Date('2026-10-21T11:30:00') },
    'demo-r3': { doctorUid: 'medic@demo.ro', patientUid: 'demo-p3', authorName: 'Elena V.', rating: 5, comment: 'Recomand! Mi-a ajustat tratamentul și tensiunea e în sfârșit în limite.', appointmentDate: '2026-11-04', reason: 'Tratament', createdAt: new Date('2026-11-04T10:00:00') },
    'demo-r4': { doctorUid: 'demo-doc-4', patientUid: 'demo-p1', authorName: 'Maria D.', rating: 4, comment: 'Consult amănunțit, recomandări clare.', appointmentDate: '2026-09-15', reason: 'Consult', createdAt: new Date('2026-09-15T09:00:00') },
  },
  accounts: {},     // email → cont creat în demo (medici înscriși / adăugați de admin)
};

const listeners = new Set();

export const demoStore = {
  state,
  emit() {
    listeners.forEach((fn) => fn());
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  addPatient(uid, { name, birthDate, sex }, cnp) {
    if (state.cnpToUid[cnp]) return false;
    state.patients[uid] = { name, birthDate, sex };
    state.cnpToUid[cnp] = uid;
    return true;
  },
};
