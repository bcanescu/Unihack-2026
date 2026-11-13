import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Placeholder pentru logo-ul din Figma. Înlocuiește cu imaginea exportată
// (ex. <Image source={require('../../assets/logo.png')} />) când o ai.
export default function Logo() {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Medly">
      <View style={styles.mark}>
        <Ionicons name="medkit" size={28} color="#fff" />
      </View>
      <Text style={styles.word}>
        Med<Text style={{ color: colors.accent }}>ly</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: { fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
});
