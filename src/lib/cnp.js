import * as Crypto from 'expo-crypto';

const WEIGHTS = '279146358279';

/**
 * Validează un CNP românesc: 13 cifre, dată de naștere validă și cifra de control.
 * Returnează { valid: true, birthDate: 'AAAA-LL-ZZ', sex: 'M'|'F' } sau { valid: false, error }.
 */
export function validateCnp(raw) {
  const cnp = String(raw ?? '').trim();

  if (!/^\d{13}$/.test(cnp)) {
    return { valid: false, error: 'CNP-ul trebuie să aibă exact 13 cifre.' };
  }

  const s = Number(cnp[0]);
  if (s === 0) return { valid: false, error: 'CNP invalid.' };

  const yy = Number(cnp.slice(1, 3));
  const mm = Number(cnp.slice(3, 5));
  const dd = Number(cnp.slice(5, 7));

  let century;
  if (s === 1 || s === 2) century = 1900;
  else if (s === 3 || s === 4) century = 1800;
  else if (s === 5 || s === 6) century = 2000;
  else {
    // 7, 8, 9 – rezidenți / cetățeni străini: deducem secolul după an
    const currentYY = new Date().getFullYear() % 100;
    century = yy <= currentYY ? 2000 : 1900;
  }
  const year = century + yy;

  const date = new Date(Date.UTC(year, mm - 1, dd));
  const dateOk =
    date.getUTCFullYear() === year && date.getUTCMonth() === mm - 1 && date.getUTCDate() === dd;
  if (!dateOk || date > new Date()) {
    return { valid: false, error: 'Data de naștere din CNP nu este validă.' };
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(cnp[i]) * Number(WEIGHTS[i]);
  let control = sum % 11;
  if (control === 10) control = 1;
  if (control !== Number(cnp[12])) {
    return { valid: false, error: 'CNP invalid – verifică cifrele.' };
  }

  const pad = (n) => String(n).padStart(2, '0');
  return {
    valid: true,
    birthDate: `${year}-${pad(mm)}-${pad(dd)}`,
    sex: s % 2 === 1 ? 'M' : 'F',
  };
}

/**
 * Hash-ul CNP-ului, folosit ca index de căutare. CNP-ul în clar nu se salvează nicăieri.
 *
 * ATENȚIE (suficient pentru hackathon, nu pentru producție): un SHA-256 calculat în aplicație
 * poate fi spart prin încercarea tuturor CNP-urilor posibile. În producție hash-ul se face
 * într-o Cloud Function, cu HMAC și o cheie secretă ținută doar pe server.
 */
export async function hashCnp(cnp) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `medly:v1:${cnp.trim()}`);
}
