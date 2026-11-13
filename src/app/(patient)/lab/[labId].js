import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { getLab } from '../../../lib/labs';
import TopBar from '../../../components/TopBar';
import { LabDetail } from '../../../components/LabViews';
import { EmptyState } from '../../../components/ui';
import { colors, spacing } from '../../../constants/theme';

export default function PatientLabDetail() {
  const { labId } = useLocalSearchParams();
  const { user } = useAuth();
  const [lab, setLab] = useState(undefined);

  useEffect(() => {
    getLab(user.uid, labId).then(setLab).catch(() => setLab(null));
  }, [user.uid, labId]);

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="Analize" fallback="/labs" />
      <ScrollView contentContainerStyle={styles.container}>
        {lab === undefined && <ActivityIndicator color={colors.primary} />}
        {lab === null && <EmptyState icon="document-outline" title="Buletinul nu a fost găsit" />}
        {lab && <LabDetail lab={lab} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.sm, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
