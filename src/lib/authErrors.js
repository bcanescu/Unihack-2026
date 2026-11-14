// Traduce codurile de eroare Firebase Auth în mesaje clare, în română.
// Nu spunem niciodată dacă emailul există sau nu (protecție împotriva enumerării conturilor).
const messages = {
  'auth/invalid-email': 'Adresa de email nu este validă.',
  'auth/invalid-credential': 'Email sau parolă incorectă.',
  'auth/wrong-password': 'Email sau parolă incorectă.',
  'auth/user-not-found': 'Email sau parolă incorectă.',
  'auth/user-disabled': 'Acest cont a fost dezactivat.',
  'auth/too-many-requests': 'Prea multe încercări. Încearcă din nou peste câteva minute.',
  'auth/network-request-failed': 'Nu există conexiune la internet.',
  'auth/email-already-in-use': 'Există deja un cont cu acest email. Încearcă să te autentifici.',
  'auth/weak-password': 'Parola trebuie să aibă cel puțin 6 caractere.',
  'app/cnp-taken': 'Acest CNP este deja asociat unui cont. Dacă e al tău, autentifică-te.',
  'app/no-role': 'Contul nu are un rol atribuit. Contactează administratorul.',
  'app/doctor-pending': 'Cererea ta de cont de medic este în curs de verificare. Vei putea intra după aprobare.',
  'app/doctor-rejected': 'Cererea de cont de medic a fost respinsă. Contactează administratorul.',
  'app/doctor-disabled': 'Contul de medic a fost dezactivat. Contactează administratorul.',
};

export function authErrorMessage(error) {
  if (error?.code === 'app/invalid-cnp') return error.message;
  return messages[error?.code] ?? 'A apărut o eroare. Încearcă din nou.';
}
