// Grafic de evoluție pentru un parametru de laborator (react-native-svg – merge în Expo Go și pe web).
import { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { G, Rect, Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { colors, font } from '../constants/theme';

const H = 220;
const PAD = { top: 22, right: 18, bottom: 34, left: 40 };

const monthLabel = (key) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' }).replace('.', '');

// Pe web, textul SVG are implicit font serif – folosim fontul sistemului.
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined;

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * points: [{ date: 'AAAA-LL-ZZ', value, labName }] sortate după dată
 * min / max: limitele de referință (pot fi null)
 */
export default function TrendChart({ points, min, max, unit }) {
  const [width, setWidth] = useState(0);

  const values = points.map((p) => p.value);
  const refs = [min, max].filter((v) => v != null);
  let lo = Math.min(...values, ...refs);
  let hi = Math.max(...values, ...refs);
  const span = hi - lo || Math.abs(hi) || 1;
  lo -= span * 0.15;
  hi += span * 0.15;
  if (lo < 0 && Math.min(...values) >= 0) lo = 0;

  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = H - PAD.top - PAD.bottom;
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const x = (d) => PAD.left + (t1 === t0 ? innerW / 2 : ((new Date(d).getTime() - t0) / (t1 - t0)) * innerW);
  const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;

  const bandTop = y(max != null ? Math.min(max, hi) : hi);
  const bandBottom = y(min != null ? Math.max(min, lo) : lo);
  const outOf = (v) => (min != null && v < min) || (max != null && v > max);

  const ticks = [lo + (hi - lo) * 0.1, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.9];

  // Etichetele de dată: le sărim pe cele prea apropiate (sub 44 px), ca să nu se suprapună. Ultima rămâne mereu.
  const showLabel = points.map(() => true);
  let lastX = -Infinity;
  points.forEach((p, i) => {
    const px = x(p.date);
    if (px - lastX < 44) showLabel[i] = false;
    else lastX = px;
  });
  const lastIdx = points.length - 1;
  if (!showLabel[lastIdx]) {
    showLabel[lastIdx] = true;
    for (let i = lastIdx - 1; i >= 0 && x(points[lastIdx].date) - x(points[i].date) < 44; i--) showLabel[i] = false;
  }

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={`Grafic: ${points.map((p) => `${p.date} ${p.value} ${unit}`).join(', ')}`}>
      {width > 0 && (
        <Svg width={width} height={H}>
          {/* Zona de referință (normal) */}
          {(min != null || max != null) && (
            <Rect x={PAD.left} y={bandTop} width={innerW} height={Math.max(bandBottom - bandTop, 0)} fill={colors.successSoft} />
          )}
          {max != null && max < hi && (
            <Line x1={PAD.left} x2={PAD.left + innerW} y1={y(max)} y2={y(max)} stroke={colors.success} strokeDasharray="4 4" strokeWidth={1} />
          )}
          {min != null && min > lo && (
            <Line x1={PAD.left} x2={PAD.left + innerW} y1={y(min)} y2={y(min)} stroke={colors.success} strokeDasharray="4 4" strokeWidth={1} />
          )}

          {/* Axa Y */}
          {ticks.map((t) => (
            <SvgText key={t} fontFamily={FONT} x={PAD.left - 6} y={y(t) + 4} fontSize={10} fill="#94A3B8" textAnchor="end">
              {Math.round(t)}
            </SvgText>
          ))}

          {/* Linia */}
          <Polyline
            points={points.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />

          {/* Punctele + valorile */}
          {points.map((p, i) => {
            const bad = outOf(p.value);
            return (
              <G key={`${p.date}-${i}`}>
                <Circle cx={x(p.date)} cy={y(p.value)} r={6} fill={bad ? colors.error : colors.success} stroke="#fff" strokeWidth={2} />
                <SvgText fontFamily={FONT} x={x(p.date)} y={y(p.value) - 11} fontSize={12} fontWeight="700" fill={bad ? colors.error : colors.text} textAnchor="middle">
                  {fmt(p.value)}
                </SvgText>
                {showLabel[i] && (
                  <SvgText fontFamily={FONT} x={x(p.date)} y={H - 12} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                    {monthLabel(p.date)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      )}
      <View style={styles.legend}>
        <View style={[styles.swatch, { backgroundColor: colors.successSoft, borderColor: colors.success }]} />
        <Text style={styles.legendText}>
          Interval de referință{min != null && max != null ? ` ${min}–${max}` : max != null ? ` < ${max}` : min != null ? ` > ${min}` : ''} {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  swatch: { width: 14, height: 10, borderRadius: 2, borderWidth: 1 },
  legendText: { fontSize: font.small - 2, color: colors.textMuted },
});
