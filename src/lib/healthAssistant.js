/**
 * Asistentul Medly – chatbot de informare despre sănătate, cu Gemini prin Firebase AI Logic.
 *
 * Cheia Gemini NU este în aplicație: apelurile trec prin proiectul Firebase (AI Logic → Gemini Developer API).
 * Configurare: consola Firebase → AI Services → AI Logic → Get started → Gemini Developer API.
 */
import { getApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { isFirebaseConfigured } from './firebase';
import { flagOf, rangeText, formatLabDate } from './labs';

// Numele modelelor se schimbă des – verifică lista actuală în consola AI Logic și schimbă doar aici.
export const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';

export const MAX_INPUT = 1000;
const MAX_TURNS = 12; // istoric scurt: răspunsuri mai rapide și cotă gratuită consumată mai încet

const SYSTEM = `Ești „Asistentul Medly”, un asistent de informare despre sănătate dintr-o aplicație medicală din România.
Răspunzi în limba română, cu diacritice, clar și pe scurt (maximum 150 de cuvinte), pe înțelesul unui pacient în vârstă.

Reguli obligatorii:
- Oferi doar informații generale. NU pui diagnostice și NU spui ce boală are cineva.
- NU recomanzi doze și NU spui cuiva să înceapă, să oprească sau să modifice un medicament – trimiți la medic sau farmacist.
- Încheie răspunsurile despre o situație personală recomandând discuția cu medicul.
- Dacă mesajul descrie o posibilă urgență (durere în piept, dificultăți de respirație, semne de AVC, leșin,
  sângerare puternică, reacție alergică severă, intoxicație, gânduri de a-și face rău), începe răspunsul cu:
  „Sună imediat la 112.” și abia apoi oferă alte informații, foarte pe scurt.
- Răspunzi doar la întrebări despre sănătate, stil de viață sănătos și folosirea aplicației Medly.
  La alte subiecte refuzi politicos și spui ce poți face.
- Nu ceri și nu repeți date personale (CNP, adresă, telefon, nume complet).
- Despre aplicația Medly: pacientul își vede tratamentul în „Acasă → Ce iau azi”, analizele în tabul „Analize”,
  își face programări în tabul „Programări” și poate retrage accesul unui medic din „Medicii mei”.
- Nu folosi tabele. Poți folosi liste scurte cu „•”.`;

// ── Detectarea urgențelor (în aplicație, înainte de model) ─────────────────────
const strip = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const EMERGENCY_PATTERNS = [
  /durer\w* (in|la) piept/,
  /(ma )?doare (in )?piept/,
  /nu (mai )?pot (sa )?respir/,
  /respir (foarte )?greu/,
  /ma sufoc/,
  /lesin/,
  /\bavc\b|accident vascular/,
  /nu (mai )?pot (sa )?vorbesc|nu pot vorbi/,
  /gura stramba|fata stramba|paraliz/,
  /sanger\w* (mult|puternic|abundent)|nu se opreste sangerarea/,
  /convulsi/,
  /supradoz|m-am otravit|intoxica/,
  /inconstient|nu raspunde/,
  /vreau sa mor|sa ma omor|sinucid|sa-mi fac rau|sa imi fac rau|imi fac rau/,
  /umflat\w* (la )?(gat|limba|buze)|nu pot inghiti/,
];

/** true dacă mesajul pare să descrie o urgență medicală. */
export function detectEmergency(text) {
  const t = strip(text);
  return EMERGENCY_PATTERNS.some((re) => re.test(t));
}

// ── Sesiunea de chat ──────────────────────────────────────────────────────────
let model = null;

function getModel() {
  if (!model) {
    const ai = getAI(getApp(), { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, { model: MODEL, systemInstruction: SYSTEM });
  }
  return model;
}

/**
 * Trimite un mesaj. `history` = mesajele anterioare [{ role: 'user'|'assistant', text }].
 * Folosim răspunsul complet (nu streaming), pentru compatibilitate cu React Native.
 */
export async function askAssistant(history, text) {
  const question = text.trim().slice(0, MAX_INPUT);

  if (!isFirebaseConfigured) {
    await new Promise((r) => setTimeout(r, 600));
    return demoAnswer(question);
  }

  const chat = getModel().startChat({
    history: history.slice(-MAX_TURNS).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
  });
  const result = await chat.sendMessage(question);
  const answer = result.response.text().trim();
  if (!answer) throw { code: 'empty' };
  return answer;
}

/** Mesajul trimis când pacientul cere explicarea unui buletin (doar valorile, fără nume sau CNP). */
export function labExplainPrompt(lab) {
  const lines = lab.results.map((r) => {
    const f = flagOf(r);
    const flag = f === 'high' ? 'crescut' : f === 'low' ? 'scăzut' : 'în limite';
    return `• ${r.name}: ${r.value} ${r.unit} (referință ${rangeText(r)}) – ${flag}`;
  });
  return (
    `Explică-mi pe înțeles rezultatele analizelor „${lab.title}” din ${formatLabDate(lab.date)}:\n` +
    `${lines.join('\n')}\n\n` +
    'Pentru valorile din afara limitelor spune ce înseamnă în general și ce întrebări să-i pun medicului. ' +
    'Nu pune diagnostic.'
  );
}

/** Mesaj de eroare pe înțeles, în română. */
export function assistantErrorMessage(e) {
  const code = e?.code ?? '';
  const msg = String(e?.message ?? '').toLowerCase();
  if (code === 'api-not-enabled' || msg.includes('not been used') || msg.includes('disabled'))
    return 'Asistentul nu este activat. Activează Firebase AI Logic (Gemini Developer API) în consola Firebase.';
  if (msg.includes('app check') || msg.includes('appcheck'))
    return 'Cererea a fost blocată de App Check. Pentru testare, dezactivează aplicarea App Check pentru AI Logic.';
  if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted'))
    return 'Asistentul a primit prea multe întrebări într-un timp scurt. Încearcă din nou peste un minut.';
  if (msg.includes('not found') && msg.includes('model'))
    return `Modelul „${MODEL}” nu este disponibil. Alege alt model din consola AI Logic (EXPO_PUBLIC_GEMINI_MODEL).`;
  if (code === 'fetch-error' || msg.includes('network'))
    return 'Nu există conexiune la internet.';
  if (code === 'empty' || msg.includes('safety') || msg.includes('blocked'))
    return 'Asistentul nu poate răspunde la această întrebare. Te rog discută cu medicul tău.';
  return 'Asistentul nu a putut răspunde acum. Încearcă din nou.';
}

// ── Mod demo (fără Firebase): răspunsuri fixe, doar ca să se vadă interfața ──────
function demoAnswer(q) {
  const t = strip(q);
  if (detectEmergency(q)) {
    return 'Sună imediat la 112.\n\nDescrie dispeceratului ce simți și de când. Nu conduce singur la spital și nu rămâne singur până ajunge ajutorul.';
  }
  if (t.includes('analize') || t.includes('colesterol') || t.includes('ldl')) {
    return (
      'Colesterolul LDL („colesterolul rău”) crescut poate favoriza, în timp, depunerile în artere.\n\n' +
      '• De obicei se recomandă alimentație cu mai puține grăsimi saturate, mișcare regulată și renunțarea la fumat.\n' +
      '• Medicul decide dacă e nevoie de tratament, în funcție de riscul tău general.\n\n' +
      'Întrebări utile pentru medic: Care este ținta mea de LDL? Când repet analizele?\n\n' +
      '(Mod demo – răspuns fix. Cu Firebase configurat, răspunde Gemini.)'
    );
  }
  if (t.includes('antibiotic')) {
    return (
      '• Ia antibioticul exact la orele și pe durata stabilite de medic, chiar dacă te simți mai bine.\n' +
      '• Nu păstra resturi pentru altă dată și nu le da altcuiva.\n' +
      '• Dacă apar erupții, umflături sau diaree severă, anunță medicul.\n\n' +
      'Reminderele Medly te ajută să nu uiți nicio doză.\n\n(Mod demo – răspuns fix.)'
    );
  }
  return (
    'Sunt Asistentul Medly și pot oferi informații generale despre sănătate, analize și tratamente, ' +
    'dar nu înlocuiesc consultul medical.\n\n(Mod demo – fără Firebase răspunsurile sunt fixe. ' +
    'Configurează Firebase și AI Logic ca să răspundă Gemini.)'
  );
}
