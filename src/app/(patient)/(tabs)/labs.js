import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { subscribeLabs } from '../../../lib/labs';
import { LabListItem } from '../../../components/LabViews';
import { EmptyState } from '../../../components/ui';
import { colors, spacing, font } from '../../../constants/theme';

export default function PatientLabs() {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);

  useEffect(() => subscribeLabs(user.uid, setLabs), [user.uid]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>Analizele mele</Text>
          <Text style={styles.subtitle}>Rezultatele adăugate de medicii tăi.</Text>
        </View>
        {labs.length === 0 ? (
          <EmptyState
            icon="flask-outline"
            title="Nicio analiză încă"
            text="Când medicul îți adaugă rezultatele, le vei vedea aici, cu valorile din afara limitelor evidențiate."
          />
        ) : (
          labs.map((l) => <LabListItem key={l.id} lab={l} onPress={() => router.push(`/lab/${l.id}`)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted },
});
