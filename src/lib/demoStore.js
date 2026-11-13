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
  appointments: {}, // appointmentId → programare
  busySlots: {},   // slotId → { doctorUid, date, time, appointmentId }
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
