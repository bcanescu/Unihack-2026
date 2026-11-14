// Micșorează pozele înainte de a le trimite la Gemini: o poză de telefon (3–8 MB) devine ~300–600 KB,
// iar textul buletinului rămâne lizibil. Cereri mai mici = mai rapide și fără erori de dimensiune / timp expirat.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 2000; // pixeli pe latura lungă – suficient pentru textul unui buletin A4
const QUALITY = 0.75;

/** asset = rezultatul din expo-image-picker. Returnează { base64, mimeType, sizeKB }. */
export async function prepareImage(asset) {
  try {
    const w = asset.width || 0;
    const h = asset.height || 0;
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (Math.max(w, h) > MAX_SIDE || !w || !h) {
      // Redimensionăm după latura lungă; dacă nu știm dimensiunile, limităm lățimea.
      if (h > w) ctx.resize({ height: MAX_SIDE });
      else ctx.resize({ width: Math.min(MAX_SIDE, w || MAX_SIDE) });
    }
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG, base64: true });
    if (!out.base64) throw new Error('fără base64');
    return { base64: out.base64, mimeType: 'image/jpeg', sizeKB: Math.round((out.base64.length * 3) / 4 / 1024) };
  } catch (e) {
    // Rezervă: folosim poza originală, dacă picker-ul a furnizat-o în base64.
    if (asset.base64) {
      return { base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg', sizeKB: Math.round((asset.base64.length * 3) / 4 / 1024) };
    }
    throw e;
  }
}
