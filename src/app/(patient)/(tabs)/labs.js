import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { subscribeLabs, addSampleHistory } from '../../../lib/labs';
import { LabListItem } from '../../../components/LabViews';
import LabTrends from '../../../components/LabTrends';
import PrimaryButton from '../../../components/PrimaryButton';
import { EmptyState, SectionTitle } from '../../../components/ui';
import { colors, spacing, font } from '../../../constants/theme';

export default function PatientLabs() {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => subscribeLabs(user.uid, setLabs), [user.uid]);

  async function seed() {
    setSeeding(true);
    try {
      await addSampleHistory(user);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>Analizele mele</Text>
          <Text style={styles.subtitle}>De la medicii tăi și de la orice laborator – tot istoricul într-un loc.</Text>
        </View>

        <PrimaryButton title="📷  Adaugă analize" onPress={() => router.push('/add-lab-photo')} />

        <LabTrends labs={labs} title="Evoluția analizelor" />

        {labs.length === 0 ? (
          <>
            <EmptyState
              icon="flask-outline"
              title="Nicio analiză încă"
              text="Fotografiază buletinele vechi de la orice laborator și îți arătăm evoluția valorilor în timp."
            />
            <Pressable onPress={seed} disabled={seeding} style={styles.sample} accessibilityRole="button">
              <Text style={styles.sampleText}>{seeding ? 'Se adaugă…' : 'Vezi cum arată: adaugă un istoric de exemplu'}</Text>
            </Pressable>
          </>
        ) : (
          <View style={{ gap: spacing.sm + 4 }}>
            <SectionTitle count={labs.length}>Toate buletinele</SectionTitle>
            {labs.map((l) => (
              <LabListItem key={l.id} lab={l} onPress={() => router.push(`/lab/${l.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md + 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body - 1, color: colors.textMuted, lineHeight: 21 },
  sample: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  sampleText: { color: colors.primary, fontWeight: '700', fontSize: font.small + 1 },
});
