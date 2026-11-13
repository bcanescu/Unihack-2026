import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import PrimaryButton from './PrimaryButton';
import { colors, spacing, font } from '../constants/theme';

// Ecran temporar folosit ca să verifici că redirecționarea pe rol funcționează.
export default function HomePlaceholder({ roleLabel, next }) {
  const { user, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.badge}>{roleLabel}</Text>
        <Text style={styles.title}>Bună ziua, {user?.name ?? user?.email}!</Text>
        <Text style={styles.text}>{next}</Text>
        <PrimaryButton title="Deconectare" variant="outline" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    color: colors.primary,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.textMuted, lineHeight: 22 },
});
