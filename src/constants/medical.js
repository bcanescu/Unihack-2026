// Liste comune folosite la înscrierea medicilor și la căutarea pentru programări.
// Se aleg din listă (nu se scriu de mână) ca filtrele să funcționeze fără greșeli de scriere.

export const SPECIALTIES = [
  'Alergologie',
  'Cardiologie',
  'Chirurgie generală',
  'Dermatologie',
  'Endocrinologie',
  'Gastroenterologie',
  'Medicină de familie',
  'Medicină internă',
  'Nefrologie',
  'Neurologie',
  'Obstetrică-Ginecologie',
  'Oftalmologie',
  'Oncologie',
  'Ortopedie',
  'ORL',
  'Pediatrie',
  'Pneumologie',
  'Psihiatrie',
  'Reumatologie',
  'Urologie',
];

// Spitale din Timișoara (lista se poate extinde).
export const HOSPITALS = [
  'Spitalul Clinic Județean de Urgență Timișoara',
  'Spitalul Clinic Municipal de Urgență Timișoara',
  'Institutul de Boli Cardiovasculare Timișoara',
  'Spitalul Clinic de Urgență pentru Copii „Louis Țurcanu”',
  'Spitalul Clinic de Boli Infecțioase și Pneumoftiziologie „Victor Babeș”',
  'Cabinet / clinică privată',
];

// Codul de parafă: litere și cifre, 5–8 caractere (verificare de format, nu de existență).
export const PARAFA_RE = /^[A-Z0-9]{5,8}$/;
