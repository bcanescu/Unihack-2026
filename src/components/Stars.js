import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../constants/theme';

const GOLD = '#F59E0B';

/** Stele afișate (acceptă jumătăți, ex. 4.5). */
export function Stars({ value = 0, size = 16 }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${value.toFixed(1)} din 5 stele`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={GOLD}
        />
      ))}
    </View>
  );
}

/** Stele + medie + număr de recenzii, compact (pentru liste). */
export function RatingInline({ avg, count, size = 14 }) {
  if (!count) return <Text style={styles.none}>Fără recenzii încă</Text>;
  return (
    <View style={[styles.row, { gap: 6 }]}>
      <Stars value={avg} size={size} />
      <Text style={styles.inline}>
        {avg.toFixed(1)} <Text style={styles.count}>({count})</Text>
      </Text>
    </View>
  );
}

const LABELS = ['', 'Foarte slab', 'Slab', 'Acceptabil', 'Bun', 'Excelent'];

/** Selector de stele 1–5, mare, ușor de atins. */
export function StarPicker({ value, onChange }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={[styles.row, { gap: 8 }]} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === i }}
            accessibilityLabel={`${i} ${i === 1 ? 'stea' : 'stele'}`}
          >
            <Ionicons name={value >= i ? 'star' : 'star-outline'} size={44} color={GOLD} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.pickLabel}>{value ? LABELS[value] : 'Atinge o stea'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  inline: { fontSize: font.small, fontWeight: '800', color: colors.text },
  count: { fontWeight: '500', color: colors.textMuted },
  none: { fontSize: font.small - 1, color: colors.textMuted },
  pickLabel: { fontSize: font.body, fontWeight: '700', color: colors.text },
});
