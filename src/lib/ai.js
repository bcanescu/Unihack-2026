// Instanța comună Firebase AI Logic (Gemini Developer API), folosită de asistent și de citirea analizelor.
import { getApp } from 'firebase/app';
import { getAI, GoogleAIBackend } from 'firebase/ai';

// Numele modelelor se schimbă des – verifică lista actuală în consola AI Logic și schimbă doar aici (sau în .env).
export const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';

let ai = null;

export function getMedlyAI() {
  if (!ai) {
    // Tokenuri App Check de unică folosință (cerute de protecția anti-replay a AI Logic).
    ai = getAI(getApp(), { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
  }
  return ai;
}
