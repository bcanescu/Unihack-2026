// „Evoluție”: grafice pe parametru, din toate buletinele (indiferent de laborator).
import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canonicalName, defaultRange } from '../lib/labTests';
import TrendChart from './TrendChart';
import Chip from './Chip';
import { Card } from './ui';
import { colors, spacing, font } from '../constants/theme';

const PRIORITY = ['Glicemie a jeun', 'HbA1c', 'LDL colesterol', 'Colesterol total', 'HDL colesterol', 'Trigliceride', 'Hemoglobină', 'Creatinină'];

const fmtDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

/** { [nume canonic]: { points: [{date, value, labName}], min, max, unit } } – doar parametrii cu ≥ 2 valori */
export function buildSeries(labs) {
  const map = {};
  labs.forEach((lab) =>
    lab.results.forEach((r) => {
      if (r.value == null || Number.isNaN(r.value)) return;
      const name = canonicalName(r.name);
      const s = (map[name] = map[name] || { points: [], min: null, max: null, unit: r.unit });
      s.points.push({ date: lab.date, value: r.value, labName: lab.labName });
      // Referința: cea mai recentă disponibilă (laboratoarele pot avea intervale ușor diferite).
      if (r.min != null) s.min = r.min;
      if (r.max != null) s.max = r.max;
      if (!s.unit && r.unit) s.unit = r.unit;
    })
  );
  Object.entries(map).forEach(([name, s]) => {
    s.points.sort((a, b) => a.date.localeCompare(b.date));
    // o singură valoare pe zi
    s.points = s.points.filter((p, i, arr) => i === arr.length - 1 || arr[i + 1].date !== p.date);
    if (s.min == null && s.max == null) {
      const d = defaultRange(name);
      if (d) Object.assign(s, { min: d.min, max: d.max });
    }
    if (s.points.length < 2) delete map[name];
  });
  return map;
}

export default function LabTrends({ labs, title = 'Evoluție' }) {
  const series = useMemo(() => buildSeries(labs), [labs]);
  const names = useMemo(
    () =>
      Object.keys(series).sort((a, b) => {
        const ia = PRIORITY.indexOf(a);
        const ib = PRIORITY.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'ro');
      }),
    [series]
  );
  const [selected, setSelected] = useState(null);
  const name = selected && series[selected] ? selected : names[0];

  if (!name) return null;
  const s = series[name];
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const diff = last.value - first.value;
  const labsCount = new Set(s.points.map((p) => p.labName).filter(Boolean)).size;
  const lastOut = (s.min != null && last.value < s.min) || (s.max != null && last.value > s.max);
  const diffText = `${diff > 0 ? '+' : ''}${Number.isInteger(diff) ? diff : diff.toFixed(1)} ${s.unit}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="trending-up" size={20} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {names.map((n) => (
          <Chip key={n} label={n} selected={n === name} onPress={() => setSelected(n)} />
        ))}
      </ScrollView>
      <Card>
        <TrendChart points={s.points} min={s.min} max={s.max} unit={s.unit} />
        <View style={styles.summary}>
          <Text style={styles.summaryMain}>
            Ultima valoare:{' '}
            <Text style={{ color: lastOut ? colors.error : colors.success, fontWeight: '800' }}>
              {last.value} {s.unit}
            </Text>{' '}
            ({fmtDate(last.date)})
          </Text>
          <Text style={styles.summarySub}>
            {diffText} față de {fmtDate(first.date)} · {s.points.length} măsurători
            {labsCount > 1 ? ` din ${labsCount} laboratoare` : ''}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: font.body + 2, fontWeight: '800', color: colors.text },
  summary: { gap: 2 },
  summaryMain: { fontSize: font.small + 1, color: colors.text },
  summarySub: { fontSize: font.small - 1, color: colors.textMuted },
});
