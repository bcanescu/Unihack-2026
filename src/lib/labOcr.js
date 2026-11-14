/**
 * Citirea unui buletin de analize din una sau mai multe poze, cu Gemini (multimodal) prin Firebase AI Logic.
 * Pozele NU se salvează – se trimit doar pentru extragerea valorilor; pacientul le verifică înainte de salvare.
 */
import { getGenerativeModel } from 'firebase/ai';
import { isFirebaseConfigured } from './firebase';
import { getMedlyAI, MODEL } from './ai';
import { CANONICAL_NAMES, canonicalName, defaultRange } from './labTests';

// Pentru citirea buletinelor (text mic, tabele dense) e bine un model mai puternic decât cel al chatului.
// Setează EXPO_PUBLIC_GEMINI_OCR_MODEL în .env cu un model „Flash” (nu „Lite”) din consola AI Logic.
export const OCR_MODEL = process.env.EXPO_PUBLIC_GEMINI_OCR_MODEL || MODEL;

export const MAX_RESULTS = 100;

const PROMPT = `Ești un sistem de extragere de date din fotografii ale buletinelor de analize medicale din România.
Imaginile primite sunt paginile ACELUIAȘI buletin (pot fi una sau mai multe).

SARCINA: extrage ABSOLUT TOATE analizele / parametrii care au un rezultat, din TOATE paginile și din TOATE secțiunile
(hematologie, biochimie, imunologie, hormoni, coagulare, examen de urină, markeri, vitamine, minerale etc.).
Nu te opri după primele rânduri și nu sări peste secțiuni. Un buletin obișnuit are între 10 și 60 de rezultate.
Include și componentele hemoleucogramei (ex. Neutrofile %, Neutrofile #, Limfocite, Monocite, Eozinofile, Bazofile,
MCV, MCH, MCHC, RDW, MPV) și fiecare parametru al examenului de urină.

Returnează DOAR JSON valid, fără alt text:
{"labName": string|null, "date": "AAAA-LL-ZZ"|null,
 "results": [{"name": string, "value": number|null, "text": string|null, "unit": string, "min": number|null, "max": number|null}]}

Reguli pentru fiecare rezultat:
- Rezultat numeric → "value" = număr (punct zecimal, fără semne „<” sau „>”), "text" = null.
- Rezultat nenumeric (ex. „Negativ”, „Absent”, „Normal”, „Rare”, „Pozitiv”) → "value" = null, "text" = textul.
- "unit" = unitatea de măsură exact ca în buletin (sau "" dacă lipsește).
- Interval de referință: „70 - 100” → min 70, max 100; „< 200” → min null, max 200; „> 40” → min 40, max null;
  fără interval sau interval text → ambele null.
- "name": dacă analiza este una dintre următoarele, folosește EXACT această denumire: ${CANONICAL_NAMES.join(', ')}.
  Pentru TOATE celelalte analize păstrează denumirea din buletin (în română, fără prescurtări inutile).
  Lista de mai sus NU limitează ce extragi.
- "date" = data recoltării (sau data buletinului), format AAAA-LL-ZZ. "labName" = laboratorul / clinica.
- Ignoră doar: antetul, datele personale (nume, CNP, adresă, telefon), semnăturile, comentariile generale.
- Nu inventa valori. Dacă o valoare e ilizibilă, omite rândul.
- Dacă imaginile nu sunt buletine de analize, returnează {"labName": null, "date": null, "results": []}.`;

let model = null;

function getModel() {
  if (!model) {
    model = getGenerativeModel(
      getMedlyAI(),
      {
        model: OCR_MODEL,
        generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 16384 },
      },
      { timeout: 90000 } // 90 s pe pagină – peste asta afișăm „a durat prea mult”, nu „fără internet”
    );
  }
  return model;
}

const num = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(',', '.').replace(/[<>≤≥\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Curăță și normalizează răspunsul modelului. */
export function normalizeExtraction(raw) {
  const results = (Array.isArray(raw?.results) ? raw.results : [])
    .map((r) => {
      const name = canonicalName(r?.name);
      const fallback = defaultRange(name);
      // „<0.01” sau „>90” nu sunt valori exacte – le păstrăm ca text, ca să nu le schimbăm sensul.
      const isBound = typeof r?.value === 'string' && /[<>≤≥]/.test(r.value);
      const value = isBound ? null : num(r?.value);
      const text = value == null ? String(isBound ? r.value : r?.text ?? r?.value ?? '').trim() : '';
      let min = num(r?.min);
      let max = num(r?.max);
      if (value != null && min == null && max == null && fallback) {
        min = fallback.min;
        max = fallback.max;
      }
      return { name, value, text: text || null, unit: String(r?.unit ?? fallback?.unit ?? '').trim(), min, max };
    })
    .filter((r) => r.name && (r.value != null || r.text))
    .slice(0, MAX_RESULTS);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw?.date ?? '') ? raw.date : null;
  return { labName: String(raw?.labName ?? '').trim(), date, results };
}

/** Unește rezultatele mai multor extrageri (ex. pagina 2 adăugată ulterior). Nu dublează analizele. */
export function mergeExtractions(a, b) {
  const seen = new Set(a.results.map((r) => r.name.toLowerCase()));
  return {
    labName: a.labName || b.labName,
    date: a.date || b.date,
    results: [...a.results, ...b.results.filter((r) => !seen.has(r.name.toLowerCase()))].slice(0, MAX_RESULTS),
  };
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Răspuns tăiat (prea lung): păstrăm rezultatele complete până la ultima acoladă închisă.
    const cut = cleaned.lastIndexOf('}');
    const start = cleaned.indexOf('"results"');
    if (start === -1 || cut === -1) throw { code: 'parse' };
    try {
      return JSON.parse(`${cleaned.slice(0, cut + 1)}]}`);
    } catch {
      throw { code: 'parse' };
    }
  }
}

