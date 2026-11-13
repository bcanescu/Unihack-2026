// Culorile din Figma, ajustate pentru contrast (WCAG AA):
// turcoazul deschis rămâne pentru accente, cel închis pentru text și butoane.
export const colors = {
  primary: '#0F766E',      // butoane, linkuri (contrast bun cu alb)
  primaryPressed: '#0B5E58',
  accent: '#14C8B4',       // turcoazul din Figma – logo, accente
  accentSoft: '#E6FAF7',   // fundaluri deschise
  text: '#0F172A',
  textMuted: '#475569',
  border: '#CBD5E1',
  inputBg: '#F8FAFC',
  background: '#FFFFFF',
  error: '#B91C1C',
  errorSoft: '#FEF2F2',
  warning: '#92400E',
  warningSoft: '#FEF3C7',
  success: '#166534',
  successSoft: '#DCFCE7',
  surface: '#F1F5F9',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { md: 12, lg: 16, pill: 999 };

export const font = {
  body: 16,     // minimum 16 pentru lizibilitate
  small: 14,
  title: 26,
};
