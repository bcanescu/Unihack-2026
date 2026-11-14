// Denumiri canonice pentru parametrii de laborator: același test apare diferit la laboratoare diferite
// („Glucoză serică”, „GLU”, „Glicemie”) – îi aducem la același nume ca să putem face grafice de evoluție.
import { LAB_PANELS } from './labs';

const strip = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Nume canonice (din panourile predefinite) + referințe orientative.
export const CANONICAL_TESTS = LAB_PANELS.flatMap((p) => p.tests);
export const CANONICAL_NAMES = CANONICAL_TESTS.map((t) => t.name);

// sinonim (fără diacritice) → nume canonic
const ALIASES = {
  'glicemie': 'Glicemie a jeun',
  'glicemie a jeun': 'Glicemie a jeun',
  'glucoza': 'Glicemie a jeun',
  'glucoza serica': 'Glicemie a jeun',
  'glucoza a jeun': 'Glicemie a jeun',
  'glu': 'Glicemie a jeun',
  'hba1c': 'HbA1c',
  'hemoglobina glicata': 'HbA1c',
  'hemoglobina glicozilata': 'HbA1c',
  'colesterol': 'Colesterol total',
  'colesterol total': 'Colesterol total',
  'colesterol seric total': 'Colesterol total',
  'ldl': 'LDL colesterol',
  'ldl colesterol': 'LDL colesterol',
  'colesterol ldl': 'LDL colesterol',
  'ldl c': 'LDL colesterol',
  'hdl': 'HDL colesterol',
  'hdl colesterol': 'HDL colesterol',
  'colesterol hdl': 'HDL colesterol',
  'hdl c': 'HDL colesterol',
  'trigliceride': 'Trigliceride',
  'trigliceride serice': 'Trigliceride',
  'tg': 'Trigliceride',
  'hemoglobina': 'Hemoglobină',
  'hgb': 'Hemoglobină',
  'hb': 'Hemoglobină',
  'hematocrit': 'Hematocrit',
  'hct': 'Hematocrit',
  'leucocite': 'Leucocite',
  'wbc': 'Leucocite',
  'numar leucocite': 'Leucocite',
  'trombocite': 'Trombocite',
  'plt': 'Trombocite',
  'numar trombocite': 'Trombocite',
  'creatinina': 'Creatinină',
  'creatinina serica': 'Creatinină',
  'uree': 'Uree',
  'uree serica': 'Uree',
  'alt': 'ALT (TGP)',
  'tgp': 'ALT (TGP)',
  'alt tgp': 'ALT (TGP)',
  'alanin aminotransferaza': 'ALT (TGP)',
  'ast': 'AST (TGO)',
  'tgo': 'AST (TGO)',
  'ast tgo': 'AST (TGO)',
  'aspartat aminotransferaza': 'AST (TGO)',
};

/** Numele canonic al unui parametru (sau numele original, curățat, dacă nu-l recunoaștem). */
export function canonicalName(name) {
  const key = strip(name);
  if (ALIASES[key]) return ALIASES[key];
  const direct = CANONICAL_NAMES.find((n) => strip(n) === key);
  return direct ?? String(name ?? '').trim();
}

/** Referința orientativă pentru un parametru canonic (dacă buletinul nu o are). */
export function defaultRange(name) {
  const t = CANONICAL_TESTS.find((x) => x.name === name);
  return t ? { unit: t.unit, min: t.min, max: t.max } : null;
}