/** images = [{ base64, mimeType }] – paginile aceluiași buletin. */
export async function extractLabFromImages(images, onProgress) {
  if (!isFirebaseConfigured) {
    for (let i = 0; i < images.length; i++) {
      onProgress?.(i + 1, images.length);
      await new Promise((r) => setTimeout(r, 500));
    }
    return normalizeExtraction({
      labName: 'Laborator Central Timișoara (demo)',
      date: '2025-03-12',
      results: [
        { name: 'Glucoză serică', value: 106, unit: 'mg/dL', min: 70, max: 100 },
        { name: 'Hemoglobina glicată', value: '5,8', unit: '%', min: 4, max: 5.6 },
        { name: 'Colesterol seric total', value: 226, unit: 'mg/dL', min: null, max: 200 },
        { name: 'LDL', value: 145, unit: 'mg/dL', min: null, max: 100 },
        { name: 'HDL', value: 48, unit: 'mg/dL', min: 40, max: null },
        { name: 'Trigliceride serice', value: 162, unit: 'mg/dL', min: null, max: 150 },
        { name: 'Hemoglobina', value: 14.2, unit: 'g/dL', min: 13, max: 17 },
        { name: 'Leucocite', value: 6.8, unit: '10³/µL', min: 4, max: 10 },
        { name: 'Neutrofile %', value: 58.1, unit: '%', min: 40, max: 75 },
        { name: 'Limfocite %', value: 31.4, unit: '%', min: 20, max: 45 },
        { name: 'MCV', value: 88, unit: 'fL', min: 80, max: 97 },
        { name: 'Trombocite', value: 245, unit: '10³/µL', min: 150, max: 400 },
        { name: 'TSH', value: 2.1, unit: 'µUI/mL', min: 0.4, max: 4 },
        { name: 'Vitamina D (25-OH)', value: 18, unit: 'ng/mL', min: 30, max: 100 },
        { name: 'Feritină', value: 64, unit: 'ng/mL', min: 22, max: 322 },
        { name: 'Proteine urinare', value: null, text: 'Negativ', unit: '', min: null, max: null },
        { name: 'Glucoză urinară', value: null, text: 'Normal', unit: '', min: null, max: null },
      ],
    });
  }

  // O cerere pe pagină: cereri mici și rapide; dacă o pagină eșuează, păstrăm rezultatele celorlalte.
  let merged = { labName: '', date: null, results: [] };
  let lastError = null;
  for (let i = 0; i < images.length; i++) {
    onProgress?.(i + 1, images.length);
    try {
      const img = images[i];
      const result = await getModel().generateContent([PROMPT, { inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.base64 } }]);
      merged = mergeExtractions(merged, normalizeExtraction(parseJson(result.response.text())));
    } catch (e) {
      console.warn(`[ocr] pagina ${i + 1}:`, e?.code, e?.message);
      lastError = e;
    }
  }
  if (merged.results.length === 0 && lastError) throw lastError;
  return { ...merged, failedPages: lastError ? 1 : 0 };
}

/** Compatibilitate: o singură poză. */
export const extractLabFromImage = (base64, mimeType) => extractLabFromImages([{ base64, mimeType }]);

/** Mesaj de eroare clar pentru citirea buletinelor (cauza reală, nu doar „fără internet”). */
export function ocrErrorMessage(e) {
  const code = e?.code ?? '';
  const msg = String(e?.message ?? '').toLowerCase();
  if (code === 'parse') return 'Nu am putut interpreta buletinul. Încearcă o poză mai clară sau introdu manual.';
  if (msg.includes('413') || msg.includes('too large') || msg.includes('payload') || msg.includes('exceeds'))
    return 'Poza este prea mare. Încearcă din nou (o pagină pe rând).';
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline') || msg.includes('504') || msg.includes('abort'))
    return 'Citirea a durat prea mult. Încearcă o singură pagină odată sau un model mai rapid (EXPO_PUBLIC_GEMINI_OCR_MODEL).';
  if (msg.includes('app check') || msg.includes('appcheck') || msg.includes('app-check') || msg.includes('attestation'))
    return 'Cererea a fost blocată de App Check. Verifică tokenul de debug din .env și din consolă.';
  if (msg.includes('not found') || msg.includes('404'))
    return `Modelul „${OCR_MODEL}” nu este disponibil. Alege alt model în consola AI Logic.`;
  if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted'))
    return 'Prea multe cereri într-un timp scurt (limita gratuită). Încearcă din nou peste un minut.';
  if (msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('network error'))
    return 'Nu există conexiune la internet.';
  const detail = String(e?.message ?? '').slice(0, 140);
  return `Citirea nu a reușit${code ? ` (${code})` : ''}.${detail ? ` Detalii: ${detail}` : ''}`;
}
